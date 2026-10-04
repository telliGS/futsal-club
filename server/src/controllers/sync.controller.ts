import { Request, Response } from "express";
import { prisma } from "../config.js";
import {
  getZoneMatches, getEditionCategories, getActiveZones, clubZoneByName,
  clubTeamForMatch, clubInfoFromMatch, resultFromMatch,
  weekendWindowArg, ARG_TZ_OFFSET_MS,
  TIMBO_EDITION_ID, ITimboMatch, ITimboCategory, ITimboActiveZone, IClubZoneMapping,
} from "../lib/timbo.js";
import { adaptTimboMatch } from "../adapters/timbo.adapter.js";

const SYNC_TOKEN = process.env.TIMBO_SYNC_TOKEN;
const PARTIDO_EN_CURSO_WINDOW_MS = 2 * 3_600_000;
const ZONE_FETCH_CONCURRENCY = 6;

async function saveState(payload: Record<string, unknown>): Promise<void> {
  await prisma.syncState.upsert({
    where: { key: "timbo" },
    update: { value: payload as object },
    create: { key: "timbo", value: payload as object, id: undefined },
  });
}

function extendedWindow(now: Date): { start: Date; end: Date } {
  const { end: weekendEnd } = weekendWindowArg(now);
  const localNow = new Date(now.getTime() + ARG_TZ_OFFSET_MS);
  const start = new Date(localNow.getTime() - PARTIDO_EN_CURSO_WINDOW_MS);
  // Cubre también el finde SIGUIENTE: TIMBO publica el fixture con varios
  // días de anticipación y estos partidos deben cargarse de una.
  const nextEnd = new Date(weekendEnd);
  nextEnd.setUTCDate(nextEnd.getUTCDate() + 7);
  return { start, end: nextEnd };
}

