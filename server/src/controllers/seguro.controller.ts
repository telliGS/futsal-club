import { Request, Response } from "express";
import { prisma } from "../config.js";
import { canAccessTeam } from "../middlewares/auth.js";

type Scope = "club" | "teamId";
type Tipo = "completa" | "altas" | "bajas";

function toScope(raw: unknown): Scope {
  return raw === "teamId" ? "teamId" : "club";
}

function toTipo(raw: unknown): Tipo {
  return raw === "altas" || raw === "bajas" ? raw : "completa";
}

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

  if (tipo !== "completa") {
    const avisos = await prisma.avisoSeguro.findMany({
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

  if (scope === "teamId") {
    const links = await prisma.playerTeam.findMany({
      where: { teamId },
      include: {
        player: { include: { teams: { include: { team: { select: { name: true, type: true } } } } } },
      },
    });
    const activos = links.filter((l) => l.player.status !== "INACTIVO");
    const filas = activos.map((l) => ({
      document: l.player.document,
      lastName: l.player.lastName,
      firstName: l.player.firstName,
      birthDate: l.player.birthDate ? l.player.birthDate.toISOString().slice(0, 10) : null,
      estado: l.player.status,
      equipos: l.player.teams.map((t) => t.team.name),
    }));
    return res.json(filas);
  }

  const players = await prisma.player.findMany({
    where: { status: { not: "INACTIVO" } },
    include: { teams: { include: { team: { select: { name: true, type: true } } } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const filas = players.map((p) => ({
    document: p.document,
    lastName: p.lastName,
    firstName: p.firstName,
    birthDate: p.birthDate ? p.birthDate.toISOString().slice(0, 10) : null,
    estado: p.status,
    equipos: p.teams.map((t) => t.team.name),
  }));
  res.json(filas);
};
