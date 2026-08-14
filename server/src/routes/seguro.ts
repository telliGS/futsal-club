// Lista de asegurados del club (seguro) + avisos de altas/bajas pendientes.
// El admin exporta la lista (por club o por equipo) y la manda a la empresa de
// seguros; las altas/bajas pendientes avisan cuándo quedó desactualizada.

import { Router } from "express";
import { prisma } from "../config.js";
import { requireAuth, requireAdmin, canAccessTeam } from "../middleware/auth.js";

const router = Router();

type Scope = "club" | "teamId";
type Tipo = "completa" | "altas" | "bajas";

function toScope(raw: unknown): Scope {
  return raw === "teamId" ? "teamId" : "club";
}

function toTipo(raw: unknown): Tipo {
  return raw === "altas" || raw === "bajas" ? raw : "completa";
}

// ---------- GET /api/seguro/avisos ----------
// Avisos pendientes (no resueltos). Admin: todos. Delegado: solo los suyos.
router.get("/seguro/avisos", requireAuth, async (req, res) => {
  const esAdmin = req.user!.role === "ADMIN";
  const avisos = await prisma.avisoSeguro.findMany({
    where: esAdmin ? { resueltoAt: null } : { resueltoAt: null, creadoPorId: req.user!.id },
    orderBy: { createdAt: "asc" },
  });
  const altas = avisos.filter((a) => a.tipo === "ALTA").length;
  const bajas = avisos.filter((a) => a.tipo === "BAJA").length;
  res.json({ total: avisos.length, altas, bajas, avisos });
});

// ---------- POST /api/seguro/avisos/resolver ----------
// Marca como resueltos los avisos visibles para el usuario (se llama al
// exportar la lista completa, que ya incluye esos cambios).
router.post("/seguro/avisos/resolver", requireAuth, async (req, res) => {
  const esAdmin = req.user!.role === "ADMIN";
  const { count } = await prisma.avisoSeguro.updateMany({
    where: esAdmin ? { resueltoAt: null } : { resueltoAt: null, creadoPorId: req.user!.id },
    data: { resueltoAt: new Date() },
  });
  res.json({ ok: true, resueltos: count });
});

// ---------- GET /api/seguro/lista ----------
// scope=club (admin) → todo el club, dedupe por DNI.
// scope=teamId → jugadores activos de ese equipo.
// tipo=completa → asegurados actuales (status != INACTIVO, incluye DEUDA).
// tipo=altas|bajas → jugadores con aviso pendiente de ese tipo (desde la
// última exportación de la lista completa).
router.get("/seguro/lista", requireAuth, async (req, res) => {
  const scope = toScope(req.query.scope);
  const tipo = toTipo(req.query.tipo);
  const teamId = String(req.query.teamId ?? "");

  if (scope === "club" && req.user!.role !== "ADMIN") {
    return res.status(403).json({ error: "La lista del club completo es solo para administradores" });
  }
  if (scope === "teamId") {
    if (!teamId) return res.status(400).json({ error: "Falta el equipo (teamId)" });
    if (!(await canAccessTeam(req.user!.id, teamId))) {
      return res.status(403).json({ error: "No tenés acceso a este equipo" });
    }
  }

  // --- altas/bajas: desde los avisos pendientes (snapshot guardado) ---
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

  // --- lista completa de asegurados actuales ---
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

  // scope=club: todos los jugadores activos (dedupe por DNI garantizado: document es unique)
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
});

export default router;