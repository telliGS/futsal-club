// Correcciones manuales de roles/categorías confirmadas por el club.
// Fuente: columna "Cat. Nativa" del sheet (marca D.T./A.T./P.F./DEL por categoría)
// Se aplican DESPUÉS del import automático y tienen prioridad.
// Uso: tsx src/scripts/apply-roles.ts
import { prisma } from "../config.js";

// Formato: { dni, teamName, role?, status?, notes? }
// role: JUGADOR | DT | AT | PF | DEL | ...
// status: ACTIVO | DEUDA | INACTIVO | LESIONADO
const OVERRIDES = [
  // ====== Cuerpo técnico (del sheet) ======

  // C11
  { dni: "44734407", teamName: "C11", role: "DT" },           // Fernandez Alan
  { dni: "41867190", teamName: "C11", role: "DEL" },        // Ruiz Diaz Marcos

  // C13
  { dni: "44734407", teamName: "C13", role: "DT" },  // Fernandez Alan
  { dni: "41867190", teamName: "C13", role: "DEL" }, // Ruiz Diaz Marcos

  // C15
  { dni: "45946364", teamName: "C15", role: "DT" },  // Burne Mateo
  { dni: "44734407", teamName: "C15", role: "DEL" }, // Fernandez Alan

  // C17
  { dni: "41789668", teamName: "C17", role: "DT" },  // Mendez Alex
  { dni: "44862944", teamName: "C17", role: "DEL" }, // Domingorena Santiago

  // C20
  { dni: "41789668", teamName: "C20", role: "DT" },  // Mendez Alex
  { dni: "45337032", teamName: "C20", role: "DEL" }, // Fornes Tomas

  // C20 FEM
  { dni: "41867190", teamName: "C20 FEM", role: "DT" }, // Ruiz Diaz Marcos
  { dni: "46519219", teamName: "C20 FEM", role: "DEL" }, // Taborda Victoria

  // 1ra Fem
  { dni: "46318924", teamName: "1ra Fem", role: "DT" }, // Vittor Marcos

  // JH C
  { dni: "26410015", teamName: "JH C", role: "DT" }, // Motta Gabriel

  // JH NEGRO
  { dni: "42206899", teamName: "JH NEGRO", role: "DT" }, // Salvarini Lucas
  { dni: "41403788", teamName: "JH NEGRO", role: "AT" }, // Grillo Joaquin

  // JH ELITE
  { dni: "36910234", teamName: "JH ELITE", role: "DT" }, // Erben Mauro
  { dni: "35707367", teamName: "JH ELITE", role: "AT" }, // Schroeder Mauro
  { dni: "41867190", teamName: "JH ELITE", role: "PF" }, // Ruiz Diaz Marcos
  { dni: "37290269", teamName: "JH ELITE", role: "DEL" }, // Alloatti Matias

  // ====== Jugadores con doble/triple rol ======

  // Lucas Salvarini: JUGADOR de JH ELITE (y DT en JH NEGRO arriba)
  { dni: "42206899", teamName: "JH ELITE", role: "JUGADOR" },

  // Grillo: JUGADOR de JH ELITE (AT en JH NEGRO arriba)
  { dni: "41403788", teamName: "JH ELITE", role: "JUGADOR" },

  // Fernandez Alan: además de DT/DEL, es JUGADOR de JH ELITE
  { dni: "44734407", teamName: "JH ELITE", role: "JUGADOR" },

  // Schroeder: JUGADOR en JH NEGRO
  { dni: "35707367", teamName: "JH NEGRO", role: "JUGADOR" },

  // Ruiz Diaz: JUGADOR en JH NEGRO
  { dni: "41867190", teamName: "JH NEGRO", role: "JUGADOR" },

  // Victor Taborda: LESIONADA (jugadora de 1ra Fem lesionada)
  { dni: "46519219", teamName: "1ra Fem", role: "JUGADOR" },
  { dni: "46519219", status: "LESIONADO", notes: "Lesionada - sin actividad (revisar)" },

  // Mendez Alex: ya NO es jugador (era jugador, ahora DT).
  // En JH NEGRO aparece con DNI viejo; dudamos si sigue. Lo dejamos sin rol activo:
  // { dni: "41789668", teamName: "JH NEGRO", role: "JUGADOR" },  // PENDIENTE confirmar
];

async function main() {
  for (const o of OVERRIDES) {
    const player = await prisma.player.findUnique({ where: { document: o.dni } });
    if (!player) {
      console.warn(`  [!] No existe jugador con DNI ${o.dni} — salteado`);
      continue;
    }

    // Override de datos del jugador (status/notes) sin tocar equipos
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
    await prisma.playerTeam.upsert({
      where: { playerId_teamId: { playerId: player.id, teamId: team.id } },
      update: { role: o.role },
      create: { playerId: player.id, teamId: team.id, role: o.role },
    });
    console.log(`  ✓ ${player.firstName} ${player.lastName} → ${team.name} [${o.role}]`);
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});