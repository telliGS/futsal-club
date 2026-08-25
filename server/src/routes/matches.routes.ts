import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { requireAuth, requireAdmin, canAccessTeam } from "../middlewares/auth.js";
import { weekendWindowArg, ARG_TZ_OFFSET_MS } from "../lib/timbo.js";

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

// GET /api/matches/upcoming
// - Sin params: próximos desde ahora (ventana hasta el siguiente lunes)
// - weekend=1: el finde en curso (viernes→lunes)
// - weekend=2: finde en curso + siguiente (para que el home nunca quede vacío)
//
// La ventana arranca 2 HOURS antes de ahora (para mostrar partidos "en curso")
// y llega hasta el lunes siguiente al próximo finde (7 días después del fin actual).
const PARTIDO_EN_CURSO_WINDOW_MS = 2 * 3_600_000;

router.get("/upcoming", async (_req, res) => {
  // Inicio: hace 2h en hora ARG (para capturar partidos en curso)
  const localNow = new Date(Date.now() + ARG_TZ_OFFSET_MS);
  const desdeEnCurso = new Date(localNow.getTime() - PARTIDO_EN_CURSO_WINDOW_MS);
  const { start: inicioFindeActual, end: finFindeActual } = weekendWindowArg(new Date());

  // Partidos del finde en curso
  const matchesActuales = await prisma.match.findMany({
    where: { dateTime: { gte: inicioFindeActual, lte: finFindeActual } },
    include: { team: true },
    orderBy: [{ dateTime: "asc" }],
  });

  // ¿Quedan partidos por jugar?
  // Un partido se considera "jugado" si tiene resultado O si ya pasaron 1:30h desde su horario
  const FIN_MATCH_MS = 90 * 60_000;
  const now = Date.now();
  const quedanPorJugar = matchesActuales.some((m) => {
    if (m.clubGoals !== null) return false; // ya tiene resultado
    const tiempoRestante = new Date(m.dateTime).getTime() + FIN_MATCH_MS - now;
    return tiempoRestante > 0; // todavía no pasaron 1:30h
  });

  if (quedanPorJugar) {
    // Mostrar solo los que faltan (desde hace 2h en adelante)
    return res.json(matchesActuales.filter((m) => new Date(m.dateTime) >= desdeEnCurso));
  }

  // Todos terminados → mostrar el siguiente finde
  const inicioFindeSig = new Date(finFindeActual.getTime() + 1);
  const finFindeSig = new Date(finFindeActual.getTime() + 7 * 86_400_000);
  const matchesSiguientes = await prisma.match.findMany({
    where: { dateTime: { gte: inicioFindeSig, lte: finFindeSig } },
    include: { team: true },
    orderBy: [{ dateTime: "asc" }],
  });
  res.json(matchesSiguientes);
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
    return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });
  }
  const { teamId, dateTime, venue, rival, isHome } = parsed.data;
  const can = await canAccessTeam(req.user!.id, teamId);
  if (!can) return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });

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
  if (!match) return res.status(404).json({ success: false, error: "Partido no encontrado" });
  const can = await canAccessTeam(req.user!.id, match.teamId);
  if (!can) return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
  await prisma.match.delete({ where: { id: match.id } });
  res.json({ ok: true });
});

export default router;
