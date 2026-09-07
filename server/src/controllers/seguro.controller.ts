import { Request, Response } from "express";
import { prisma } from "../config.js";
import { canAccessTeam } from "../middlewares/auth.js";
import { getSeguroRows, toScope, toTipo } from "../lib/listas.js";

export const getAvisos = async (req: Request, res: Response) => {
  const esAdmin = req.user!.role === "ADMIN";
  const avisos = await prisma.avisoSeguro.findMany({
    where: esAdmin ? { resueltoAt: null } : { resueltoAt: null, creadoPorId: req.user!.id },
    orderBy: { createdAt: "asc" },
  });
  const altas = avisos.filter((a) => a.tipo === "ALTA").length;
  const bajas = avisos.filter((a) => a.tipo === "BAJA").length;
  res.json({ total: avisos.length, altas, bajas, avisos });
};

export const resolverAvisos = async (req: Request, res: Response) => {
  const esAdmin = req.user!.role === "ADMIN";
  const { count } = await prisma.avisoSeguro.updateMany({
    where: esAdmin ? { resueltoAt: null } : { resueltoAt: null, creadoPorId: req.user!.id },
    data: { resueltoAt: new Date() },
  });
  res.json({ ok: true, resueltos: count });
};

export const getLista = async (req: Request, res: Response) => {
  const scope = toScope(req.query.scope);
  const tipo = toTipo(req.query.tipo);
  const teamId = String(req.query.teamId ?? "");

  if (scope === "club" && req.user!.role !== "ADMIN") {
    return res.status(403).json({ success: false, error: "La lista del club completo es solo para administradores" });
  }
  if (scope === "teamId") {
    if (!teamId) return res.status(400).json({ success: false, error: "Falta el equipo (teamId)" });
    if (!(await canAccessTeam(req.user!.id, teamId))) {
      return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
    }
  }

  const filas = await getSeguroRows(scope, tipo, teamId);
  res.json(filas);
};