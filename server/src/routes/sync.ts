// ============================================================
// POST /api/sync/timbo — sincroniza fixtures de TIMBO → Match
// ------------------------------------------------------------
// Estrategia:
// - pide por zona+round la fase regular de las categorías del
//   club (9 zonas mapeadas en lib/timbo.ts);
// - ventana extendida: desde hace 2h hasta el lunes siguiente
//   (+7 días), para traer findes próximos y entre semana;
// - upsert por timboId (idempotente), borra de la ventana los
//   partidos TIMBO que ya no existen (reprogramados);
// - guarda en SyncState ("timbo") la última corrida.
// ============================================================

import { Router } from "express";
import { prisma } from "../config.js";
import {
  CLUB_ZONES, getZoneMatches, clubTeamForMatch, clubInfoFromMatch,
  resultFromMatch, weekendWindowArg, ARG_TZ_OFFSET_MS,
  TIMBO_EDITION_ID, TimboMatch,
} from "../lib/timbo.js";
import { adaptTimboMatch } from "../adapters/timbo-adapter.js";

const router = Router();

const SYNC_TOKEN = process.env.TIMBO_SYNC_TOKEN;
const MAX_ROUNDS = 16;
const PARTIDO_EN_CURSO_WINDOW_MS = 2 * 3_600_000;

/** Último round con partidos del club en la ventana anterior por zona. */
async function lastWindowRounds(): Promise<Record<number, number>> {
  const state = await prisma.syncState.findUnique({ where: { key: "timbo" } });
  const raw = state?.value as { lastWindowRound?: Record<string, number> } | null;
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw?.lastWindowRound ?? {})) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[Number(k)] = n;
  }
  return out;
}

/** Guarda el estado de la última corrida. */
async function saveState(payload: Record<string, unknown>): Promise<void> {
  await prisma.syncState.upsert({
    where: { key: "timbo" },
    update: { value: payload as object },
    create: { key: "timbo", value: payload as object, id: undefined },
  });
}

/**
 * Ventana del finde en curso: desde hace 2h (para capturar partidos
 * en curso) hasta el lunes 23:59 (fin del finde).
 */
function extendedWindow(now: Date): { start: Date; end: Date } {
  const { start: weekendStart, end: weekendEnd } = weekendWindowArg(now);
  // Inicio: hace 2 horas (hora ARG)
  const localNow = new Date(now.getTime() + ARG_TZ_OFFSET_MS);
  const start = new Date(localNow.getTime() - PARTIDO_EN_CURSO_WINDOW_MS);
  // Usar el fin del finde en curso (lunes 23:59)
  return { start, end: weekendEnd };
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
  const prevWindowRounds = await lastWindowRounds();
  const details: string[] = [];
  let synced = 0, created = 0, updated = 0, removed = 0;
  const newRounds: Record<string, number> = {};
  const seenIds = new Set<number>();

  // Cache de Teams del club por nombre
  const teamCache = new Map<string, { id: string } | null>();

  for (const zoneCfg of CLUB_ZONES) {
    const anchor = prevWindowRounds[zoneCfg.categoryZone];
    const startRound = anchor ? Math.max(1, anchor - 2) : 1;
    let zoneWindowRound = 0;
    let zoneSynced = 0;

    for (let r = startRound; r <= MAX_ROUNDS; r++) {
      let matches: TimboMatch[] = [];
      try {
        matches = await getZoneMatches(zoneCfg.categoryZone, r);
      } catch (e) {
        details.push(`${zoneCfg.timboCategoryName}: error r${r} (${(e as Error).message})`);
        break;
      }
      if (matches.length === 0) continue;

      const relevant = matches.filter((m) => {
        if (!m.date_iso) return false;
        const d = new Date(m.date_iso);
        return d >= window.start && d <= window.end;
      });
      if (relevant.length > 0) {
        zoneWindowRound = r;
        zoneSynced += relevant.length;
      }
      if (relevant.length === 0) continue;

      for (const m of relevant) {
        const clubTeamName = clubTeamForMatch(m, zoneCfg);
        if (!clubTeamName) continue;
        const team = teamCache.get(clubTeamName) ?? (await prisma.team.findUnique({ where: { name: clubTeamName } }));
        teamCache.set(clubTeamName, team ?? null);
        if (!team) {
          details.push(`${zoneCfg.timboCategoryName}: no existe Team "${clubTeamName}"`);
          continue;
        }
        seenIds.add(m.id);
        const info = clubInfoFromMatch(m);
        const result = resultFromMatch(m);
        const norm = adaptTimboMatch(m, clubTeamName, info, result);
        if (!norm.dateTime) {
          details.push(`${zoneCfg.timboCategoryName}: sin horario (id=${m.id}, ${norm.rival})`);
        }
        const dateTime = norm.dateTime ? new Date(norm.dateTime) : new Date(m.date_iso!);
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
      }

      // Si la ronda completa ya está después de la ventana, cortar
      const allAfter = matches.every((m) => m.date_iso && new Date(m.date_iso) > window.end);
      if (allAfter) break;
    }
    if (zoneWindowRound > 0) newRounds[zoneCfg.categoryZone] = zoneWindowRound;
    details.push(`${zoneCfg.timboCategoryName}: ${zoneSynced} partido(s)`);
  }

  // Borrar partidos TIMBO de la ventana que ya no existen en TIMBO (reprogramados)
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
    lastWindowRound: newRounds,
  });

  return {
    ok: true,
    editionId: TIMBO_EDITION_ID,
    window: { start: window.start.toISOString(), end: window.end.toISOString() },
    synced, created, updated, removed,
    perZone: newRounds,
    details,
  };
}

// POST /api/sync/timbo — solo con token (header X-Timbo-Sync-Token)
router.post("/timbo", async (req, res) => {
  const token = (req.headers["x-timbo-sync-token"] as string) ?? (req.body?.token as string | undefined);
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
});

// GET /api/sync/timbo/last — última corrida (informativo)
router.get("/timbo/last", async (_req, res) => {
  const state = await prisma.syncState.findUnique({ where: { key: "timbo" } });
  res.json({ timbo: state ?? null });
});

export default router;
