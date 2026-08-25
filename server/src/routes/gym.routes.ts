// Gimnasio del club: configuración global (precio), lista de jugadores que van
// + avisos de altas/bajas, y pagos mensuales del gym por jugador (discriminados
// igual que la cuota, con monto real + detalle).

import { Router, Request, Response } from "express";
import { prisma } from "../config.js";
import { requireAuth, requireAdmin, canAccessTeam } from "../middlewares/auth.js";
import { calcularEstadoGym } from "../lib/gym.js";
import { calcularEstadoCuota } from "../lib/cuota.js";

const router = Router();

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
type Scope = "club" | "teamId";
type Tipo = "completa" | "altas" | "bajas";

function toScope(raw: unknown): Scope {
  return raw === "teamId" ? "teamId" : "club";
}

function toTipo(raw: unknown): Tipo {
  return raw === "altas" || raw === "bajas" ? raw : "completa";
}

async function configGlobal() {
  return prisma.gymConfig.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", precio: 0 },
  });
}

// ---------- GET /api/gym/config ----------
router.get("/gym/config", requireAuth, async (_req, res) => {
  const cfg = await configGlobal();
  res.json({ precio: cfg.precio });
});

// ---------- PUT /api/gym/config — solo ADMIN (precio global) ----------
router.put("/gym/config", requireAdmin, async (req, res) => {
  const precio = Number(req.body?.precio);
  if (!Number.isFinite(precio) || precio < 0) {
    return res.status(400).json({ success: false, error: "Ingresá un precio válido (mayor o igual a 0)" });
  }
  const cfg = await prisma.gymConfig.upsert({
    where: { id: "global" },
    update: { precio },
    create: { id: "global", precio },
  });
  res.json({ precio: cfg.precio });
});

// ---------- GET /api/gym/avisos ----------
// Avisos pendientes (no resueltos). Admin: todos. Delegado: solo los suyos.
router.get("/gym/avisos", requireAuth, async (req, res) => {
  const esAdmin = req.user!.role === "ADMIN";
  const avisos = await prisma.avisoGym.findMany({
    where: esAdmin ? { resueltoAt: null } : { resueltoAt: null, creadoPorId: req.user!.id },
    orderBy: { createdAt: "asc" },
  });
  const altas = avisos.filter((a) => a.tipo === "ALTA").length;
  const bajas = avisos.filter((a) => a.tipo === "BAJA").length;
  res.json({ total: avisos.length, altas, bajas, avisos });
});

// ---------- POST /api/gym/avisos/resolver ----------
router.post("/gym/avisos/resolver", requireAuth, async (req, res) => {
  const esAdmin = req.user!.role === "ADMIN";
  const { count } = await prisma.avisoGym.updateMany({
    where: esAdmin ? { resueltoAt: null } : { resueltoAt: null, creadoPorId: req.user!.id },
    data: { resueltoAt: new Date() },
  });
  res.json({ ok: true, resueltos: count });
});

