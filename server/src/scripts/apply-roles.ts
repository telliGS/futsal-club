// Correcciones manuales de roles/categorías confirmadas por el club.
// Se aplican DESPUÉS del import automático y tienen prioridad.
// Uso: tsx src/scripts/apply-roles.ts
import { prisma } from "../config.js";

// Formato: { dni, teamName, role?, status?, notes? }
// role: JUGADOR | DT | AT | PF | DEL | ...
// status: ACTIVO | DEUDA | INACTIVO | LESIONADO
const OVERRIDES = [
  // Alex Mendez: ya no es jugador, es DT de C20; en JH NEGRO sigue como DT.
  // (el club dijo "C17, C20 y JH C" — en la BD solo tiene vínculos C17/C20/JH NEGRO.
  //  Se aplica DT en C20 y JH NEGRO; C17 queda pendiente de confirmar.)
  { dni: "41789668", teamName: "C20", role: "DT" },
  { dni: "41789668", teamName: "JH NEGRO", role: "DT" },

  // Lucas Salvarini — DT de JH NEGRO y JUGADOR de JH ELITE
  { dni: "42206899", teamName: "JH NEGRO", role: "DT" },
  { dni: "42206899", teamName: "JH ELITE", role: "JUGADOR" },

  // Joaquín Grillo — AT de JH NEGRO y JUGADOR de JH ELITE
  { dni: "41403788", teamName: "JH NEGRO", role: "AT" },
  { dni: "41403788", teamName: "JH ELITE", role: "JUGADOR" },

  //------ Correcciones round 2 -------

// Mauro Schroeder: JUGADOR en JH NEGRO, AT en JH ELITE
  { dni: "35707367", teamName: "JH NEGRO", role: "JUGADOR" },
  { dni: "35707367", teamName: "JH ELITE", role: "AT" },

  // Victoria Taborda: LESIONADA (jugadora activa pero fuera por lesión)
  { dni: "46519219", status: "LESIONADO", notes: "Lesionada - sin actividad (revisar)" },
];

async function main() {
  for (const o of OVERRIDES) {
    const player = await prisma.player.findUnique({ where: { document: o.dni } });
    if (!player) {
      console.warn(`  [!] No existe jugador con DNI ${o.dni} — salteado`);
      continue;
    }

    // Override de datos del jugador (status / notes) sin tocar equipos
    if (!o.teamName) {
      await prisma.player.update({
        where: { id: player.id },
        data: {
          ...(o.status ? { status: o.status } : {}),
          ...(o.notes ? { notes: o.notes } : {}),
        },
      });
      console.log(`  ✓ ${player.firstName} ${player.lastName} — status=${o.status ?? "—"} notes="${o.notes ?? "—"}"`);
      continue;
    }

    const team = await prisma.team.findUnique({ where: { name: o.teamName } });
    if (!team) {
      console.warn(`  [!] No existe equipo "${o.teamName}" — salteado`);
      continue;
    }
    const link = await prisma.playerTeam.upsert({
      where: { playerId_teamId: { playerId: player.id, teamId: team.id } },
      update: { role: o.role },
      create: { playerId: player.id, teamId: team.id, role: o.role },
    });
    console.log(`  ✓ ${player.firstName} ${player.lastName} → ${team.name} [${link.role}]`);
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});