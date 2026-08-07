import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { requireAuth, requireAdmin, canAccessTeam } from "../middleware/auth.js";

const router = Router();

// GET /api/matches?teamId=&upcoming=true — partidos públicos (sin login)
router.get("/", async (req, res) => {
  const { teamId, category, limit } = req.query as Record<string, string | undefined>;
  const where: Record<string, unknown> = {};
  if (teamId) where.teamId = teamId;
  if (category) where.team = { category };

  const matches = await prisma.match.findMany({
    where,
    include: { team: true },
    orderBy: { dateTime: "asc" },
    take: limit ? Math.min(Number(limit), 50) : 20,
  });
  res.json(matches);
});

// GET /api/matches/upcoming — próximos desde ahora (para el home)
router.get("/upcoming", async (_req, res) => {
  const matches = await prisma.match.findMany({
    where: { dateTime: { gte: new Date() } },
    include: { team: true },
    orderBy: { dateTime: "asc" },
    take: 10,
  });
  res.json(matches);
});

const createMatchSchema = z.object({
  teamId: z.string().min(1),
  dateTime: z.string().min(1), // ISO
  venue: z.string().min(1),
  rival: z.string().min(1),
  isHome: z.boolean().optional(),
});

// POST /api/matches — lo usan los delegados (de su equipo) o admin
router.post("/", requireAuth, async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
  }
  const { teamId, dateTime, venue, rival, isHome } = parsed.data;
  const can = await canAccessTeam(req.user!.id, teamId);
  if (!can) return res.status(403).json({ error: "No tenés acceso a este equipo" });

  const match = await prisma.match.create({
    data: {
      teamId,
      dateTime: new Date(dateTime),
      venue,
      rival,
      isHome: isHome ?? true,
      category: (await prisma.team.findUnique({ where: { id: teamId } }))?.name,
    },
  });
  res.status(201).json(match);
});

// DELETE /api/matches/:id — borrar partido
router.delete("/:id", requireAuth, async (req, res) => {
  const match = await prisma.match.findUnique({ where: { id: req.params.id } });
  if (!match) return res.status(404).json({ error: "Partido no encontrado" });
  const can = await canAccessTeam(req.user!.id, match.teamId);
  if (!can) return res.status(403).json({ error: "No tenés acceso a este equipo" });
  await prisma.match.delete({ where: { id: match.id } });
  res.json({ ok: true });
});

export default router;