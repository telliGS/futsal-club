// ============================================================
// Lógica central del cronograma de entrenamiento (poli)
// ------------------------------------------------------------
// Compartida entre el endpoint autenticado (routes/poli.ts) y
// el público (routes/public.ts). TODOS los horarios y la
// agrupación por día se hacen en hora de Paraná (UTC-3), porque
// TIMBO manda date_iso con offset -03:00 y en la BD quedan como
// instantes UTC (un partido del domingo 21:30 ARG es 00:30Z del
// lunes). Agrupar en UTC mostraba "lunes 00:30" y dejaba partidos
// del lunes por la noche fuera de la semana.
// ============================================================

import { prisma } from "../config.js";
import { ARG_TZ_OFFSET_MS } from "./timbo.js";

/** "2026-08-14" → Date a las 00:00 UTC (fecha del calendario, sin corrimiento). */
function dateUTC(d: string): Date {
  return new Date(`${d}T00:00:00.000Z`);
}

/** Date → "YYYY-MM-DD" en UTC. */
function dayStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Instante UTC → "reloj" de Paraná (ARG está 3 h detrás de UTC). */
function argDate(d: Date): Date {
  return new Date(d.getTime() + ARG_TZ_OFFSET_MS);
}

export interface SemanaBloque {
  id: string;
  tipo: "PLANTILLA" | "EXTRA";
  startTime: string;
  endTime: string;
  place: string;
  team: { id: string; name: string } | null;
  responsable?: string | null;
  note?: string | null;
  excepcion?: {
    id: string;
    canceled: boolean;
    place?: string;
    startTime?: string;
    endTime?: string;
    note?: string;
    slotId: string | null;
  } | null;
}

export interface SemanaPartido {
  id: string;
  time: string;
  rival: string;
  isHome: boolean;
  venue: string;
  team: { id: string; name: string };
}

export interface SemanaDia {
  fecha: string;
  dia: string;
  bloques: SemanaBloque[];
  partidos: SemanaPartido[];
}

export interface SemanaResult {
  from: string;
  to: string;
  semana: SemanaDia[];
  teamById: Record<string, string>;
  /** Fecha de HOY en hora ARG ("YYYY-MM-DD") para resaltar el día actual
   *  sin depender de la zona horaria del navegador (toISOString() usa UTC). */
  hoy: string;
}

const DIAS = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"] as const;

/**
 * Semana en curso (lunes→domingo en hora ARG). Devuelve "YYYY-MM-DD"
 * de lunes y domingo, y el Date absoluto del lunes a las 00:00 ARG.
 */
export function currentWeekArg(): { from: string; to: string; monday: Date } {
  const localNow = new Date(Date.now() + ARG_TZ_OFFSET_MS); // reloj ARG
  const dow = localNow.getUTCDay(); // 0=dom 1=lun...
  const daysBack = dow === 0 ? 6 : dow - 1; // domingo → lunes de esa semana
  const mondayLocal = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() - daysBack)
  );
  const monday = new Date(mondayLocal.getTime() - ARG_TZ_OFFSET_MS); // epoch real
  const sunday = new Date(monday.getTime() + 6 * 86_400_000);
  return { from: dayStr(monday), to: dayStr(sunday), monday };
}

/**
 * Arma la semana from→to (YYYY-MM-DD, lunes→domingo en hora ARG):
 * plantilla semanal con excepciones aplicadas, bloques extra y
 * partidos del club (agrupados por día en hora ARG).
 */
