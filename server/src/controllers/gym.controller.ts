import { Request, Response } from "express";
import { prisma } from "../config.js";
import { calcularEstadoGym } from "../lib/gym.js";
import { calcularEstadoCuota } from "../lib/cuota.js";

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function toScope(raw: unknown): "club" | "teamId" {
  return raw === "teamId" ? "teamId" : "club";
}

function toTipo(raw: unknown): "completa" | "altas" | "bajas" {
  return raw === "altas" || raw === "bajas" ? raw : "completa";
}

async function configGlobal() {
  return prisma.gymConfig.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", precio: 0 },
  });
}

export const getConfig = async (_req: Request, res: Response) => {
  const cfg = await configGlobal();
  res.json({ precio: cfg.precio });
};

export const updateConfig = async (req: Request, res: Response) => {
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
};

export const getAvisos = async (req: Request, res: Response) => {
  const esAdmin = req.user!.role === "ADMIN";
  const avisos = await prisma.avisoGym.findMany({
    where: esAdmin ? { resueltoAt: null } : { resueltoAt: null, creadoPorId: req.user!.id },
    orderBy: { createdAt: "asc" },
  });
  const altas = avisos.filter((a) => a.tipo === "ALTA").length;
  const bajas = avisos.filter((a) => a.tipo === "BAJA").length;
  res.json({ total: avisos.length, altas, bajas, avisos });
};

export const resolverAvisos = async (req: Request, res: Response) => {
  const esAdmin = req.user!.role === "ADMIN";
  const { count } = await prisma.avisoGym.updateMany({
    where: esAdmin ? { resueltoAt: null } : { resueltoAt: null, creadoPorId: req.user!.id },
    data: { resueltoAt: new Date() },
  });
  res.json({ ok: true, resueltos: count });
};

export const getLista = async (req: Request, res: Response) => {
  const scope = toScope(req.query.scope);
  const tipo = toTipo(req.query.tipo);
  const teamId = String(req.query.teamId ?? "");
  const rawMes = String(req.query.mes ?? "");
  const mes = MES_RE.test(rawMes) ? rawMes : new Date().toISOString().slice(0, 7);

  if (scope === "club" && req.user!.role !== "ADMIN") {
    return res.status(403).json({ success: false, error: "La lista del club completo es solo para administradores" });
  }

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
};

export const createPago = async (req: Request, res: Response) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });

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
};

export const deletePago = async (req: Request, res: Response) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });

  const { month } = req.params;
  if (!MES_RE.test(month)) return res.status(400).json({ success: false, error: "Formato de mes inválido. Usá YYYY-MM" });

  await prisma.gymPayment.deleteMany({ where: { playerId: player.id, month } });
  res.json({ removed: true });
};
