import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type DelegateConfig = {
  fullName: string;
  email: string;
  password?: string;
  teamNames: string[];
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseDelegateConfigs(): DelegateConfig[] {
  const raw = process.env.DELEGADOS_CONFIG;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("DELEGADOS_CONFIG debe ser un array JSON");
    }

    return parsed.map((item) => ({
      fullName: String(item.fullName ?? "Delegado"),
      email: String(item.email ?? ""),
      password: item.password ? String(item.password) : undefined,
      teamNames: Array.isArray(item.teamNames) ? item.teamNames.map((t: unknown) => String(t)) : [],
    })).filter((item) => item.email && item.teamNames.length > 0);
  } catch (error) {
    console.warn("DELEGADOS_CONFIG inválido; se usará el fallback por equipo.", error);
    return [];
  }
}

async function main() {
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });
  const defaultPassword = process.env.DELEGADO_PASSWORD ?? "Delegado2026!";
  const domain = process.env.DELEGADO_EMAIL_DOMAIN ?? "josehernandez.futbol";

  if (teams.length === 0) {
    console.log("No hay equipos cargados en la base.");
    return;
  }

  const customConfigs = parseDelegateConfigs();
  const teamByName = new Map(teams.map((team) => [team.name.toLowerCase(), team]));

  const configs: DelegateConfig[] = customConfigs.length > 0
    ? customConfigs.map((item) => ({ ...item, password: item.password ?? defaultPassword }))
    : teams.map((team) => ({
        fullName: `Delegado ${team.name}`,
        email: `${slugify(team.name)}@${domain}`,
        password: defaultPassword,
        teamNames: [team.name],
      }));

  console.log(`Sincronizando ${configs.length} cuenta(s) de delegado...`);

  const assignedTeamIds = new Set<string>();

  for (const config of configs) {
    const resolvedTeamIds: string[] = [];
    const unresolved: string[] = [];

    for (const teamName of config.teamNames) {
      const team = teamByName.get(teamName.trim().toLowerCase());
      if (team) {
        resolvedTeamIds.push(team.id);
        assignedTeamIds.add(team.id);
      } else {
        unresolved.push(teamName);
      }
    }

    if (resolvedTeamIds.length === 0) {
      console.warn(`⚠ ${config.email}: no se encontró ningún equipo para ${config.teamNames.join(", ")}`);
      continue;
    }

    const passwordHash = await bcrypt.hash(config.password ?? defaultPassword, 10);
    const user = await prisma.user.upsert({
      where: { email: config.email },
      update: {
        fullName: config.fullName,
        passwordHash,
        role: "DELEGADO",
        active: true,
      },
      create: {
        fullName: config.fullName,
        email: config.email,
        passwordHash,
        role: "DELEGADO",
        active: true,
      },
    });

    const existingAccess = await prisma.userTeamAccess.findMany({ where: { userId: user.id } });
    const desiredIds = new Set(resolvedTeamIds);

    for (const access of existingAccess) {
      if (!desiredIds.has(access.teamId)) {
        await prisma.userTeamAccess.delete({
          where: { userId_teamId: { userId: user.id, teamId: access.teamId } },
        });
      }
    }

    for (const teamId of resolvedTeamIds) {
      await prisma.userTeamAccess.upsert({
        where: { userId_teamId: { userId: user.id, teamId } },
        update: {},
        create: { userId: user.id, teamId },
      });
    }

    const equipos = resolvedTeamIds
      .map((teamId) => teams.find((team) => team.id === teamId)?.name)
      .filter(Boolean)
      .join(", ");

    console.log(`✓ ${config.fullName} -> ${config.email} / ${config.password ?? defaultPassword} | equipos: ${equipos}`);

    if (unresolved.length > 0) {
      console.warn(`   equipos sin coincidencia: ${unresolved.join(", ")}`);
    }
  }

  const unassignedTeams = teams.filter((team) => !assignedTeamIds.has(team.id));
  if (unassignedTeams.length > 0) {
    console.log(`\nEquipos sin delegado asignado: ${unassignedTeams.map((team) => team.name).join(", ")}`);
  }

  console.log("\nSincronización finalizada.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