/** Ejecuta fn sobre items con máximo `limit` en paralelo (preserva orden). */
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function runTimboSync(now = new Date()): Promise<{
  ok: boolean;
  editionId: number;
  window: { start: string; end: string };
  synced: number;
  created: number;
  updated: number;
  removed: number;
  perZone: Record<string, number>;
  details: string[];
}> {
  const window = extendedWindow(now);
  const details: string[] = [];
  let synced = 0, created = 0, updated = 0, removed = 0;
  const seenIds = new Set<number>();
  const perZone: Record<string, number> = {};
  const perCategory = new Map<string, number>();

  const teamCache = new Map<string, { id: string } | null>();

  // 1. Categorías de la edición → solo las del club (match por nombre).
  const categories: ITimboCategory[] = await getEditionCategories();
  const clubCats: Array<{ cat: ITimboCategory; cfg: IClubZoneMapping }> = [];
  for (const cat of categories) {
    const cfg = clubZoneByName(cat.name);
    if (cfg) clubCats.push({ cat, cfg });
  }
  if (clubCats.length === 0) throw new Error("TIMBO no devolvió categorías del club");

  // Rondas a escanear: de 1 hasta la mayor ronda total (incluye playoffs).
  // Se descubren las zonas activas por ronda: las fases de playoff (4tos,
  // semis, finales, Vuelta...) son zonas con IDs nuevos que no están en
  // CLUB_ZONES y solo aparecen en `fixtures?round=N`.
  const endRound = Math.max(...clubCats.map((x) => x.cat.round_count));

  for (let r = 1; r <= endRound; r++) {
    let active: ITimboActiveZone[];
    try {
      active = await getActiveZones(r);
    } catch (e) {
      details.push(`ronda ${r}: error descubriendo zonas (${(e as Error).message})`);
      continue;
    }

    const targets: Array<{ zone: ITimboActiveZone; cfg: IClubZoneMapping }> = [];
    for (const z of active) {
      if (z.count_matches === 0) continue;
      const hit = clubCats.find((x) => x.cat.id === z.categoryZone);
      if (hit) targets.push({ zone: z, cfg: hit.cfg });
    }
    if (targets.length === 0) continue;

    const results = await mapPool(targets, ZONE_FETCH_CONCURRENCY, async (t) => {
      try {
        return { t, matches: await getZoneMatches(t.zone.id, r), error: null as string | null };
      } catch (e) {
        return { t, matches: [] as ITimboMatch[], error: (e as Error).message };
      }
    });

    for (const { t, matches, error } of results) {
      const label = `${t.cfg.timboCategoryName}${t.zone.name ? ` [${t.zone.name}]` : ""}`;
      if (error) {
        details.push(`${label}: error r${r} (${error})`);
        continue;
      }

      const relevant = matches.filter((m) => {
        if (!m.date_iso) return false;
        const d = new Date(m.date_iso);
        return d >= window.start && d <= window.end;
      });
      if (relevant.length > 0) perZone[t.zone.id] = r;

      for (const m of relevant) {
        const clubTeamName = clubTeamForMatch(m, t.cfg);
        if (!clubTeamName) continue;
        const team = teamCache.get(clubTeamName) ?? (await prisma.team.findUnique({ where: { name: clubTeamName } }));
        teamCache.set(clubTeamName, team ?? null);
        if (!team) {
          details.push(`${label}: no existe Team "${clubTeamName}"`);
          continue;
        }
        seenIds.add(m.id);
        const info = clubInfoFromMatch(m);
        const result = resultFromMatch(m);
        const norm = adaptTimboMatch(m, clubTeamName, info, result);
        // Sin horario confiable (TIMBO manda 00:00 como placeholder): se
        // guarda dateTime null. Así no aparece como "próximo" (las queries de
        // rango lo excluyen) y el client muestra "Horario a confirmar".
        if (!norm.dateTime) {
          details.push(`${label}: sin horario (id=${m.id}, ${norm.rival})`);
        }
        const dateTime = norm.dateTime ? new Date(norm.dateTime) : null;
        const prev = await prisma.match.findUnique({ where: { timboId: m.id } });
        await prisma.match.upsert({
          where: { timboId: m.id },
          create: {
            timboId: m.id,
            teamId: team.id,
            dateTime,
            venue: norm.venue,
            rival: norm.rival,
            isHome: norm.isHome,
            category: norm.category,
            clubGoals: norm.clubGoals,
            rivalGoals: norm.rivalGoals,
          },
          update: {
            dateTime,
            venue: norm.venue,
            rival: norm.rival,
            isHome: norm.isHome,
            clubGoals: norm.clubGoals,
            rivalGoals: norm.rivalGoals,
          },
        });
        synced++;
        if (prev) updated++; else created++;
        perCategory.set(t.cfg.timboCategoryName, (perCategory.get(t.cfg.timboCategoryName) ?? 0) + 1);
      }
    }
  }

  for (const { cfg } of clubCats) {
    details.push(`${cfg.timboCategoryName}: ${perCategory.get(cfg.timboCategoryName) ?? 0} partido(s)`);
  }

  const stale = await prisma.match.deleteMany({
    where: {
      dateTime: { gte: window.start, lte: window.end },
      timboId: { not: null },
      ...(seenIds.size > 0 ? { NOT: [{ timboId: { in: [...seenIds] } }] } : {}),
    },
  });
  removed = stale.count;

  await saveState({
    editionId: TIMBO_EDITION_ID,
    lastSyncAt: now.toISOString(),
    window: { start: window.start.toISOString(), end: window.end.toISOString() },
    lastWindowRound: perZone,
  });

  return {
    ok: true,
    editionId: TIMBO_EDITION_ID,
    window: { start: window.start.toISOString(), end: window.end.toISOString() },
    synced, created, updated, removed,
    perZone,
    details,
  };
}

export const syncTimbo = async (req: Request, res: Response) => {
  // Válido por header propietario, Authorization Bearer (cron de Vercel con
  // "secret"), query string o body. Todos comparados contra el mismo token.
  const token =
    (req.headers["x-timbo-sync-token"] as string) ??
    (typeof req.headers.authorization === "string"
      ? req.headers.authorization.replace(/^Bearer\s+/i, "")
      : undefined) ??
    (typeof req.query.token === "string" ? req.query.token : undefined) ??
    (req.body?.token as string | undefined);
  if (!SYNC_TOKEN || token !== SYNC_TOKEN) {
    return res.status(401).json({ success: false, error: "Token inválido" });
  }
  try {
    const result = await runTimboSync();
    res.json(result);
  } catch (e) {
    console.error("Sync TIMBO falló:", e);
    res.status(500).json({ success: false, error: "Sync TIMBO falló", detail: (e as Error).message });
  }
};

export const getLastSync = async (_req: Request, res: Response) => {
  const state = await prisma.syncState.findUnique({ where: { key: "timbo" } });
  res.json({ timbo: state ?? null });
};
