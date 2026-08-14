// Crea los dos admins de élite:
//  - Mauro Erben (DT de élite) → admin nuevo con acceso total.
//  - Rodrigo Vergara Aranda (delegado de élite) → ya existe como DELEGADO,
//    se lo convierte a ADMIN (acceso total) manteniendo su email y contraseña.
// Ejecutar con: npx tsx src/scripts/create-admins-elite.ts
import "dotenv/config";
import { prisma } from "../config.js";
import bcrypt from "bcryptjs";

const MAURO_EMAIL = "mauro.erben@josehernandez.futbol";
const MAURO_PASSWORD = "EliteAdmin2026!";
const MAURO_NAME = "Mauro Erben";

const RODRIGO_EMAIL = "rodrigo.vergara@josehernandez.futbol";
const RODRIGO_NAME = "Rodrigo Vergara Aranda";

const MAUROS_EMAIL = "mauro.schroeder@josehernandez.futbol";
const MAUROS_PASSWORD = "Presidente2026!";
const MAUROS_NAME = "Mauro Schroeder";

async function asignarTodosLosEquipos(userId: string) {
  const teams = await prisma.team.findMany({ select: { id: true } });
  await prisma.userTeamAccess.createMany({
    data: teams.map((t) => ({ userId, teamId: t.id })),
    skipDuplicates: true,
  });
}

async function main() {
  // ---- Mauro Erben: crear como ADMIN ----
  const hash = await bcrypt.hash(MAURO_PASSWORD, 10);
  const mauro = await prisma.user.upsert({
    where: { email: MAURO_EMAIL },
    update: { fullName: MAURO_NAME, role: "ADMIN", active: true },
    create: { fullName: MAURO_NAME, email: MAURO_EMAIL, passwordHash: hash, role: "ADMIN" },
  });
  await asignarTodosLosEquipos(mauro.id);
  console.log(`Mauro Erben (DT élite) → ${MAURO_EMAIL} / ${MAURO_PASSWORD} [ADMIN]`);

  // ---- Rodrigo Vergara Aranda: convertir DELEGADO → ADMIN ----
  const rodrigo = await prisma.user.findUnique({ where: { email: RODRIGO_EMAIL } });
  if (!rodrigo) {
    console.error(`No existe ${RODRIGO_EMAIL}. Crearlo primero como delegado o revisar el email.`);
    process.exit(1);
  }
  await prisma.user.update({
    where: { id: rodrigo.id },
    data: { fullName: RODRIGO_NAME, role: "ADMIN", active: true },
  });
  await asignarTodosLosEquipos(rodrigo.id);
  console.log(`Rodrigo Vergara Aranda (delegado élite) → ${RODRIGO_EMAIL} [convertido a ADMIN, misma contraseña]`);

  // ---- Mauro Schroeder (presidente): crear como ADMIN ----
  const hashPresidente = await bcrypt.hash(MAUROS_PASSWORD, 10);
  const mauroS = await prisma.user.upsert({
    where: { email: MAUROS_EMAIL },
    update: { fullName: MAUROS_NAME, role: "ADMIN", active: true },
    create: { fullName: MAUROS_NAME, email: MAUROS_EMAIL, passwordHash: hashPresidente, role: "ADMIN" },
  });
  await asignarTodosLosEquipos(mauroS.id);
  console.log(`Mauro Schroeder (presidente) → ${MAUROS_EMAIL} / ${MAUROS_PASSWORD} [ADMIN]`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});