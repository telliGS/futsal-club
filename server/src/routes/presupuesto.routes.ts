import { Router, Request, Response } from "express";
import { requireAuth, canAccessTeam } from "../middlewares/auth.js";
import {
  getPresupuesto, updateQuota, createGastoFijo, deleteGastoFijo,
  createGastoExtra, deleteGastoExtra, getTotal
} from "../controllers/presupuesto.controller.js";

const router = Router();

async function verificarAcceso(req: Request, res: Response): Promise<boolean> {
  const team = await import("../config.js").then((m) =>
    m.prisma.team.findUnique({ where: { id: req.params.teamId } })
  );
  if (!team) {
    res.status(404).json({ success: false, error: "Equipo no encontrado" });
    return false;
  }
  if (!(await canAccessTeam(req.user!.id, team.id))) {
    res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
    return false;
  }
  return true;
}

router.get("/:teamId/presupuesto", requireAuth, async (req, res) => {
  if (!(await verificarAcceso(req, res))) return;
  return getPresupuesto(req, res);
});

router.put("/:teamId/quota", requireAuth, async (req, res) => {
  if (!(await verificarAcceso(req, res))) return;
  return updateQuota(req, res);
});

router.post("/:teamId/gastos/fijos", requireAuth, async (req, res) => {
  if (!(await verificarAcceso(req, res))) return;
  return createGastoFijo(req, res);
});

router.delete("/:teamId/gastos/fijos/:id", requireAuth, async (req, res) => {
  if (!(await verificarAcceso(req, res))) return;
  return deleteGastoFijo(req, res);
});

router.post("/:teamId/gastos/extras", requireAuth, async (req, res) => {
  if (!(await verificarAcceso(req, res))) return;
  return createGastoExtra(req, res);
});

router.delete("/:teamId/gastos/extras/:id", requireAuth, async (req, res) => {
  if (!(await verificarAcceso(req, res))) return;
  return deleteGastoExtra(req, res);
});

router.get("/presupuesto/total", requireAuth, getTotal);

export default router;
