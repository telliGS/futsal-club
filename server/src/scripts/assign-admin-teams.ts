// Asigna los 10 equipos al usuario ADMIN (para que el dashboard lo vea completo).
// Uso: tsx src/scripts/assign-admin-teams.ts
import { prisma } from "../config.js";

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@josehernandez.futbol";
  const admin = await prisma.user.findUnique({ where: { email } });
  if (!admin) {
    console.error(`Admin no encontrado con email: ${email}`);
    process.exit(1);
  }

  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });
  let created = 0;
  for (const t of teams) {
    try {
      await prisma.userTeamAccess.upsert({
        where: { userId_teamId: { userId: admin.id, teamId: t.id } },
        update: {},
        create: { userId: admin.id, teamId: t.id },
      });
      created++;
      console.log(`  + ${t.name}`);
    } catch (e) {
      console.error(`  error en ${t.name}: ${(e as Error).message}`);
    }
  }
  console.log(`\nAdmin (${email}): ${created}/${teams.length} equipos asignados.`);
}

main()
  .finally(() => prisma.$disconnect());