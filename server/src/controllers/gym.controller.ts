import { Request, Response } from "express";
import { prisma } from "../config.js";
import { canAccessTeam } from "../middlewares/auth.js";
import { getGymRows, toScope, toTipo } from "../lib/listas.js";

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

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
  if (scope === "teamId") {
    if (!teamId) return res.status(400).json({ success: false, error: "Falta el equipo (teamId)" });
    if (!(await canAccessTeam(req.user!.id, teamId))) {
      return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
    }
  }

  const filas = await getGymRows(scope, tipo, teamId, mes);
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