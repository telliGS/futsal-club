import { Router, Request } from "express";
import { requireAuth, requireAdminOrDelegado, canAccessTeam } from "../middlewares/auth.js";
import {
  getSlots, createSlot, updateSlot, deleteSlot,
  getExceptions, createException, updateException, deleteException,
  getWeek
} from "../controllers/poli.controller.js";

const router = Router();

async function delegateTeamAccessError(
  req: Request,
  teamId: string | null | undefined
): Promise<string | undefined> {
  if (req.user?.role !== "DELEGADO") return;
  if (!teamId) return "Los delegados solo pueden operar sobre sus equipos";
  if (!(await canAccessTeam(req.user.id, teamId))) return "Sin acceso a ese equipo";
}

router.get("/slots", requireAuth, getSlots);

router.post("/slots", requireAuth, requireAdminOrDelegado, async (req, res) => {
  const teamId = req.body?.teamId;
  const delegateError = await delegateTeamAccessError(req, teamId ?? null);
  if (delegateError) {
    return res.status(403).json({ success: false, error: delegateError });
  }
  return createSlot(req, res);
});

router.patch("/slots/:id", requireAuth, requireAdminOrDelegado, async (req, res) => {
  const teamId = req.body?.teamId;
  const delegateError = await delegateTeamAccessError(req, teamId ?? null);
  if (delegateError) {
    return res.status(403).json({ success: false, error: delegateError });
  }
  return updateSlot(req, res);
});

router.delete("/slots/:id", requireAuth, requireAdminOrDelegado, async (req, res) => {
  return deleteSlot(req, res);
});

router.get("/exceptions", requireAuth, getExceptions);

router.post("/exceptions", requireAuth, requireAdminOrDelegado, async (req, res) => {
  return createException(req, res);
});

router.patch("/exceptions/:id", requireAuth, requireAdminOrDelegado, async (req, res) => {
  return updateException(req, res);
});

router.delete("/exceptions/:id", requireAuth, requireAdminOrDelegado, async (req, res) => {
  return deleteException(req, res);
});

router.get("/week", requireAuth, getWeek);

export default router;
