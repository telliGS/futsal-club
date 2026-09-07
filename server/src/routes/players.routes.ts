import { Router } from "express";
import { requireAuth, canAccessTeam } from "../middlewares/auth.js";
import {
  getTeamPlayers, createPlayer, cambiarPrimera, getByDocument,
  updateStatus, updatePlayer, deletePlayer,
  createPayment, deletePayment, getPayments,
  getDocuments, uploadDocument, downloadDocument, deleteDocument
} from "../controllers/players.controller.js";
import { exportTeamPlayers } from "../controllers/export.controller.js";
import { prisma } from "../config.js";

const router = Router();

async function checkPlayerAccess(req: import("express").Request, res: import("express").Response, playerId: string): Promise<boolean> {
  const links = await prisma.playerTeam.findMany({ where: { playerId } });
  for (const l of links) {
    if (!(await canAccessTeam(req.user!.id, l.teamId))) {
      res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
      return false;
    }
  }
  return true;
}

router.get("/teams/:teamId/players", requireAuth, async (req, res) => {
  const can = await canAccessTeam(req.user!.id, req.params.teamId);
  if (!can) return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
  return getTeamPlayers(req, res);
});

router.get("/teams/:teamId/export/players", requireAuth, async (req, res) => {
  const can = await canAccessTeam(req.user!.id, req.params.teamId);
  if (!can) return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
  return exportTeamPlayers(req, res);
});

router.post("/teams/:teamId/players", requireAuth, async (req, res) => {
  const can = await canAccessTeam(req.user!.id, req.params.teamId);
  if (!can) return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
  return createPlayer(req, res);
});

router.post("/players/:id/cambiar-primera", requireAuth, async (req, res) => {
  const { aTeamId } = req.body;
  if (aTeamId) {
    const can = await canAccessTeam(req.user!.id, aTeamId);
    if (!can) return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
  }
  return cambiarPrimera(req, res);
});

router.get("/players/by-document", requireAuth, getByDocument);

router.patch("/players/:id/status", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({
    where: { id: req.params.id },
    include: { teams: { select: { teamId: true } } },
  });
  if (player) {
    let acceso = false;
    for (const t of player.teams) {
      if (await canAccessTeam(req.user!.id, t.teamId)) {
        acceso = true;
        break;
      }
    }
    if (!acceso) return res.status(403).json({ success: false, error: "No tenés acceso a equipos de este jugador" });
  }
  return updateStatus(req, res);
});

router.patch("/players/:id", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (player) {
    const links = await prisma.playerTeam.findMany({ where: { playerId: player.id } });
    let allowed = false;
    for (const l of links) {
      if (await canAccessTeam(req.user!.id, l.teamId)) {
        allowed = true;
        break;
      }
    }
    if (!allowed) return res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
  }
  return updatePlayer(req, res);
});

router.delete("/players/:id", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (player) {
    const links = await prisma.playerTeam.findMany({ where: { playerId: player.id } });
    for (const l of links) {
      if (!(await canAccessTeam(req.user!.id, l.teamId))) {
        return res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
      }
    }
  }
  return deletePlayer(req, res);
});

router.post("/players/:id/payments/:month", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });
  if (!(await checkPlayerAccess(req, res, player.id))) return;
  return createPayment(req, res);
});

router.delete("/players/:id/payments/:month", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });
  if (!(await checkPlayerAccess(req, res, player.id))) return;
  return deletePayment(req, res);
});

router.get("/players/:id/payments", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (player) {
    const links = await prisma.playerTeam.findMany({ where: { playerId: player.id } });
    for (const l of links) {
      if (!(await canAccessTeam(req.user!.id, l.teamId))) {
        return res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
      }
    }
  }
  return getPayments(req, res);
});

router.get("/players/:id/documents", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (player) {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { role: true } });
    if (user?.role !== "ADMIN") {
      const links = await prisma.playerTeam.findMany({ where: { playerId: player.id }, select: { teamId: true } });
      let acceso = false;
      for (const l of links) {
        if (await canAccessTeam(req.user!.id, l.teamId)) {
          acceso = true;
          break;
        }
      }
      if (!acceso) return res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
    }
  }
  return getDocuments(req, res);
});

router.post("/players/:id/documents", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (player) {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { role: true } });
    if (user?.role !== "ADMIN") {
      const links = await prisma.playerTeam.findMany({ where: { playerId: player.id }, select: { teamId: true } });
      let acceso = false;
      for (const l of links) {
        if (await canAccessTeam(req.user!.id, l.teamId)) {
          acceso = true;
          break;
        }
      }
      if (!acceso) return res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
    }
  }
  return uploadDocument(req, res);
});

router.get("/players/:id/documents/:docId/download", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (player) {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { role: true } });
    if (user?.role !== "ADMIN") {
      const links = await prisma.playerTeam.findMany({ where: { playerId: player.id }, select: { teamId: true } });
      let acceso = false;
      for (const l of links) {
        if (await canAccessTeam(req.user!.id, l.teamId)) {
          acceso = true;
          break;
        }
      }
      if (!acceso) return res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
    }
  }
  return downloadDocument(req, res);
});

router.delete("/players/:id/documents/:docId", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (player) {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { role: true } });
    if (user?.role !== "ADMIN") {
      const links = await prisma.playerTeam.findMany({ where: { playerId: player.id }, select: { teamId: true } });
      let acceso = false;
      for (const l of links) {
        if (await canAccessTeam(req.user!.id, l.teamId)) {
          acceso = true;
          break;
        }
      }
      if (!acceso) return res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
    }
  }
  return deleteDocument(req, res);
});

export default router;
