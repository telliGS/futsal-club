// Corrige a Guillermo Telli: DNI 42920067 -> 46319310 y status DEUDA -> ACTIVO
// Uso: tsx src/scripts/fix-telli.ts
import { prisma } from "../config.js";

async function main() {
  const player = await prisma.player.findUnique({ where: { document: "42920067" } });
  if (!player) {
    console.error("No se encontró al jugador con DNI 42920067");
    process.exit(1);
  }
  const dupe = await prisma.player.findUnique({ where: { document: "46319310" } });
  if (dupe) {
    console.error("Ya existe un jugador con DNI 46319310 — no tocar (sería merge manual)");
    process.exit(1);
  }

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: { document: "46319310", status: "ACTIVO" },
  });
  console.log(`OK: ${updated.firstName} ${updated.lastName} -> DNI ${updated.document}, status ${updated.status}`);
}

main().finally(() => prisma.$disconnect());