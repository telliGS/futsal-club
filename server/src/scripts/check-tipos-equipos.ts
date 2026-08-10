// Verifica el tipo (FORMATIVA/PRIMERA) de cada equipo y los jugadores multiequipo.
import "dotenv/config";
import { prisma } from "../config.js";

async function main() {
  const teams = await prisma.team.findMany({ select: { name: true, type: true } });
  console.log("=== EQUIPOS ===");
  for (const t of teams.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ${t.name.padEnd(12)} ${t.type}`);
  }

  const multi = await prisma.playerTeam.groupBy({
    by: ["playerId"],
    having: { playerId: { _count: { gt: 1 } } },
  });
  console.log(`\n=== JUGADORES EN 2+ EQUIPOS (${multi.length}) ===`);
  const detalle = await prisma.playerTeam.findMany({
    where: { playerId: { in: multi.map((m) => m.playerId) } },
    include: {
      player: { select: { firstName: true, lastName: true } },
      team: { select: { name: true, type: true } },
    },
    orderBy: [{ player: { lastName: "asc" } }],
  });
  let actual: string | null = null;
  for (const d of detalle) {
    const nombre = `${d.player.lastName}, ${d.player.firstName}`;
    if (nombre !== actual) {
      console.log(`\n  ${nombre}`);
      actual = nombre;
    }
    console.log(`    → ${d.team.name} (${d.team.type})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });