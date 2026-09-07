// ============================================================
// Adapter: normaliza datos crudos de TIMBO → formato interno
// ------------------------------------------------------------
// TIMBO tiene inconsistencias en sus horarios:
// - `date_iso` viene con 00:00 cuando el horario no está asignado
// - `time_iso` tiene la hora real (fecha ficticia 1970-01-01)
// - `date` tiene la fecha legible con hora ("dom. 30/08/26 - 20:30")
//
// Este adapter unifica todo eso en un formato limpio que la app
// puede usar directamente. Si mañana cambia la API de TIMBO
// (o se agrega otra fuente), solo se toca acá.
// ============================================================

import type { ITimboMatch } from "../lib/timbo.js";

/** Partido normalizado, listo para almacenar en la DB. */
export interface INormalizedMatch {
  /** ID de TIMBO */
  timboId: number;
  /** DateTime en ISO con offset -03:00, o null si no hay horario */
  dateTime: string | null;
  /** Cancha */
  venue: string;
  /** Rival */
  rival: string;
  /** ¿Es local? */
  isHome: boolean;
  /** Nombre del equipo del club en la DB */
  category: string;
  /** Goles del club (null si no hay resultado) */
  clubGoals: number | null;
  /** Goles del rival */
  rivalGoals: number | null;
}

/**
 * Extrae componentes de un string ISO sin convertir a Date
 * (evita problemas de timezone en serverless UTC).
 */
function parseIsoParts(iso: string): { year: string; month: string; day: string; hours: string; minutes: string } | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return { year: m[1], month: m[2], day: m[3], hours: m[4], minutes: m[5] };
}

/**
 * Intenta rescatar la hora real de un partido TIMBO.
 *
 * TIMBO bug conocido: cuando el horario no está asignado, `date_iso`
 * viene con 00:00. Pero `time_iso` o el campo `date` tienen la
 * hora correcta. Esta función prueba en orden:
 *
 * 1. `date_iso` → si la hora no es 00:00, es confiable
 * 2. `time_iso` → extraer hora y reconstruir con la fecha de `date_iso`
 * 3. `date` → parsear "dd/mm/yy - HH:MM" como último recurso
 * 4. null → no hay dato (mostrar "Horario a confirmar")
 */
function resolveDateTime(match: ITimboMatch): string | null {
  const raw = match.date_iso;
  if (!raw) return null;

  const dp = parseIsoParts(raw);
  if (!dp) return null;

  // 1. date_iso tiene hora real → devolver tal cual
  if (dp.hours !== "00" || dp.minutes !== "00") {
    return raw;
  }

  // 2. Intentar time_iso
  if (match.time_iso) {
    const tp = parseIsoParts(match.time_iso);
    if (tp && (tp.hours !== "00" || tp.minutes !== "00")) {
      return `${dp.year}-${dp.month}-${dp.day}T${tp.hours}:${tp.minutes}:00-03:00`;
    }
  }

  // 3. Intentar campo `date` (ej. "dom. 30/08/26 - 20:30")
  if (match.date) {
    const timeInDate = match.date.match(/(\d{2}):(\d{2})\s*hs?/i)
      ?? match.date.match(/-\s*(\d{2}):(\d{2})/);
    if (timeInDate) {
      const [, h, min] = timeInDate;
      if (h !== "00" || min !== "00") {
        return `${dp.year}-${dp.month}-${dp.day}T${h}:${min}:00-03:00`;
      }
    }
  }

  // 4. No hay dato confiable
  return null;
}

/**
 * Normaliza un match crudo de TIMBO para almacenarlo en la DB.
 *
 * Uso:
 * ```ts
 * const norm = adaptTimboMatch(rawMatch, "C13", rivalInfo, resultInfo);
 * if (norm.dateTime) { upsert... }
 * ```
 */
export function adaptTimboMatch(
  raw: ITimboMatch,
  category: string,
  info: { rival: string; isHome: boolean },
  result: { clubGoals: number; rivalGoals: number } | null,
): INormalizedMatch {
  return {
    timboId: raw.id,
    dateTime: resolveDateTime(raw),
    venue: raw.field?.name ?? "Por confirmar",
    rival: info.rival,
    isHome: info.isHome,
    category,
    clubGoals: result?.clubGoals ?? null,
    rivalGoals: result?.rivalGoals ?? null,
  };
}
