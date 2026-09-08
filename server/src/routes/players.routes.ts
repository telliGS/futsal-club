import { Router } from "express";
import { NextFunction, Request, Response } from "express";
import { requireAuth, canAccessTeam } from "../middlewares/auth.js";
import {
  getTeamPlayers, createPlayer, cambiarPrimera, getByDocument,
  updateStatus, updatePlayer, deletePlayer,
  createPayment, deletePayment, getPayments,
  getDocuments, uploadDocument, downloadDocument, deleteDocument
} from "../controllers/players.controller.js";
import { exportTeamPlayers } from "../controllers/export.controller.js";
import { assertPlayerAccess } from "../lib/player-access.js";

const router = Router();

// Acceso a un jugador = controlar ALGÚN equipo al que está vinculado (o ser
// ADMIN). Si el jugador no existe, el guardia deja pasar y el controller
// responde 404 "Jugador no encontrado". Fuente única: lib/player-access.ts.
const accesoAJugador = (mensaje?: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (await assertPlayerAccess(req, res, req.params.id, mensaje)) next();
  };

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

router.patch("/players/:id/status", requireAuth, accesoAJugador("No tenés acceso a equipos de este jugador"), updateStatus);
router.patch("/players/:id", requireAuth, accesoAJugador(), updatePlayer);
router.delete("/players/:id", requireAuth, accesoAJugador(), deletePlayer);

router.post("/players/:id/payments/:month", requireAuth, accesoAJugador(), createPayment);
router.delete("/players/:id/payments/:month", requireAuth, accesoAJugador(), deletePayment);
router.get("/players/:id/payments", requireAuth, accesoAJugador(), getPayments);

router.get("/players/:id/documents", requireAuth, accesoAJugador(), getDocuments);
router.post("/players/:id/documents", requireAuth, accesoAJugador(), uploadDocument);
router.get("/players/:id/documents/:docId/download", requireAuth, accesoAJugador(), downloadDocument);
router.delete("/players/:id/documents/:docId", requireAuth, accesoAJugador(), deleteDocument);

export default router;