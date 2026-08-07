// Crea (o actualiza) un usuario de PRUEBA DELEGADO con acceso SOLO a JH ELITE.
// Ejecutar con: npx tsx src/scripts/create-delegado-elite.ts
import "dotenv/config";
import { prisma } from "../config.js";
import bcrypt from "bcryptjs";

const EMAIL = "delegado.elite@josehernandez.futbol";
const PASSWORD = "Elite1234567";
const FULL_NAME = "Delegado JH ELITE (prueba)";

async function main() {
  const team = await prisma.team.findUnique({ where: { name: "JH ELITE" } });
  if (!team) {
    console.error("No existe el equipo JH ELITE en la BD");
    process.exit(1);
  }

  const hash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { fullName: FULL_NAME, active: true },
    create: { fullName: FULL_NAME, email: EMAIL, passwordHash: hash, role: "DELEGADO" },
  });

  await prisma.userTeamAccess.upsert({
    where: { userId_teamId: { userId: user.id, teamId: team.id } },
    update: {},
    create: { userId: user.id, teamId: team.id },
  });

  console.log(`Delegado listo → ${EMAIL} / ${PASSWORD}`);
  console.log(`Acceso a: ${team.name} (${team.id}) con rol ${user.role}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});