// ---------- GET /api/gym/lista ----------
// scope=club (admin) → todos los que van al gym, dedupe por DNI.
// scope=teamId → jugadores de ese equipo que van al gym.
// tipo=completa → lista actual de los que van (vaAlGym = true).
// tipo=altas|bajas → jugadores con aviso pendiente de ese tipo.
// mes=YYYY-MM → estado del gym y de la cuota para ese mes (default: actual).
// Cada fila: datos del jugador + estado gym del mes + estado cuota del mes.
router.get("/gym/lista", requireAuth, async (req, res) => {
  const scope = toScope(req.query.scope);
  const tipo = toTipo(req.query.tipo);
  const teamId = String(req.query.teamId ?? "");
  const rawMes = String(req.query.mes ?? "");
  const mes = MES_RE.test(rawMes) ? rawMes : new Date().toISOString().slice(0, 7);

  if (scope === "club" && req.user!.role !== "ADMIN") {
    return res.status(403).json({ success: false, error: "La lista del club completo es solo para administradores" });
  }
  if (scope === "teamId") {
    if (!teamId) return res.status(400).json({ success: false, error: "Falta el equipo (teamId)" });
    if (!(await canAccessTeam(req.user!.id, teamId))) {
      return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
    }
  }

  // --- altas/bajas: desde los avisos pendientes (snapshot guardado) ---
  if (tipo !== "completa") {
    const avisos = await prisma.avisoGym.findMany({
      where: {
        resueltoAt: null,
        tipo: tipo === "altas" ? "ALTA" : "BAJA",
        ...(scope === "teamId" ? { teamId } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    const teamNombres = await prisma.team.findMany({ select: { id: true, name: true } });
    const nombre = (id: string | null) => teamNombres.find((t) => t.id === id)?.name ?? "";
    const filas = avisos.map((a) => ({
      tipo: a.tipo,
      fecha: a.createdAt.toISOString().slice(0, 10),
      document: a.document,
      lastName: a.lastName,
      firstName: a.firstName,
      birthDate: a.birthDate ? a.birthDate.toISOString().slice(0, 10) : null,
      equipo: nombre(a.teamId),
    }));
    return res.json(filas);
  }

  // --- lista completa de los que van al gym ---
  const now = new Date();
  const deadline = (p: { deadline: number }) =>
    p.deadline && p.deadline >= 1 && p.deadline <= 31 ? p.deadline : 10;
  const estadoFila = (p: {
    document: string;
    lastName: string;
    firstName: string;
    birthDate: Date | null;
    deadline: number;
    status: string;
    gymPago?: { paid: boolean; amount: number; note: string | null } | null;
    cuotaPago?: { paid: boolean; amount: number } | null;
  }) => {
    const gym = calcularEstadoGym(
      p.gymPago ? [{ month: mes, paid: p.gymPago.paid }] : [],
      now,
      deadline(p)
    );
    const cuota = calcularEstadoCuota(
      p.cuotaPago ? [{ month: mes, paid: p.cuotaPago.paid }] : [],
      now,
      { deadline: deadline(p) }
    );
    return {
      document: p.document,
      lastName: p.lastName,
      firstName: p.firstName,
      birthDate: p.birthDate ? p.birthDate.toISOString().slice(0, 10) : null,
      estado: p.status,
      gymEstado: gym.pagado ? "PAGO" : gym.deudor ? "DEBE" : "PENDIENTE",
      gymMonto: p.gymPago?.paid ? p.gymPago.amount : 0,
      gymNota: p.gymPago?.note ?? null,
      cuotaEstado: cuota.alDia || cuota.pendiente ? (cuota.pendiente ? "PENDIENTE" : "AL_DIA") : "DEBE",
      cuotaMonto: p.cuotaPago?.paid ? p.cuotaPago.amount : 0,
      equipos: [] as string[],
    };
  };

  if (scope === "teamId") {
    const links = await prisma.playerTeam.findMany({
      where: { teamId, player: { vaAlGym: true } },
      include: {
        player: {
          include: {
            teams: { include: { team: { select: { name: true, type: true } } } },
            gymPayments: { where: { month: mes } },
            payments: { where: { month: mes } },
          },
        },
      },
    });
    const filas = links.map((l) => {
      const f = estadoFila({
        document: l.player.document,
        lastName: l.player.lastName,
        firstName: l.player.firstName,
        birthDate: l.player.birthDate,
        deadline: l.player.deadline,
        status: l.player.status,
        gymPago: l.player.gymPayments[0] ?? null,
        cuotaPago: l.player.payments[0] ?? null,
      });
      f.equipos = l.player.teams.map((t) => t.team.name);
      return f;
    });
    return res.json(filas);
  }

  // scope=club: todos los jugadores que van al gym (document unique → sin duplicados)
  const players = await prisma.player.findMany({
    where: { vaAlGym: true },
    include: {
      teams: { include: { team: { select: { name: true, type: true } } } },
      gymPayments: { where: { month: mes } },
      payments: { where: { month: mes } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const filas = players.map((p) => {
    const f = estadoFila({
      document: p.document,
      lastName: p.lastName,
      firstName: p.firstName,
      birthDate: p.birthDate,
      deadline: p.deadline,
      status: p.status,
      gymPago: p.gymPayments[0] ?? null,
      cuotaPago: p.payments[0] ?? null,
    });
    f.equipos = p.teams.map((t) => t.team.name);
    return f;
  });
  res.json(filas);
});

// Acceso del usuario a TODOS los equipos del jugador (igual que cuotas).
async function checkPlayerAccess(req: Request, res: Response, playerId: string): Promise<boolean> {
  const links = await prisma.playerTeam.findMany({ where: { playerId } });
  for (const l of links) {
    if (!(await canAccessTeam(req.user!.id, l.teamId))) {
      res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
      return false;
    }
  }
  return true;
}

// ---------- POST /api/gym/players/:id/pagos/:month ----------
// Registra/actualiza el pago del gym del mes (paid + monto real + detalle).
router.post("/gym/players/:id/pagos/:month", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });
  if (!(await checkPlayerAccess(req, res, player.id))) return;

  const { month } = req.params;
  if (!MES_RE.test(month)) return res.status(400).json({ success: false, error: "Formato de mes inválido. Usá YYYY-MM" });
  const mesActual = new Date().toISOString().slice(0, 7);
  if (month > mesActual) {
    return res.status(400).json({ success: false, error: `No se puede registrar el mes ${month}: todavía no llegó (mes actual: ${mesActual})` });
  }

  const paid = Boolean(req.body?.paid);
  const amount = typeof req.body?.amount === "number" ? req.body.amount : 0;
  const note = typeof req.body?.note === "string" && req.body.note.trim() ? req.body.note.trim() : null;

  const gymPayment = await prisma.gymPayment.upsert({
    where: { playerId_month: { playerId: player.id, month } },
    update: { paid, amount, note, paidAt: paid ? new Date() : null },
    create: { playerId: player.id, month, paid, amount, note, paidAt: paid ? new Date() : null },
  });

  res.json({ gymPayment });
});

// ---------- DELETE /api/gym/players/:id/pagos/:month — pone el mes en NULO ----------
router.delete("/gym/players/:id/pagos/:month", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });
  if (!(await checkPlayerAccess(req, res, player.id))) return;

  const { month } = req.params;
  if (!MES_RE.test(month)) return res.status(400).json({ success: false, error: "Formato de mes inválido. Usá YYYY-MM" });

  await prisma.gymPayment.deleteMany({ where: { playerId: player.id, month } });
  res.json({ removed: true });
});

export default router;