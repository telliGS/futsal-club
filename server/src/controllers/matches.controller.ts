import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { weekendWindowArg, ARG_TZ_OFFSET_MS } from "../lib/timbo.js";

const PARTIDO_EN_CURSO_WINDOW_MS = 2 * 3_600_000;

const createMatchSchema = z.object({
  teamId: z.string().min(1),
  dateTime: z.string().min(1),
  venue: z.string().min(1),
  rival: z.string().min(1),
  isHome: z.boolean().optional(),
});

export const getMatches = async (req: Request, res: Response) => {
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
};

export const getUpcoming = async (_req: Request, res: Response) => {
  const localNow = new Date(Date.now() + ARG_TZ_OFFSET_MS);
  const desdeEnCurso = new Date(localNow.getTime() - PARTIDO_EN_CURSO_WINDOW_MS);
  const { start: inicioFindeActual, end: finFindeActual } = weekendWindowArg(new Date());

  const matchesActuales = await prisma.match.findMany({
    where: { dateTime: { gte: inicioFindeActual, lte: finFindeActual } },
    include: { team: true },
    orderBy: [{ dateTime: "asc" }],
  });

  const FIN_MATCH_MS = 90 * 60_000;
  const now = Date.now();
  const quedanPorJugar = matchesActuales.some((m) => {
    if (!m.dateTime) return false;
    if (m.clubGoals !== null) return false;
    const tiempoRestante = m.dateTime.getTime() + FIN_MATCH_MS - now;
    return tiempoRestante > 0;
  });

  if (quedanPorJugar) {
    return res.json(matchesActuales.filter((m) => m.dateTime !== null && m.dateTime.getTime() >= desdeEnCurso.getTime()));
  }

  const inicioFindeSig = new Date(finFindeActual.getTime() + 1);
  const finFindeSig = new Date(finFindeActual.getTime() + 7 * 86_400_000);
  const matchesSiguientes = await prisma.match.findMany({
    where: { dateTime: { gte: inicioFindeSig, lte: finFindeSig } },
    include: { team: true },
    orderBy: [{ dateTime: "asc" }],
  });
  res.json(matchesSiguientes);
};

export const createMatch = async (req: Request, res: Response) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });
  }
  const { teamId, dateTime, venue, rival, isHome } = parsed.data;

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
};

export const deleteMatch = async (req: Request, res: Response) => {
  const match = await prisma.match.findUnique({ where: { id: req.params.id } });
  if (!match) return res.status(404).json({ success: false, error: "Partido no encontrado" });
  await prisma.match.delete({ where: { id: match.id } });
  res.json({ ok: true });
};
