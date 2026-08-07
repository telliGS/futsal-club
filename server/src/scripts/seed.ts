// Seed: crea los 10 equipos del club, el admin y un delegado de ejemplo.
// Ejecutar con: npm run db:seed
import "dotenv/config";
import { prisma } from "../config.js";
import bcrypt from "bcryptjs";

const TEAMS: Array<{ name: string; gender: "M" | "F"; type: string; category: string; tier?: string; sheetName: string }> = [
  { name: "C11", gender: "M", type: "FORMATIVA", category: "C11", sheetName: "C11" },
  { name: "C13", gender: "M", type: "FORMATIVA", category: "C13", sheetName: "C13" },
  { name: "C15", gender: "M", type: "FORMATIVA", category: "C15", sheetName: "C15" },
  { name: "C17", gender: "M", type: "FORMATIVA", category: "C17", sheetName: "C17" },
  { name: "C20", gender: "M", type: "FORMATIVA", category: "C20", sheetName: "C20" },
  { name: "C20 FEM", gender: "F", type: "FORMATIVA", category: "C20", sheetName: "C20 FEM" },
  { name: "1ra Fem", gender: "F", type: "PRIMERA", category: "PRIMERA", tier: "elite", sheetName: "1ra Fem" },
  { name: "JH C", gender: "M", type: "PRIMERA", category: "PRIMERA", tier: "primera_a", sheetName: "JH C" },
  { name: "JH NEGRO", gender: "M", type: "PRIMERA", category: "PRIMERA", tier: "primera_a", sheetName: "JH NEGRO" },
  { name: "JH ELITE", gender: "M", type: "PRIMERA", category: "PRIMERA", tier: "elite", sheetName: "JH ELITE" },
];

async function main() {
  console.log("Creando equipos...");
  for (const t of TEAMS) {
    await prisma.team.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@josehernandez.futbol";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin1234";
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { fullName: "Administrador", email: adminEmail, passwordHash: adminHash, role: "ADMIN" },
  });
  console.log(`Admin: ${admin.email}`);

  // Delegado de ejemplo para C11 (borrar luego)
  const delegadoEmail = "delegado@josehernandez.futbol";
  const delegadoHash = await bcrypt.hash("delegado1234", 10);
  const delegado = await prisma.user.upsert({
    where: { email: delegadoEmail },
    update: {},
    create: { fullName: "Delegado C11", email: delegadoEmail, passwordHash: delegadoHash, role: "DELEGADO" },
  });
  const c11 = await prisma.team.findUnique({ where: { name: "C11" } });
  if (c11) {
    await prisma.userTeamAccess.upsert({
      where: { userId_teamId: { userId: delegado.id, teamId: c11.id } },
      update: {},
      create: { userId: delegado.id, teamId: c11.id },
    });
  }
  console.log(`Delegado ejemplo: ${delegado.email}`);
  console.log("Seed completo.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });