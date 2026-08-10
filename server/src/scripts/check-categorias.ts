import { prisma } from "../config.js";

async function main() {
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });
  for (const t of teams) {
    console.log(`${t.name.padEnd(10)} | type=${t.type.padEnd(9)} | category=${t.category ?? "null"}`);
  }
}

main().finally(() => prisma.$disconnect());