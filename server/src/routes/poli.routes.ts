import { Router, Request } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { requireAuth, requireAdminOrDelegado, canAccessTeam } from "../middlewares/auth.js";
import { buildSemana } from "../lib/poli.js";

const router = Router();

// ---------- Validación ----------
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const slotSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string().regex(HORA_RE),
  endTime: z.string().regex(HORA_RE),
  place: z.string().min(1).max(80),
  teamId: z.string().nullable().optional(),
  responsable: z.string().max(80).nullable().optional(),
  note: z.string().max(200).nullable().optional(),
  active: z.boolean().optional(),
});

const exceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
  place: z.string().max(80).nullable().optional(),
  startTime: z.string().regex(HORA_RE).nullable().optional(),
  endTime: z.string().regex(HORA_RE).nullable().optional(),
  canceled: z.boolean().optional(),
  note: z.string().max(200).nullable().optional(),
});

function dateUTC(d: string): Date {
  // "2026-08-14" → Date en UTC (para no correrse de día por la zona horaria)
  return new Date(`${d}T00:00:00.000Z`);
}

function dayStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function delegateTeamAccessError(
  req: Request,
  teamId: string | null | undefined
): Promise<string | undefined> {
  if (req.user?.role !== "DELEGADO") return;
  if (!teamId) return "Los delegados solo pueden operar sobre sus equipos";
  if (!(await canAccessTeam(req.user.id, teamId))) return "Sin acceso a ese equipo";
}

async function resolveExceptionTeamId(
  args: { slotId?: string | null; teamId?: string | null },
  existing?: { slotId?: string | null; teamId?: string | null }
): Promise<string | null> {
  const slotId = args.slotId === undefined ? existing?.slotId : args.slotId;
  const teamId = args.teamId === undefined ? existing?.teamId : args.teamId;
  if (teamId) return teamId;
  if (!slotId) return null;
  const slot = await prisma.poliSlot.findUnique({
    where: { id: slotId },
    select: { teamId: true },
  });
  return slot?.teamId ?? null;
}

// ---------- Plantilla (slots semanales) ----------

// GET /api/poli/slots — plantilla semanal completa
router.get("/slots", requireAuth, async (_req, res) => {
  const slots = await prisma.poliSlot.findMany({
    include: { team: { select: { id: true, name: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  res.json(slots);
});

// POST /api/poli/slots — (admin o delegado) crear slot de plantilla
router.post("/slots", requireAuth, requireAdminOrDelegado, async (req, res) => {
  const parsed = slotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });
  }
  const { teamId, ...rest } = parsed.data;
  const delegateError = await delegateTeamAccessError(req, teamId ?? null);
  if (delegateError) {
    return res.status(403).json({ success: false, error: delegateError });
  }
  const slot = await prisma.poliSlot.create({
    data: { ...rest, teamId: teamId ?? null },
    include: { team: { select: { id: true, name: true } } },
  });
  res.status(201).json(slot);
});

// PATCH /api/poli/slots/:id — (admin o delegado) editar slot de plantilla
router.patch("/slots/:id", requireAuth, requireAdminOrDelegado, async (req, res) => {
  const parsed = slotSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });
  }
  const { teamId, ...rest } = parsed.data;
  const existing = await prisma.poliSlot.findUnique({ where: { id: req.params.id }, select: { teamId: true } });
  if (!existing) {
    return res.status(404).json({ success: false, error: "Slot no encontrado" });
  }
  const updatedTeamId = teamId === undefined ? existing.teamId : teamId;
  const delegateError = await delegateTeamAccessError(req, updatedTeamId ?? null);
  if (delegateError) {
    return res.status(403).json({ success: false, error: delegateError });
  }
  const slot = await prisma.poliSlot.update({
    where: { id: req.params.id },
    data: { ...rest, teamId: teamId === undefined ? undefined : (teamId ?? null) },
    include: { team: { select: { id: true, name: true } } },
  });
  res.json(slot);
});

