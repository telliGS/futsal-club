import { prisma } from "../config.js";

async function main() {
  const ps = await prisma.player.findMany({
    where: {
      OR: [
        { firstName: { contains: "Marcos", mode: "insensitive" } },
        { lastName: { contains: "ruiz", mode: "insensitive" } },
        { lastName: { contains: "diaz", mode: "insensitive" } },
      ],
    },
    include: { teams: { include: { team: true } } },
  });
  for (const p of ps) {
    console.log(`${p.firstName} ${p.lastName} (id ${p.id})`);
    for (const l of p.teams) {
      console.log(`  -> ${l.team.name} [${l.team.type}] rol=${l.role} cuenta=${l.cuentaPresupuesto}`);
    }
  }
  if (ps.length === 0) console.log("No encontrado");
}

main().finally(() => prisma.$disconnect());