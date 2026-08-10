// Limpieza post-prueba: quita el vínculo de 1ra Fem que creó test-import.ts
// en Lorenzo Frutos (DNI 54839312, el findFirst que usó la prueba con pos "Ala" N° 5).
// También lista jugadores sospechosos de prueba (TEST/EJEMPLO/999) para verificar.
import "dotenv/config";
import { prisma } from "../config.js";

async function main() {
  const player = await prisma.player.findUnique({ where: { document: "54839312" } });
  if (!player) {
    console.log("Jugador no encontrado — nada que hacer.");
    return;
  }

  const links = await prisma.playerTeam.findMany({
    where: { playerId: player.id },
    include: { team: { select: { name: true } } },
  });
  console.log("Vínculos actuales de Lorenzo Frutos:");
  for (const l of links) console.log(`  - ${l.team.name} | rol=${l.role} pos=${l.position ?? "-"} num=${l.jersey ?? "-"}`);

  const target = links.find((l) => l.team.name === "1ra Fem");
  if (target) {
    await prisma.playerTeam.delete({ where: { playerId_teamId: { playerId: player.id, teamId: target.teamId } } });
    console.log(`\n✓ Vínculo eliminado: 1ra Fem (rol=${target.role}, pos=${target.position}, num=${target.jersey})`);
  } else {
    console.log("\nNo había vínculo con 1ra Fem.");
  }

  // Verificación: jugadores con pinta de prueba
  const sospechosos = await prisma.player.findMany({
    where: {
      OR: [
        { firstName: { contains: "TEST", mode: "insensitive" } },
        { lastName: { contains: "TEST", mode: "insensitive" } },
        { firstName: { contains: "EJEMPLO", mode: "insensitive" } },
        { lastName: { contains: "EJEMPLO", mode: "insensitive" } },
        { document: { startsWith: "999" } },
      ],
    },
    select: { firstName: true, lastName: true, document: true, status: true },
  });
  console.log(`\nJugadores sospechosos de prueba (${sospechosos.length}):`);
  for (const s of sospechosos) console.log(`  - ${s.firstName} ${s.lastName} DNI=${s.document} (${s.status})`);
  if (sospechosos.length === 0) console.log("  (ninguno — BD limpia)");
}

main().catch((e) => { console.error(e); process.exit(1); });