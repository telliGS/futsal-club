// Consulta rápida del estado de DNI específicos (uso ad-hoc)
import { prisma } from "../config.js";

const dnis = process.argv.slice(2);
if (dnis.length === 0) {
  console.error("Uso: tsx src/scripts/query-players.ts 41789668 42206899 41403788");
  process.exit(1);
}

async function main() {
  for (const d of dnis) {
    const p = await prisma.player.findUnique({
      where: { document: d },
      include: { teams: { include: { team: true } } },
    });
    if (!p) {
      console.log(`${d}  ->  NO ENCONTRADO`);
      continue;
    }
    const links = p.teams.map((t) => `${t.team.name}[${t.role}]`).join(", ");
    console.log(`${d}  ${p.firstName} ${p.lastName}  status=${p.status}  ->  ${links}`);
  }
  await prisma.$disconnect();
}

main().catch(console.error);