export async function buildSemana(from: string, to: string): Promise<SemanaResult> {
  const fromDate = dateUTC(from);
  const toDate = dateUTC(to);

  // Rango de partidos en UTC equivalente a from 00:00 ARG → to 23:59:59 ARG
  // (ARG = UTC-3 → +3 h sobre la medianoche UTC; to incluye +27 h - 1 ms).
  const matchStart = new Date(fromDate.getTime() + 3 * 3_600_000);
  const matchEnd = new Date(toDate.getTime() + 27 * 3_600_000 - 1);

  const [slots, exceptions, matches, teams] = await Promise.all([
    prisma.poliSlot.findMany({
      include: { team: { select: { id: true, name: true } } },
    }),
    prisma.poliException.findMany({
      where: { date: { gte: fromDate, lte: toDate } },
      include: {
        slot: { select: { id: true, team: { select: { id: true, name: true } } } },
        team: { select: { id: true, name: true } },
      },
    }),
    prisma.match.findMany({
      where: { dateTime: { gte: matchStart, lte: matchEnd } },
      include: { team: { select: { id: true, name: true } } },
    }),
    prisma.team.findMany({ select: { id: true, name: true } }),
  ]);

  const teamById = Object.fromEntries(teams.map((t) => [t.id, t.name]));

  // Días de la semana pedida (de lunes a domingo)
  const dias: string[] = [];
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    dias.push(dayStr(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const semana = dias.map((fecha) => {
    const d = dateUTC(fecha);
    const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // 1=lun...7=dom
    const exDelDia = exceptions.filter((e) => dayStr(e.date) === fecha);

    // Bloqueos de slots por excepción (canceled o con slot)
    const exPorSlot = new Map<string, SemanaBloque["excepcion"] & { team: { id: string; name: string } | null }>();
    const extras: (SemanaBloque["excepcion"] & { team: { id: string; name: string } | null })[] = [];
    for (const e of exDelDia) {
      const exF = {
        id: e.id,
        canceled: e.canceled,
        place: e.place ?? undefined,
        startTime: e.startTime ?? undefined,
        endTime: e.endTime ?? undefined,
        note: e.note ?? undefined,
        // Equipo del bloque extra: el propio de la excepción o (si sobrescribe
        // un slot) el del slot original.
        team: e.team ?? e.slot?.team ?? null,
        slotId: e.slotId ?? null,
      };
      if (e.slotId) exPorSlot.set(e.slotId, exF);
      else extras.push(exF);
    }

    const bloques = (slots
      .filter((s) => s.dayOfWeek === dow && s.active)
      .map((s): SemanaBloque | null => {
        const ex = exPorSlot.get(s.id);
        if (ex?.canceled) return null;
        return {
          id: s.id,
          tipo: "PLANTILLA" as const,
          startTime: ex?.startTime ?? s.startTime,
          endTime: ex?.endTime ?? s.endTime,
          place: ex?.place ?? s.place,
          team: s.team,
          responsable: s.responsable,
          note: ex?.note ?? s.note,
          excepcion: ex ?? null,
        };
      })
      .filter((b): b is SemanaBloque => b !== null)) as SemanaBloque[];

    const extrasMapeados: SemanaBloque[] = extras.map((e) => ({
      id: `extra-${e.id}`,
      tipo: "EXTRA" as const,
      startTime: e.startTime!,
      endTime: e.endTime!,
      place: e.place ?? "Polideportivo",
      team: e.team,
      responsable: undefined,
      note: e.note,
      excepcion: e,
    }));

    // Partidos agrupados por día en hora ARG (un partido del domingo
    // 21:30 ARG tiene dateTime = lunes 00:30Z → cae el domingo).
    const partidos: SemanaPartido[] = matches
      .filter((m) => dayStr(argDate(m.dateTime)) === fecha)
      .map((m) => ({
        id: m.id,
        time: argDate(m.dateTime).toISOString().slice(11, 16),
        rival: m.rival,
        isHome: m.isHome,
        venue: m.venue,
        team: { id: m.teamId, name: m.team.name },
      }));

    return {
      fecha,
      dia: DIAS[dow],
      bloques: [...bloques, ...extrasMapeados].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      partidos,
    };
  });

  const hoy = dayStr(argDate(new Date()));

  return { from, to, semana, teamById, hoy };
}
