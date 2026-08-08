// ============================================================
// POST /api/sync/timbo — sincroniza fixtures de TIMBO → Match
// ------------------------------------------------------------
// Deploya el cron de GitHub Actions y solo con token secreto.
// Estrategia (07/08):
// - pide por zona+round la fase regular de las categorías del
//   club (9 zonas mapeadas en lib/timbo.ts);
// - upsert por timboId (idempotente), borra de la ventana los
//   partidos TIMBO que ya no existen (reprogramados);
// - guarda en SyncState ("timbo") la última corrida y el último
//   round visto por zona → la próxima corrida desde round-1.
// ============================================================

import { Router } from "express";
import { prisma } from "../config.js";
import { CLUB_ZONES, getZoneMatches, clubTeamForMatch, clubInfoFromMatch, weekendWindowArg, TIMBO_EDITION_ID, TimboMatch } from "../lib/timbo.js";

const router = Router();

const SYNC_TOKEN = process.env.TIMBO_SYNC_TOKEN;
const MAX_ROUNDS = 16;

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
  const window = weekendWindowArg(now);
  const prevWindowRounds = await lastWindowRounds();
  const details: string[] = [];
  let synced = 0, created = 0, updated = 0, removed = 0;
  const newRounds: Record<string, number> = {};
  const seenIds = new Set<number>();

  // Cache de Teams del club por nombre
  const teamCache = new Map<string, { id: string } | null>();

  for (const zoneCfg of CLUB_ZONES) {
    // Escanear rondas ventana anterior -2 .. MAX (cubre reprogramaciones
    // y el avance natural de 1 ronda por semana).
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
        break; // zona caída → no seguir pidiendo
      }
      if (matches.length === 0) continue; // receso / ronda sin esa zona

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
        if (!clubTeamName) continue; // no es un partido del club
        const team = teamCache.get(clubTeamName) ?? (await prisma.team.findUnique({ where: { name: clubTeamName } }));
        teamCache.set(clubTeamName, team ?? null);
        if (!team) {
          details.push(`${zoneCfg.timboCategoryName}: no existe Team "${clubTeamName}"`);
          continue;
        }
        seenIds.add(m.id);
        const info = clubInfoFromMatch(m);
        const prev = await prisma.match.findUnique({ where: { timboId: m.id } });
        await prisma.match.upsert({
          where: { timboId: m.id },
          create: {
            timboId: m.id,
            teamId: team.id,
            dateTime: new Date(m.date_iso!),
            venue: m.field?.name ?? "Por confirmar",
            rival: info.rival,
            isHome: info.isHome,
            category: clubTeamName,
          },
          update: {
            dateTime: new Date(m.date_iso!),
            venue: m.field?.name ?? "Por confirmar",
            rival: info.rival,
            isHome: info.isHome,
          },
        });
        synced++;
        if (prev) updated++; else created++;
      }

      // Si la ronda que acabamos de ver ya está íntegramente después de la ventana, cortar:
      const allAfter = matches.every((m) => m.date_iso && new Date(m.date_iso) > window.end);
      if (allAfter) break;
    }
    if (zoneWindowRound > 0) newRounds[zoneCfg.categoryZone] = zoneWindowRound;
    details.push(`${zoneCfg.timboCategoryName}: ${zoneSynced} partido(s)`);
  }

  // Borrar partidos TIMBO de la ventana que no estén en el nuevo set
  // (reprogramados: ya no figuran en la API de su zona/ronda).
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
    return res.status(401).json({ error: "Token inválido" });
  }
  try {
    const result = await runTimboSync();
    res.json(result);
  } catch (e) {
    console.error("Sync TIMBO falló:", e);
    res.status(500).json({ error: "Sync TIMBO falló", detail: (e as Error).message });
  }
});

// GET /api/sync/timbo/last — última corrida (informativo)
router.get("/timbo/last", async (_req, res) => {
  const state = await prisma.syncState.findUnique({ where: { key: "timbo" } });
  res.json({ timbo: state ?? null });
});

export default router;