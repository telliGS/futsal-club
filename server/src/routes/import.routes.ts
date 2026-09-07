import { Router } from "express";
import { requireAuth, canAccessTeam } from "../middlewares/auth.js";
import { getTemplate, importPlayers } from "../controllers/import.controller.js";

const router = Router();

router.get("/:teamId/template", requireAuth, async (req, res) => {
  if (!(await canAccessTeam(req.user!.id, req.params.teamId))) {
    return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
  }
  return getTemplate(req, res);
});

router.post("/:teamId/import", requireAuth, async (req, res) => {
  if (!(await canAccessTeam(req.user!.id, req.params.teamId))) {
    return res.status(403).json({ success: false, error: "No tienes acceso a este equipo" });
  }
  return importPlayers(req, res);
});

export default router;
