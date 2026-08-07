import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { requireAuth, canAccessTeam } from "../middleware/auth.js";

const router = Router();

// ---------- Jugadores de un equipo (delegado con acceso) ----------
// GET /api/teams/:teamId/players
router.get("/teams/:teamId/players", requireAuth, async (req, res) => {
  const { teamId } = req.params;
  const can = await canAccessTeam(req.user!.id, teamId);
  if (!can) return res.status(403).json({ error: "No tenés acceso a este equipo" });

  const links = await prisma.playerTeam.findMany({
    where: { teamId },
    include: {
      player: {
        include: { payments: { orderBy: { month: "desc" }, take: 24 } },
      },
    },
    orderBy: { player: { lastName: "asc" } },
  });

  res.json(
    links.map((l) => ({
      id: l.player.id,
      lastName: l.player.lastName,
      firstName: l.player.firstName,
      document: l.player.document,
      birthDate: l.player.birthDate,
      hasInsurance: l.player.hasInsurance,
      status: l.player.status,
      role: l.role,
      position: l.position,
      jersey: l.jersey,
      payments: l.player.payments,
    }))
  );
});

// ---------- Crear jugador (y vincularlo al equipo) ----------
const createPlayerSchema = z.object({
  document: z.string().min(6),
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  birthDate: z.string().optional().nullable(),
  hasInsurance: z.boolean().optional(),
  role: z.string().optional(),
  position: z.string().optional().nullable(),
  jersey: z.number().int().optional().nullable(),
});

router.post("/teams/:teamId/players", requireAuth, async (req, res) => {
  const { teamId } = req.params;
  const can = await canAccessTeam(req.user!.id, teamId);
  if (!can) return res.status(403).json({ error: "No tenés acceso a este equipo" });

  const parsed = createPlayerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
  }
  const { document, lastName, firstName, birthDate, hasInsurance, role, position, jersey } = parsed.data;

  // upsert jugador por DNI (si ya existe en otro equipo, solo se vincula)
  let player = await prisma.player.findUnique({ where: { document } });
  if (!player) {
    player = await prisma.player.create({
      data: {
        document,
        lastName,
        firstName,
        birthDate: birthDate ? new Date(birthDate) : null,
        hasInsurance: hasInsurance ?? false,
      },
    });
  }
  await prisma.playerTeam.upsert({
    where: { playerId_teamId: { playerId: player.id, teamId } },
    update: { role: role ?? "JUGADOR", position, jersey },
    create: { playerId: player.id, teamId, role: role ?? "JUGADOR", position, jersey },
  });

  res.status(201).json(player);
});

// ---------- Editar jugador ----------
const updatePlayerSchema = z.object({
  lastName: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  birthDate: z.string().optional().nullable(),
  hasInsurance: z.boolean().optional(),
  status: z.string().optional(), // ACTIVO | DEUDA | INACTIVO
  notes: z.string().optional().nullable(),
  role: z.string().optional(),
  position: z.string().optional().nullable(),
  jersey: z.number().int().optional().nullable(),
});

// PATCH /api/players/:id
router.patch("/players/:id", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });

  // verificar acceso por cualquiera de sus vínculos
  const links = await prisma.playerTeam.findMany({ where: { playerId: player.id } });
  for (const l of links) {
    if (await canAccessTeam(req.user!.id, l.teamId)) break;
    if (l === links[links.length - 1]) return res.status(403).json({ error: "No tenés acceso a este jugador" });
  }

  const parsed = updatePlayerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  const { birthDate, role, position, jersey, ...rest } = parsed.data;
  const updated = await prisma.player.update({
    where: { id: player.id },
    data: {
      ...rest,
      birthDate: birthDate ? new Date(birthDate) : birthDate === null ? null : undefined,
    },
  });
  // rol/pos/número se guardan en el vínculo principal
  if (role || position || jersey !== undefined) {
    const first = links[0];
    if (first) {
      await prisma.playerTeam.update({
        where: { playerId_teamId: { playerId: player.id, teamId: first.teamId } },
        data: { role: role ?? undefined, position, jersey },
      });
    }
  }
  res.json(updated);
});

// ---------- Borrar jugador ----------
// DELETE /api/players/:id  (quita del vínculo; si no le queda equipo, borra)
router.delete("/players/:id", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  const links = await prisma.playerTeam.findMany({ where: { playerId: player.id } });
  for (const l of links) {
    if (!(await canAccessTeam(req.user!.id, l.teamId))) {
      return res.status(403).json({ error: "No tenés acceso a este jugador" });
    }
  }
  if (links.length === 1) {
    await prisma.player.delete({ where: { id: player.id } });
  } else {
    // está en varios equipos: solo desvincula del primero (cambio en el front usual)
    await prisma.playerTeam.delete({ where: { playerId_teamId: { playerId: player.id, teamId: links[0].teamId } } });
  }
  res.json({ ok: true });
});

// ------------------- Cuotas -------------------

// POST /api/players/:id/payments/:month
router.post("/players/:id/payments/:month", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  const links = await prisma.playerTeam.findMany({ where: { playerId: player.id } });
  for (const l of links) {
    if (!(await canAccessTeam(req.user!.id, l.teamId))) {
      return res.status(403).json({ error: "No tenés acceso a este jugador" });
    }
  }

  const { month } = req.params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: "Formato de mes inválido. Usá YYYY-MM" });
  }
  const paid = Boolean(req.body?.paid);
  const amount = typeof req.body?.amount === "number" ? req.body.amount : 0;

  const payment = await prisma.payment.upsert({
    where: { playerId_month: { playerId: player.id, month } },
    update: { paid, amount, paidAt: paid ? new Date() : null },
    create: { playerId: player.id, month, paid, amount, paidAt: paid ? new Date() : null },
  });
  res.json(payment);
});

// GET /api/players/:id/payments — historial
router.get("/players/:id/payments", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  const links = await prisma.playerTeam.findMany({ where: { playerId: player.id } });
  for (const l of links) {
    if (!(await canAccessTeam(req.user!.id, l.teamId))) {
      return res.status(403).json({ error: "No tenés acceso a este jugador" });
    }
  }
  const payments = await prisma.payment.findMany({
    where: { playerId: player.id },
    orderBy: { month: "desc" },
  });
  res.json(payments);
});

export default router;