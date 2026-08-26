import { Router } from "express";
import { getTeams } from "../controllers/teams.controller.js";

const router = Router();

router.get("/", getTeams);

export default router;
