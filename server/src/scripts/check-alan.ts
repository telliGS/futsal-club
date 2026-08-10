import { prisma } from "../config.js";

async function main() {
  const p = await prisma.player.findFirst({
    where: { firstName: { contains: "Alan" }, lastName: { contains: "Fern" } },
    include: { teams: { include: { team: true } } },
  });
  if (!p) {
    console.log("No encontrado");
    return;
  }
  console.log(`${p.firstName} ${p.lastName}`);
  for (const l of p.teams) {
    console.log(`  -> ${l.team.name} [${l.team.type}] rol=${l.role}`);
  }
}

main().finally(() => prisma.$disconnect());