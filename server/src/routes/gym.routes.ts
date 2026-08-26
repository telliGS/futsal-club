import { Router, Request, Response } from "express";
import { prisma } from "../config.js";
import { requireAuth, requireAdmin, canAccessTeam } from "../middlewares/auth.js";
import { getConfig, updateConfig, getAvisos, resolverAvisos, getLista, createPago, deletePago } from "../controllers/gym.controller.js";

const router = Router();

async function checkPlayerAccess(req: Request, res: Response, playerId: string): Promise<boolean> {
  const links = await prisma.playerTeam.findMany({ where: { playerId } });
  for (const l of links) {
    if (!(await canAccessTeam(req.user!.id, l.teamId))) {
      res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
      return false;
    }
  }
  return true;
}

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

router.post("/gym/players/:id/pagos/:month", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });
  if (!(await checkPlayerAccess(req, res, player.id))) return;
  return createPago(req, res);
});

router.delete("/gym/players/:id/pagos/:month", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });
  if (!(await checkPlayerAccess(req, res, player.id))) return;
  return deletePago(req, res);
});

export default router;
