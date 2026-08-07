// Quita el vínculo de un jugador a UN equipo específico.
// Uso: tsx src/scripts/unlink-player-team.ts <dni> <teamName>
import { prisma } from "../config.js";

const dni = process.argv[2];
const teamName = process.argv[3];
if (!dni || !teamName) {
  console.error("Uso: tsx src/scripts/unlink-player-team.ts <dni> <teamName>");
  process.exit(1);
}

async function main() {
  const player = await prisma.player.findUnique({ where: { document: dni } });
  if (!player) {
    console.warn(`  [!] No existe jugador con DNI ${dni}`);
    return;
  }
  const team = await prisma.team.findUnique({ where: { name: teamName } });
  if (!team) {
    console.warn(`  [!] No existe equipo "${teamName}"`);
    return;
  }
  const link = await prisma.playerTeam.findUnique({
    where: { playerId_teamId: { playerId: player.id, teamId: team.id } },
  });
  if (!link) {
    console.log(`  ${player.firstName} ${player.lastName} no está vinculado a ${teamName}`);
    return;
  }
  await prisma.playerTeam.delete({ where: { id: link.id } });
  console.log(`  ✓ ${player.firstName} ${player.lastName} → desvinculado de ${teamName} [${link.role}]`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});