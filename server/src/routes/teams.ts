import { Router } from "express";
import { prisma } from "../config.js";

const router = Router();

// GET /api/teams — lista de equipos (además funciona para armar el selector del delegado)
router.get("/", async (_req, res) => {
  const teams = await prisma.team.findMany({
    include: { _count: { select: { players: true } } },
    orderBy: { name: "asc" },
  });
  res.json(teams);
});

export default router;