// DELETE /api/poli/slots/:id — (admin o delegado) eliminar slot (cascade borra sus excepciones)
router.delete("/slots/:id", requireAuth, requireAdminOrDelegado, async (req, res) => {
  const existing = await prisma.poliSlot.findUnique({ where: { id: req.params.id }, select: { teamId: true } });
  if (!existing) {
    return res.status(404).json({ success: false, error: "Slot no encontrado" });
  }
  const delegateError = await delegateTeamAccessError(req, existing.teamId ?? null);
  if (delegateError) {
    return res.status(403).json({ success: false, error: delegateError });
  }
  await prisma.poliSlot.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ---------- Excepciones puntuales ----------

// GET /api/poli/exceptions?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/exceptions", requireAuth, async (req, res) => {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const ex = await prisma.poliException.findMany({
    where: {
      ...(from ? { date: { gte: dateUTC(from) } } : {}),
      ...(to ? { date: { lte: dateUTC(to) } } : {}),
    },
    include: {
      slot: { select: { id: true, team: { select: { id: true, name: true } } } },
      team: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  });
  res.json(ex);
});

// POST /api/poli/exceptions — (admin o delegado) crear excepción puntual
router.post("/exceptions", requireAuth, requireAdminOrDelegado, async (req, res) => {
  const parsed = exceptionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });
  }
  const { date, slotId, teamId, ...rest } = parsed.data;
  const effectiveTeamId = await resolveExceptionTeamId({ slotId, teamId });
  const delegateError = await delegateTeamAccessError(req, effectiveTeamId);
  if (delegateError) {
    return res.status(403).json({ success: false, error: delegateError });
  }
  const ex = await prisma.poliException.create({
    data: { ...rest, date: dateUTC(date), slotId: slotId ?? null, teamId: teamId ?? null },
    include: {
      slot: { select: { id: true, team: { select: { id: true, name: true } } } },
      team: { select: { id: true, name: true } },
    },
  });
  res.status(201).json(ex);
});

// PATCH /api/poli/exceptions/:id — (admin o delegado) editar excepción
router.patch("/exceptions/:id", requireAuth, requireAdminOrDelegado, async (req, res) => {
  const parsed = exceptionSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });
  }
  const existing = await prisma.poliException.findUnique({
    where: { id: req.params.id },
    select: { slotId: true, teamId: true },
  });
  if (!existing) {
    return res.status(404).json({ success: false, error: "Excepción no encontrada" });
  }
  const { date, slotId, teamId, ...rest } = parsed.data;
  const effectiveTeamId = await resolveExceptionTeamId({ slotId, teamId }, existing);
  const delegateError = await delegateTeamAccessError(req, effectiveTeamId);
  if (delegateError) {
    return res.status(403).json({ success: false, error: delegateError });
  }
  const ex = await prisma.poliException.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(date ? { date: dateUTC(date) } : {}),
      slotId: slotId === undefined ? undefined : (slotId ?? null),
      teamId: teamId === undefined ? undefined : (teamId ?? null),
    },
    include: {
      slot: { select: { id: true, team: { select: { id: true, name: true } } } },
      team: { select: { id: true, name: true } },
    },
  });
  res.json(ex);
});

// DELETE /api/poli/exceptions/:id — (admin o delegado) eliminar excepción
router.delete("/exceptions/:id", requireAuth, requireAdminOrDelegado, async (req, res) => {
  const existing = await prisma.poliException.findUnique({
    where: { id: req.params.id },
    select: { slotId: true, teamId: true },
  });
  if (!existing) {
    return res.status(404).json({ success: false, error: "Excepción no encontrada" });
  }
  const effectiveTeamId = await resolveExceptionTeamId(existing, existing);
  const delegateError = await delegateTeamAccessError(req, effectiveTeamId);
  if (delegateError) {
    return res.status(403).json({ success: false, error: delegateError });
  }
  await prisma.poliException.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ---------- Vista de una semana ----------

// GET /api/poli/week?from=YYYY-MM-DD&to=YYYY-MM-DD
// Devuelve, día por día: slots de la plantilla (del día) con excepciones
// aplicadas, bloques extra (excepción sin slot) y partidos del club ese día.
// Todo en hora de Paraná (UTC-3).
router.get("/week", requireAuth, async (req, res) => {
  const from = (req.query.from as string) || dayStr(new Date());
  const to = (req.query.to as string) || from;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ success: false, error: "from/to deben ser YYYY-MM-DD" });
  }
  res.json(await buildSemana(from, to));
});

export default router;
