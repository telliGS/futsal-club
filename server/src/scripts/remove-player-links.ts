// Baja administrativa de un jugador del club (sin borrar historial).
// Quita los vínculos a equipos y deja el status INACTIVO.
// Uso: tsx src/scripts/remove-player-links.ts <dni>
import { prisma } from "../config.js";

const dni = process.argv[2];
if (!dni) {
  console.error("Uso: tsx src/scripts/remove-player-links.ts <dni>");
  process.exit(1);
}

async function main() {
  const player = await prisma.player.findUnique({ where: { document: dni } });
  if (!player) {
    console.warn(`  [!] No existe jugador con DNI ${dni}`);
    return;
  }

  const links = await prisma.playerTeam.findMany({
    where: { playerId: player.id },
    include: { team: true },
  });
  console.log(`Jugador: ${player.firstName} ${player.lastName} (${player.id})`);
  console.log(`  Vínculos actuales: ${links.map((l) => `${l.team.name}[${l.role}]`).join(", ") || "ninguno"}`);

  // quitar vínculos a equipos
  for (const l of links) {
    await prisma.playerTeam.delete({ where: { id: l.id } });
    console.log(`  - desvinculado de ${l.team.name}`);
  }

  // dejar status INACTIVO
  await prisma.player.update({
    where: { id: player.id },
    data: { status: "INACTIVO", notes: player.notes ? `${player.notes} | Baja: ya no juega` : "Baja: ya no juega" },
  });

  // conservamos pagos/registro — por si se reincorpora
  console.log(`  ✓ ${player.firstName} ${player.lastName} → INACTIVO, sin vínculos a equipos.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});