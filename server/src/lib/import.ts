// ============================================================
// Plantilla Excel + importación masiva de jugadores
// ------------------------------------------------------------
// El delegado descarga la plantilla, completa filas (Apellido,
// Nombre, DNI...) y la vuelve a subir. El import es idempotente:
// el DNI es la clave — si el jugador ya existe, se actualiza y
// se vincula al equipo; si no, se crea.
// ============================================================

import ExcelJS from "exceljs";
import { prisma } from "../config.js";

export const HEADERS = [
  "Apellido",
  "Nombre",
  "DNI",
  "Fecha nacimiento (dd/mm/aaaa)",
  "Rol (JUGADOR/DT/AT/PF/DEL)",
  "Posición (solo jugador)",
  "N° camiseta",
  "Estado (ACTIVO/DEUDA/INACTIVO)",
] as const;

export const TEMPLATE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ImportResult {
  creados: number;
  actualizados: number;
  vinculados: number;
  ignoradas: number;
  errores: Array<{ fila: number; motivo: string }>;
}

/** Genera el workbook plantilla (hoja con headers + fila de ejemplo comentada). */
export async function buildTemplateWorkbook(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Jugadores");

  ws.columns = HEADERS.map((h) => ({ header: h, width: 26 }));

  // Header resaltado
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF068938" } };
    cell.alignment = { vertical: "middle" };
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];

  // Fila de ejemplo (se aclara que hay que borrarla al subir)
  const example = ws.addRow(["Pérez", "Juan", "12345678", "15/03/2008", "JUGADOR", "Ala", "10", "ACTIVO"]);
  example.eachCell((cell, c) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
    cell.font = { color: { argb: "FF555555" } };
    if (c === 1) cell.note = "Fila de ejemplo — borrala antes de cargar tus datos.";
  });

  // Hoja de instrucciones
  const wsHelp = wb.addWorksheet("Cómo cargar");
  wsHelp.columns = [{ width: 16 }, { width: 80 }];
  const ayuda = [
    ["Paso 1", "Completá una fila por persona del plantel (jugador o cuerpo técnico)."],
    ["Paso 2", "DNI: solo números (sin puntos ni guiones). Es la clave: si el jugador ya existe en otro equipo, se lo vincula acá."],
    ["Paso 3", "Fecha de nacimiento: dd/mm/aaaa (opcional)."],
    ["Paso 4", "Rol: dejá vacío o 'JUGADOR'. Técnico: DT, AT, PF, DEL, COORD, MASAJISTA..."],
    ["Paso 5", "Posición y N° de camiseta: solo para jugadores (opcional)."],
    ["Paso 6", "Estado (opcional): ACTIVO, DEUDA o INACTIVO. Si queda vacío se mantiene el estado actual."],
    ["Importante", "Borrá la fila de ejemplo antes de subir. Las filas sin DNI válido se ignoran."],
  ];
  ayuda.forEach(([k, v]) => {
    const r = wsHelp.addRow([k, v]);
    r.getCell(1).font = { bold: true };
  });
  wsHelp.views = [{ state: "frozen", ySplit: 1 }];
  return wb;
}

function text(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("text" in v && v.text) return v.text.toString();
    if ("result" in v && v.result !== null && v.result !== undefined) return v.result.toString();
    if ("richText" in v) return (v.richText ?? []).map((t: any) => t.text ?? "").join("");
    return "";
  }
  return v.toString();
}

