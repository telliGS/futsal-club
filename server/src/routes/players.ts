import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { requireAuth, canAccessTeam } from "../middleware/auth.js";
import { calcularEstadoCuota } from "../lib/cuota.js";
import { calcularDocumentos, MAX_DOC_BYTES, TipoDocumento, TIPOS_DOCUMENTO, aptoParaJugar, vencimientoPorRegla } from "../lib/ficha.js";

const router = Router();

// ---------- Jugadores de un equipo (delegado con acceso) ----------
// GET /api/teams/:teamId/players
router.get("/teams/:teamId/players", requireAuth, async (req, res) => {
  const { teamId } = req.params;
  const can = await canAccessTeam(req.user!.id, teamId);
  if (!can) return res.status(403).json({ error: "No tenés acceso a este equipo" });

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { category: true } });
  const categoria = team?.category ?? null;

  const links = await prisma.playerTeam.findMany({
    where: { teamId },
    include: {
      player: {
        include: {
          payments: { orderBy: { month: "desc" }, take: 24 },
          documentos: { select: { tipo: true, fechaVencimiento: true } },
        },
      },
    },
    orderBy: { player: { lastName: "asc" } },
  });

  res.json(
    links.map((l) => {
      const estadoCuota = calcularEstadoCuota(l.player.payments);
      const estadoFichas = calcularDocumentos(l.player.documentos, new Date(), categoria);
      const apto = aptoParaJugar(estadoCuota.puedeJugar, estadoFichas);
      return {
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
        // regla de cuota: pago del 1 al 10; del 11 sin pagar = deudor, no juega
        estadoCuota,
        // ficha médica / estudios
        fichas: estadoFichas,
        apto,
      };
    })
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

// PATCH /api/players/:id  (body: datos del jugador + opcional teamId para rol/pos/n° del vínculo correcto)
router.patch("/players/:id", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });

  // verificar acceso por cualquiera de sus vínculos
  const links = await prisma.playerTeam.findMany({ where: { playerId: player.id } });
  let allowed = false;
  for (const l of links) {
    if (await canAccessTeam(req.user!.id, l.teamId)) {
      allowed = true;
      break;
    }
  }
  if (!allowed) return res.status(403).json({ error: "No tenés acceso a este jugador" });

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

  // rol/pos/número se guardan en el vínculo del equipo indicado (o el primero con acceso)
  if (role || position || jersey !== undefined) {
    const target = links.find((l) => l.teamId === req.body?.teamId) ?? links.find((l) => canAccessTeam(req.user!.id, l.teamId)) ?? links[0];
    if (target) {
      await prisma.playerTeam.update({
        where: { playerId_teamId: { playerId: player.id, teamId: target.teamId } },
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

  // Recalcular estado según la regla (día + mes) y sincronizar el status del jugador.
  // Si hay deuda → DEUDA; si no hay deuda y estaba ACTIVO/DEUDA → ACTIVO (INACTIVO se respeta).
  const payments = await prisma.payment.findMany({
    where: { playerId: player.id },
    orderBy: { month: "desc" },
    take: 24,
  });
  const estadoCuota = calcularEstadoCuota(payments);
  let nuevoStatus = player.status;
  if (estadoCuota.deudor) {
    nuevoStatus = "DEUDA";
  } else if (player.status === "DEUDA" || player.status === "ACTIVO") {
    nuevoStatus = "ACTIVO";
  }
  if (nuevoStatus !== player.status) {
    await prisma.player.update({ where: { id: player.id }, data: { status: nuevoStatus } });
  }

  res.json({ payment, estadoCuota, status: nuevoStatus });
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

// ------------------- Documentos (ficha médica / estudios) -------------------

/** Verifica que el usuario tenga acceso a algún equipo del jugador (o sea ADMIN). */
async function canAccessPlayer(userId: string, playerId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "ADMIN") return true;
  const links = await prisma.playerTeam.findMany({ where: { playerId }, select: { teamId: true } });
  for (const l of links) {
    if (await canAccessTeam(userId, l.teamId)) return true;
  }
  return false;
}

/** Categorías de los equipos del jugador (para la regla por categoría). */
async function categoriasDeJugador(playerId: string): Promise<string[]> {
  const teams = await prisma.team.findMany({
    where: { players: { some: { playerId } } },
    select: { category: true },
  });
  return teams.map((t) => t.category).filter(Boolean) as string[];
}

const uploadDocSchema = z.object({
  tipo: z.enum(TIPOS_DOCUMENTO),
  descripcion: z.string().max(200).optional().nullable(),
  fileName: z.string().min(1).max(200),
  mime: z.string().min(1).max(100),
  dataBase64: z.string().min(1),
  fechaEmision: z.string().optional().nullable(), // fecha del papel (referencia)
  fechaVencimiento: z.string().optional().nullable(), // si viene, manda (lo que dice el papel)
  categoria: z.string().optional().nullable(), // categoría del equipo (para la regla ergo 2a / electro 1a)
});

// GET /api/players/:id/documents — lista de documentos (sin el archivo) + estado calculado
router.get("/players/:id/documents", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  if (!(await canAccessPlayer(req.user!.id, player.id))) {
    return res.status(403).json({ error: "No tenés acceso a este jugador" });
  }
  const docs = await prisma.jugadorDocumento.findMany({
    where: { playerId: player.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, tipo: true, descripcion: true, fileName: true, mime: true,
      size: true, fechaEmision: true, fechaVencimiento: true, subidoPorId: true, createdAt: true,
    },
  });
  // cálculo de estado con los mismísimos campos que van al cliente
  // (regla por categoría: mayores → ergo, menores → electro)
  const categorias = await categoriasDeJugador(player.id);
  const estado = calcularDocumentos(docs.map((d) => ({ tipo: d.tipo, fechaVencimiento: d.fechaVencimiento })), new Date(), categorias);
  res.json({ documentos: docs, estado });
});

// POST /api/players/:id/documents — subir documento (data en base64, máx ~2 MB)
router.post("/players/:id/documents", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  if (!(await canAccessPlayer(req.user!.id, player.id))) {
    return res.status(403).json({ error: "No tenés acceso a este jugador" });
  }
  const parsed = uploadDocSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });

  const { tipo, descripcion, fileName, mime, dataBase64, fechaEmision, fechaVencimiento, categoria } = parsed.data;
  const buf = Buffer.from(dataBase64, "base64");
  if (buf.length === 0) return res.status(400).json({ error: "El archivo está vacío" });
  if (buf.length > MAX_DOC_BYTES) {
    return res.status(400).json({ error: `El archivo supera el máximo de 2 MB (son ${(buf.length / 1024 / 1024).toFixed(1)} MB)` });
  }

  const emision = fechaEmision ? new Date(fechaEmision) : null;
  // La fecha que manda: la explícita si vino; si no, la regla del club
  // (ergo 2 años / electro 1 año desde la emisión, según categoría)
  const vence =
    fechaVencimiento ? new Date(fechaVencimiento)
    : vencimientoPorRegla(tipo, emision, categoria) ?? emision;

  const doc = await prisma.jugadorDocumento.create({
    data: {
      playerId: player.id,
      tipo,
      descripcion: descripcion ?? null,
      fileName,
      mime,
      size: buf.length,
      data: buf,
      fechaEmision: emision,
      fechaVencimiento: vence,
      subidoPorId: req.user!.id,
    },
  });

  const docs = await prisma.jugadorDocumento.findMany({ where: { playerId: player.id }, select: { tipo: true, fechaVencimiento: true } });
  const categorias = await categoriasDeJugador(player.id);
  const estado = calcularDocumentos(docs, new Date(), categorias);
  res.status(201).json({ documento: { ...doc, data: undefined }, estado });
});

// GET /api/players/:id/documents/:docId/download — descargar el archivo
router.get("/players/:id/documents/:docId/download", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  if (!(await canAccessPlayer(req.user!.id, player.id))) {
    return res.status(403).json({ error: "No tenés acceso a este jugador" });
  }
  const doc = await prisma.jugadorDocumento.findUnique({ where: { id: req.params.docId } });
  if (!doc || doc.playerId !== player.id) return res.status(404).json({ error: "Documento no encontrado" });

  res.setHeader("Content-Type", doc.mime);
  res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName.replace(/[\\"]/g, "_")}"`);
  res.send(doc.data);
});

// DELETE /api/players/:id/documents/:docId — borrar (con confirmación de quién)
router.delete("/players/:id/documents/:docId", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  if (!(await canAccessPlayer(req.user!.id, player.id))) {
    return res.status(403).json({ error: "No tenés acceso a este jugador" });
  }
  const doc = await prisma.jugadorDocumento.findFirst({ where: { id: req.params.docId, playerId: player.id } });
  if (!doc) return res.status(404).json({ error: "Documento no encontrado" });
  await prisma.jugadorDocumento.delete({ where: { id: doc.id } });
  res.json({ ok: true });
});

export default router;