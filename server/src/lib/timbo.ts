// ============================================================
// Cliente de la API pública de TIMBO (futsal de Paraná - APFS)
// ------------------------------------------------------------
// Descubierta el 07/08: base admin.timbo.futbol/api + headers
// obligatorios Rav y Api-Version = 99999999999 (bundle Nuxt S2).
// La fuente de verdad del fixture del club es esta API; el
// sync escribe en la tabla Match (timboId) del lado nuestro.
// ============================================================

/** Zona horaria del torneo (Paraná, Entre Ríos) — fija UTC-3 sin DST. */
export const ARG_TZ_OFFSET_MS = -3 * 60 * 60 * 1000;

/**
 * Ventana del "finde" (viernes 00:00 → lunes 23:59 en hora ARG).
 * Correcta incluso corriendo en UTC (serverless): calcula el día
 * local en UTC-3 y devuelve límites absolutos (epoch).
 *
 * Regla: el finde EN CURSO es viernes→lunes. Por eso el LUNES sigue
 * perteneciendo al finde que recién termina (puede haber partidos ese
 * día). Recién desde el MARTES se muestra la fecha siguiente.
 * (Antes el lunes saltaba directo al próximo viernes y aparecían los
 *  partidos de la fecha siguiente con la actual todavía en juego.)
 */
export function weekendWindowArg(now: Date): { start: Date; end: Date } {
  const localNow = new Date(now.getTime() + ARG_TZ_OFFSET_MS); // "hora ARG" como si fuera UTC
  const day = localNow.getUTCDay(); // 0=dom 1=lun ... 5=vie 6=sáb
  const fridayLocal = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), 0, 0, 0, 0));
  if (day >= 5 || day === 0 || day === 1) {
    // vie/sáb/dom + LUNES → el finde en curso (volver al viernes:
    // vie=0, sáb=1, dom=2 y lun=3 días atrás; fórmula ((day+2)%7))
    fridayLocal.setUTCDate(fridayLocal.getUTCDate() - ((day + 2) % 7));
  } else {
    // mar→jue → el próximo viernes
    fridayLocal.setUTCDate(fridayLocal.getUTCDate() + ((5 - day + 7) % 7));
  }
  const endLocal = new Date(fridayLocal);
  endLocal.setUTCDate(endLocal.getUTCDate() + 3); // lunes
  endLocal.setUTCHours(23, 59, 59, 999);
  // volver a epoch real (restar el offset que sumamos)
  const start = new Date(fridayLocal.getTime() - ARG_TZ_OFFSET_MS);
  const end = new Date(endLocal.getTime() - ARG_TZ_OFFSET_MS);
  return { start, end };
}

const TIMBO_BASE = "https://admin.timbo.futbol/api";
const TIMBO_HEADERS = {
  "User-Agent": "jh-futsal-sync/1.0",
  Rav: "99999999999",
  "Api-Version": "99999999999",
  Accept: "application/json",
} as const;

// Edición activa actual del torneo APFS (Clausura 2026).
// Se puede descubrir dinámicamente desde el torneo; acá queda
// pinneado porque la edición activa es estable durante el torneo.
export const TIMBO_EDITION_ID = 836000892; // clausura-2026-31
export const TIMBO_TOURNAMENT_SLUG = "competencia-oficial-apfs";

export interface TimboPosition {
  roster?: { team?: { id?: number; name?: string } };
  name?: string;
}

export interface TimboMatch {
  id: number;
  round: number;
  date_iso?: string | null;
  field?: { name?: string } | null;
  positions: TimboPosition[];
  goals?: number[] | null;
  /** true cuando el partido está finalizado en TIMBO */
  closed?: boolean;
  /** 1 = TIMBO muestra el resultado públicamente */
  show_result?: number;
}

export interface TimboZone {
  id: number;
  name: string;
}

/** GET con headers TIMBO; lanza si error de red o !ok. */
export async function timboFetch(path: string): Promise<unknown> {
  const res = await fetch(`${TIMBO_BASE}${path}`, { headers: TIMBO_HEADERS });
  if (!res.ok) throw new Error(`TIMBO ${res.status} en ${path}`);
  return res.json();
}

/** Partidos de una zona (categoría) en una ronda. Devuelve [] si no hay. */
export async function getZoneMatches(zoneId: number, round: number): Promise<TimboMatch[]> {
  const url = `/embeded/editions/${TIMBO_EDITION_ID}/fixtures/${zoneId}?round=${round}`;
  const json = (await timboFetch(url)) as { matches?: TimboMatch[] } | null;
  if (!json || !Array.isArray(json.matches)) return [];
  return json.matches.filter((m) => m && typeof m.id === "number");
}

/** Normaliza para comparar: mayúsculas sin tildes ni espacios extra. */
export function norm(name?: string | null): string {
  return (name ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/\s+/g, " ")
    .trim();
}

/** ¿El partido involucra al club José Hernández? */
export function involvesClub(m: TimboMatch): boolean {
  return m.positions.some((p) => norm(p.roster?.team?.name).startsWith("JOSE HERNANDEZ"));
}

