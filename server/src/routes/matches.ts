import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { requireAuth, requireAdmin, canAccessTeam } from "../middleware/auth.js";
import { weekendWindowArg } from "../lib/timbo.js";

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

// GET /api/matches/upcoming?weekend=1 — partidos del próximo finde (viernes→lunes, hora ARG)
// Con weekend=true devuelve TODOS los del viernes→lunes (el home los agrupa por categoría).
// Con weekend=2 devuelve el finde EN CURSO + el SIGUIENTE (el home muestra ambos
// para que la sección nunca quede vacía cuando se juegan los partidos del finde).
// Sin parámetro, próximos desde ahora (comportamiento anterior).
router.get("/upcoming", async (req, res) => {
  const { weekend } = req.query;
  if (weekend === "1" || weekend === "true") {
    const { end } = weekendWindowArg(new Date());
    // Solo partidos aún por jugarse (>= ahora) del finde en curso,
    // para que no aparezcan los ya disputados ni la fecha siguiente.
    const matches = await prisma.match.findMany({
      where: { dateTime: { gte: new Date(), lte: end } },
      include: { team: true },
      orderBy: [{ dateTime: "asc" }],
    });
    return res.json(matches);
  }
  if (weekend === "2") {
    // finde actual + el siguiente: el siguiente comienza 7 días después
    // del actual (viernes→lunes; el martes no hay partidos de todos modos)
    const { start, end } = weekendWindowArg(new Date());
    const finalFindeSiguiente = new Date(end.getTime() + 7 * 86_400_000);
    const matches = await prisma.match.findMany({
      where: { dateTime: { gte: new Date(), lte: finalFindeSiguiente } },
      include: { team: true },
      orderBy: [{ dateTime: "asc" }],
    });
    return res.json(matches);
  }
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