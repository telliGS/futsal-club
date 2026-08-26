import { Router } from "express";
import { requireAuth, canAccessTeam } from "../middlewares/auth.js";
import { getMatches, getUpcoming, createMatch, deleteMatch } from "../controllers/matches.controller.js";
import { prisma } from "../config.js";

const router = Router();

router.get("/", getMatches);
router.get("/upcoming", getUpcoming);

router.post("/", requireAuth, async (req, res) => {
  const { teamId } = req.body;
  if (teamId) {
    const can = await canAccessTeam(req.user!.id, teamId);
    if (!can) return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
  }
  return createMatch(req, res);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const match = await prisma.match.findUnique({ where: { id: req.params.id } });
  if (match) {
    const can = await canAccessTeam(req.user!.id, match.teamId);
    if (!can) return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
  }
  return deleteMatch(req, res);
});

export default router;