/** "dt" -> "DT", "jugador" -> "JUGADOR" */
function normalizeKind(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/\s+/g, " ");
  if (!s || s === "JUGADOR" || s === "JUG" || s === "N" || s === "NO") return "JUGADOR";
  const alias: Record<string, string> = {
    "D.T": "DT", "D.T.": "DT", "ENTRENADOR": "DT", "TÉCNICO": "DT", "TECNICO": "DT",
    "A.T": "AT", "A.T.": "AT", "AYUDANTE": "AT",
    "P.F": "PF", "P.F.": "PF", "PREP": "PF", "PREPARADOR FISICO": "PF",
    "DELEGADO": "DEL", "DELEG": "DEL",
    "MASAJ": "MASAJISTA", "MASAJISTA": "MASAJISTA", "KINE": "KINESIOL",
    "UTILERO": "UTILERO", "COORD": "COORD", "COORDINADOR": "COORD", "PROF": "PROF",
  };
  return alias[s] ?? s;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T00:00:00`);
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(`${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}T00:00:00`);
  return null;
}

export interface ParsedFila {
  n: number;
  error?: string;
  apellido: string;
  nombre: string;
  dni: string;
  rol: string;
  posicion: string | null;
  jersey: number | null;
  fecha: Date | null;
  estado: string | null;
}

/** Parsea un buffer xlsx y devuelve filas normalizadas (skip del header y fila ejemplo). */
export async function parseWorkbook(buffer: Buffer): Promise<{ filas: ParsedFila[] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets[0];
  const filas: ParsedFila[] = [];

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const apellido = text(row.getCell(1)).trim();
    const nombre = text(row.getCell(2)).trim();
    const dniRaw = text(row.getCell(3)).trim().replace(/[.\s-]/g, "");
    const fechatoRaw = text(row.getCell(4)).trim();
    const rolRaw = text(row.getCell(5)).trim();
    const posRaw = text(row.getCell(6)).trim();
    const jerseyRaw = text(row.getCell(7)).trim();
    const estadoRaw = text(row.getCell(8)).trim();

    // fila vacía → skip
    if (!apellido && !nombre && !dniRaw) continue;
    // DNI inválido (incluye la fila de ejemplo) → se reporta como error, no se importa
    if (!/^\d{6,8}$/.test(dniRaw)) {
      filas.push({ n: i, error: "DNI inválido (6 a 8 dígitos)", apellido, nombre, dni: dniRaw, rol: normalizeKind(rolRaw), posicion: posRaw || null, jersey: null, fecha: null, estado: null });
      continue;
    }
    const fecha = parseDate(fechatoRaw);
    const jersey = jerseyRaw ? Number(jerseyRaw.replace(/\D/g, "")) || null : null;
    filas.push({
      n: i,
      apellido,
      nombre,
      dni: dniRaw,
      rol: normalizeKind(rolRaw),
      posicion: posRaw || null,
      jersey,
      fecha,
      estado: estadoRaw ? estadoRaw.trim().toUpperCase() : null,
    });
  }
  return { filas };
}

/** Importa el roster: upsert jugador por DNI + vinculo al equipo. Devuelve resumen. */
export async function importFila(teamId: string, f: { apellido: string; nombre: string; dni: string; rol: string; posicion: string | null; jersey: number | null; fecha: Date | null; estado: string | null }): Promise<void> {
  const estado = ["ACTIVO", "DEUDA", "INACTIVO"].includes(f.estado ?? "") ? f.estado! : undefined;

  const existing = await prisma.player.findUnique({ where: { document: f.dni } });
  if (existing) {
    await prisma.player.update({
      where: { id: existing.id },
      data: {
        lastName: f.apellido || existing.lastName,
        firstName: f.nombre || existing.firstName,
        birthDate: f.fecha ?? existing.birthDate,
        ...(estado ? { status: estado } : {}),
      },
    });
  } else {
    await prisma.player.create({
      data: {
        document: f.dni,
        lastName: f.apellido || f.dni,
        firstName: f.nombre || "",
        birthDate: f.fecha,
        status: estado ?? "ACTIVO",
      },
    });
  }

  const player = await prisma.player.findUnique({ where: { document: f.dni } });
  await prisma.playerTeam.upsert({
    where: { playerId_teamId: { playerId: player!.id, teamId } },
    update: {
      role: f.rol,
      position: f.rol !== "JUGADOR" ? f.posicion : f.posicion ?? null,
      jersey: f.jersey,
    },
    create: {
      playerId: player!.id,
      teamId,
      role: f.rol,
      position: f.posicion,
      jersey: f.jersey,
    },
  });
}