import { Router } from "express";
import { NextFunction, Request, Response } from "express";
import { requireAuth, requireAdmin, canAccessTeam } from "../middlewares/auth.js";
import { getConfig, updateConfig, getAvisos, resolverAvisos, getLista, createPago, deletePago } from "../controllers/gym.controller.js";
import { exportGym } from "../controllers/export.controller.js";
import { assertPlayerAccess } from "../lib/player-access.js";

const router = Router();

// Acceso a un jugador = controlar ALGUNO de sus equipos (o ser ADMIN). Fuente
// única compartida con players: lib/player-access.ts. El jugador inexistente
// pasa y el controller responde 404 (mismo mensaje que antes).
const accesoAJugador = (mensaje?: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (await assertPlayerAccess(req, res, req.params.id, mensaje)) next();
  };

router.get("/gym/config", requireAuth, getConfig);
router.put("/gym/config", requireAdmin, updateConfig);
router.get("/gym/avisos", requireAuth, getAvisos);
router.post("/gym/avisos/resolver", requireAuth, resolverAvisos);

router.get("/gym/lista", requireAuth, async (req, res) => {
  const scope = req.query.scope;
  const teamId = String(req.query.teamId ?? "");
  if (scope === "teamId") {
    if (!teamId) return res.status(400).json({ success: false, error: "Falta el equipo (teamId)" });
    if (!(await canAccessTeam(req.user!.id, teamId))) {
      return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
    }
  }
  return getLista(req, res);
});

router.get("/gym/export", requireAuth, exportGym);

router.post("/gym/players/:id/pagos/:month", requireAuth, accesoAJugador(), createPago);
router.delete("/gym/players/:id/pagos/:month", requireAuth, accesoAJugador(), deletePago);

export default router;
