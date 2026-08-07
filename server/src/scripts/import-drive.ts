// Importador desde el XLSX exportado del Drive (solo lectura).
// Detecta el ROJO (deudor / no juega), clasifica roles del cuerpo técnico
// y arma el modelo many-to-many Player<->Team usando el DNI como clave.
//
// Uso: npm run db:import   (requiere XLSX_PATH con el archivo descargado)

import "dotenv/config";
import ExcelJS from "exceljs";
import { prisma } from "../config.js";

const XLSX_PATH = process.env.XLSX_PATH ?? "C:\\Users\\Guille\\AppData\\Local\\Temp\\opencode\\cobros_jh.xlsx";

// Columnas del CSV/XLSX con los montos mensuales (ver header original):
// 0 Cat., 1 Apellido, 2 Nombres, 3 DNI, 4 Fecha nac., 5 Deuda, 6 Seguro,
// 7 Enero, 8 Febrero, 9 Dcho Fed 1, 10 Marzo, 11 Dcho Fed 2, 12..20 meses, 21 ajuste
const MONTH_COLUMNS: Array<{ month: string; col: number }> = [
  { month: "2026-01", col: 7 },
  { month: "2026-02", col: 8 },
  { month: "2026-03", col: 10 },
  { month: "2026-04", col: 12 },
  { month: "2026-05", col: 13 },
  { month: "2026-06", col: 14 },
  { month: "2026-07", col: 15 },
  { month: "2026-08", col: 16 },
  { month: "2026-09", col: 17 },
  { month: "2026-10", col: 18 },
  { month: "2026-11", col: 19 },
  { month: "2026-12", col: 20 },
];

// Excepciones resueltas con el club: DNI viejo (mal cargado) -> DNI correcto
const DNI_CORRECTIONS: Record<string, string> = {
  "42929607": "46319310", // Telli Guillermo: 42929607 era de Vittor Gabriel
};

// DNIs en revisión: no se importan (errores de datos ajenos al club)
const BLOCKED = new Set(["54252180"]); // Quiroga Álvaro / Rodríguez Amadeo (C13)

// Etiquetas de cuerpo técnico en la columna "Cat."
const STAFF_RE = /\b(DT|AT|P\.?\s?F\.?|DEL|DELEG|DELEGADO|PROF|COORD|CUERPO|PREP|MASAJ|UTILERO)\b/i;

// ---------- helpers ----------
function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("text" in v && v.text) return v.text.toString();
    if ("richText" in v) return (v.richText ?? []).map((t: any) => t.text ?? "").join("");
    if ("result" in v && v.result) return v.result.toString();
    return "";
  }
  return v.toString();
}

function colorIsRed(argb?: string): boolean {
  if (!argb) return false;
  const hex = argb.replace("#", "").replace(/^FF/, "").toUpperCase();
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  return r > 150 && g < 100 && b < 100;
}

function rowIsRed(row: ExcelJS.Row): boolean {
  for (let c = 1; c <= 8; c++) {
    const fill = (row.getCell(c).fill as any)?.fgColor?.argb;
    if (fill && colorIsRed(fill)) return true;
  }
  return false;
}

function numToValue(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/[$\s]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const m = raw.trim().match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (!m) return null;
  return new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T00:00:00`);
}

// ---------- importación de cuotas ----------
async function upsertPayments(playerId: string, row: ExcelJS.Row) {
  for (const { month, col } of MONTH_COLUMNS) {
    const amount = numToValue(cellText(row.getCell(col)));
    if (amount === null) continue;
    const paid = amount > 0;
    await prisma.payment.upsert({
      where: { playerId_month: { playerId, month } },
      update: { amount, paid },
      create: { playerId, month, amount, paid, paidAt: paid ? new Date() : null },
    });
  }
}

// ---------- main ----------
const stats = { created: 0, updated: 0, red: 0, staff: 0, blocked: 0, linked: 0 };

async function processRow(teamId: string, row: ExcelJS.Row) {
  const lastName = cellText(row.getCell(2)).trim();
  const firstName = cellText(row.getCell(3)).trim();
  if (!lastName && !firstName && !cellText(row.getCell(4)).trim()) return;

  let document = cellText(row.getCell(4)).trim().replace(/[.\s-]/g, "");
  if (DNI_CORRECTIONS[document]) document = DNI_CORRECTIONS[document];
  if (!/^\d{6,8}$/.test(document)) return;
  if (BLOCKED.has(document)) { stats.blocked++; return; }

  const catRaw = cellText(row.getCell(1)).trim();
  const staff = STAFF_RE.test(catRaw);
  const role = staff ? catRaw.toUpperCase() : "JUGADOR";
  const red = rowIsRed(row);
  const birthDate = parseDate(cellText(row.getCell(5)));

  const existing = await prisma.player.findUnique({ where: { document } });
  if (existing) {
    await prisma.player.update({
      where: { id: existing.id },
      data: {
        lastName,
        firstName,
        birthDate: birthDate ?? existing.birthDate,
        status: existing.status === "ACTIVO" && red ? "DEUDA" : existing.status,
      },
    });
    stats.updated++;
  } else {
    await prisma.player.create({
      data: { document, lastName, firstName, birthDate, status: red ? "DEUDA" : "ACTIVO" },
    });
    stats.created++;
  }

  const player = await prisma.player.findUnique({ where: { document } });
  await prisma.playerTeam.upsert({
    where: { playerId_teamId: { playerId: player!.id, teamId } },
    update: { role, position: staff ? catRaw : null, jersey: staff ? null : null },
    create: { playerId: player!.id, teamId, role },
  });
  stats.linked++;

  if (staff) stats.staff++;
  if (red) stats.red++;

  await upsertPayments(player!.id, row);
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  const sheetNames = wb.worksheets.map((s) => s.name.trim());
  console.log("Hojas:", sheetNames.join(", "));

  for (const sheet of wb.worksheets) {
    const team = await prisma.team.findUnique({ where: { name: sheet.name.trim() } });
    if (!team) {
      console.warn(`  [!] Sin equipo para la hoja "${sheet.name.trim()}" — se salta`);
      continue;
    }
    let filas = 0;
    for (const row of sheet.getRows(2, sheet.rowCount - 1) ?? []) {
      const before = stats.linked;
      await processRow(team.id, row);
      if (stats.linked > before) filas++;
    }
    console.log(`  [${team.name}] ${filas} filas procesadas`);
  }

  console.log("\n=== RESUMEN ===");
  console.log(`→ Jugadores creados: ${stats.created}`);
  console.log(`→ Vínculos jugador-equipo: ${stats.linked}`);
  console.log(`→ Actualizados: ${stats.updated}`);
  console.log(`→ En rojo (deuda/estado): ${stats.red}`);
  console.log(`→ Cuerpo técnico (rol != JUGADOR): ${stats.staff}`);
  console.log(`→ Bloqueados por revisión: ${stats.blocked}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});