import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { buildSemana } from "../lib/poli.js";

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
  return new Date(`${d}T00:00:00.000Z`);
}

function dayStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const getSlots = async (_req: Request, res: Response) => {
  const slots = await prisma.poliSlot.findMany({
    include: { team: { select: { id: true, name: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  res.json(slots);
};

export const createSlot = async (req: Request, res: Response) => {
  const parsed = slotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });
  }
  const { teamId, ...rest } = parsed.data;
  const slot = await prisma.poliSlot.create({
    data: { ...rest, teamId: teamId ?? null },
    include: { team: { select: { id: true, name: true } } },
  });
  res.status(201).json(slot);
};

export const updateSlot = async (req: Request, res: Response) => {
  const parsed = slotSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });
  }
  const { teamId, ...rest } = parsed.data;
  const existing = await prisma.poliSlot.findUnique({ where: { id: req.params.id }, select: { teamId: true } });
  if (!existing) {
    return res.status(404).json({ success: false, error: "Slot no encontrado" });
  }
  const slot = await prisma.poliSlot.update({
    where: { id: req.params.id },
    data: { ...rest, teamId: teamId === undefined ? undefined : (teamId ?? null) },
    include: { team: { select: { id: true, name: true } } },
  });
  res.json(slot);
};

export const deleteSlot = async (req: Request, res: Response) => {
  const existing = await prisma.poliSlot.findUnique({ where: { id: req.params.id }, select: { teamId: true } });
  if (!existing) {
    return res.status(404).json({ success: false, error: "Slot no encontrado" });
  }
  await prisma.poliSlot.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
};

export const getExceptions = async (req: Request, res: Response) => {
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
};

export const createException = async (req: Request, res: Response) => {
  const parsed = exceptionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });
  }
  const { date, slotId, teamId, ...rest } = parsed.data;
  const ex = await prisma.poliException.create({
    data: { ...rest, date: dateUTC(date), slotId: slotId ?? null, teamId: teamId ?? null },
    include: {
      slot: { select: { id: true, team: { select: { id: true, name: true } } } },
      team: { select: { id: true, name: true } },
    },
  });
  res.status(201).json(ex);
};

export const updateException = async (req: Request, res: Response) => {
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
};

export const deleteException = async (req: Request, res: Response) => {
  const existing = await prisma.poliException.findUnique({
    where: { id: req.params.id },
    select: { slotId: true, teamId: true },
  });
  if (!existing) {
    return res.status(404).json({ success: false, error: "Excepción no encontrada" });
  }
  await prisma.poliException.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
};

export const getWeek = async (req: Request, res: Response) => {
  const from = (req.query.from as string) || dayStr(new Date());
  const to = (req.query.to as string) || from;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ success: false, error: "from/to deben ser YYYY-MM-DD" });
  }
  res.json(await buildSemana(from, to));
};
