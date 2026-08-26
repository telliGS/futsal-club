import { Router } from "express";
import { getStatus, getTeamsList, getStats, getSchedule } from "../controllers/public.controller.js";

const router = Router();

router.get("/status", getStatus);
router.get("/teams", getTeamsList);
router.get("/stats", getStats);
router.get("/schedule", getSchedule);

export default router;