/**
 * Datos del club dentro del partido: rival e isHome, detectando el nombre
 * TIMBO real del club ("JOSÉ HERNÁNDEZ A/C/NEGRO..."), no el nombre del Team
 * en nuestra BD (ej. "C20" vs "JOSE HERNÁNDEZ A").
 */
export function clubInfoFromMatch(m: TimboMatch): { isHome: boolean; rival: string } {
  const isClub = (p: TimboPosition) => norm(p.roster?.team?.name).startsWith("JOSE HERNANDEZ");
  const clubIdx = m.positions.findIndex(isClub);
  if (clubIdx === -1) return { isHome: false, rival: "Por confirmar" };
  const rivalIdx = clubIdx === 0 ? 1 : 0;
  const rival = m.positions[rivalIdx]?.roster?.team?.name ?? "Por confirmar";
  return { isHome: clubIdx === 0, rival };
}

/**
 * Resultado del partido para el club: los goles de TIMBO vienen alineados
 * por índice con `positions` (home en 0, visita en 1). Devuelve null si el
 * partido no está cerrado o TIMBO no publica el resultado todavía
 * (goals puede venir como [2] o [] durante el desarrollo del partido).
 */
export function resultFromMatch(m: TimboMatch): { clubGoals: number; rivalGoals: number } | null {
  if (!m.closed || m.show_result !== 1) return null;
  const goals = m.goals;
  if (!goals || goals.length < 2) return null;
  const isClub = (p: TimboPosition) => norm(p.roster?.team?.name).startsWith("JOSE HERNANDEZ");
  const clubIdx = m.positions.findIndex(isClub);
  if (clubIdx === -1) return null;
  const rivalIdx = clubIdx === 0 ? 1 : 0;
  const clubGoals = goals[clubIdx];
  const rivalGoals = goals[rivalIdx];
  if (clubGoals == null || rivalGoals == null) return null;
  return { clubGoals, rivalGoals };
}

// ------------------------------------------------------------
// Mapeo de categorías TIMBO → equipos del club
// (source de verdad del seed). Si el club no tiene equipo en
// esa categoría (C9, Tercera Div) se omite.
// El nombre devuelto es el nombre del Team en nuestra BD.
// ------------------------------------------------------------

export interface ClubZoneMapping {
  /** zoneId de la categoría en TIMBO (de la edición activa) */
  categoryZone: number;
  /** nombre de la categoría en TIMBO (solo logging) */
  timboCategoryName: string;
  /** equipos del club que juegan en esa categoría: nombre TIMBO → nombre del Team en BD */
  teams: Array<{ timboName: string; clubTeamName: string }>;
}

export const CLUB_ZONES: ClubZoneMapping[] = [
  { categoryZone: 988433371, timboCategoryName: "C11", teams: [{ timboName: "JOSE HERNANDEZ A", clubTeamName: "C11" }] },
  { categoryZone: 459559666, timboCategoryName: "C13", teams: [{ timboName: "JOSE HERNANDEZ A", clubTeamName: "C13" }] },
  { categoryZone: 1777915026, timboCategoryName: "C15", teams: [{ timboName: "JOSE HERNANDEZ A", clubTeamName: "C15" }] },
  { categoryZone: 1931711571, timboCategoryName: "C17", teams: [{ timboName: "JOSE HERNANDEZ A", clubTeamName: "C17" }] },
  { categoryZone: 1418548496, timboCategoryName: "C20 Masculina", teams: [{ timboName: "JOSE HERNANDEZ A", clubTeamName: "C20" }] },
  { categoryZone: 1620054040, timboCategoryName: "C20 Femenina", teams: [{ timboName: "JOSE HERNANDEZ A", clubTeamName: "C20 FEM" }] },
  { categoryZone: 933248058, timboCategoryName: "Elite Femenina", teams: [{ timboName: "JOSE HERNANDEZ A", clubTeamName: "1ra Fem" }] },
  { categoryZone: 640741674, timboCategoryName: "Elite Masculina", teams: [{ timboName: "JOSE HERNANDEZ A", clubTeamName: "JH ELITE" }] },
  {
    categoryZone: 2137527202,
    timboCategoryName: "Segunda División",
    teams: [
      { timboName: "JOSE HERNANDEZ C", clubTeamName: "JH C" },
      { timboName: "JOSE HERNANDEZ NEGRO", clubTeamName: "JH NEGRO" },
    ],
  },
];

/** Equipo del club que corresponde al partido dado (por nombre TIMBO), o null. */
export function clubTeamForMatch(m: TimboMatch, zoneCfg: ClubZoneMapping): string | null {
  for (const t of zoneCfg.teams) {
    // El partido es del club si algún equipo del partido matchea el nombre TIMBO.
    // Se toma el del home (positions[0]) en el clásico JH C vs JH NEGRO.
    const all = m.positions.map((p) => norm(p.roster?.team?.name));
    const exact = all.some((n) => n === norm(t.timboName));
    const homeMatch = norm(m.positions[0]?.roster?.team?.name) === norm(t.timboName);
    if (exact || homeMatch) return t.clubTeamName;
  }
  // Fallback: nombres genéricos del club (JOSE HERNANDEZ sin sufijo) en categorías con un solo equipo
  if (zoneCfg.teams.length === 1 && involvesClub(m)) return zoneCfg.teams[0].clubTeamName;
  return null;
}