// Diagnóstico 2: lista los DNIs repetidos y clasifica cada aparición.
// El cuerpo técnico usa etiquetas especiales en la columna "Cat. Nativa"
// (DT, A.T., P.F., DEL, etc.), mientras los jugadores usan el nombre de la hoja.
// Uso: tsx src/scripts/analyze-dupes.ts
import ExcelJS from "exceljs";

const FILE = process.argv[2] ?? "C:\\Users\\Guille\\AppData\\Local\\Temp\\opencode\\cobros_jh.xlsx";

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

// etiquetas típicas de cuerpo técnico en la columna "Cat."
const STAFF_RE = /\b(DT|AT|P\.?\s?F\.?|DEL|DELEG|DELEGADO|PROF|COORD|CUERPO|TECNICO|PREP|MASAJ|UTILERO)\b/i;

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const map = new Map<string, Array<{ hoja: string; cat: string; apellido: string; nombre: string }>>();

  for (const sheet of wb.worksheets) {
    sheet.eachRow((row, n) => {
      if (n === 1) return;
      const apellido = cellText(row.getCell(2)).trim();
      const nombre = cellText(row.getCell(3)).trim();
      const dniRaw = cellText(row.getCell(4)).trim();
      const cat = cellText(row.getCell(1)).trim();
      if (!apellido && !nombre && !dniRaw) return;
      const dni = dniRaw.replace(/[.\s-]/g, "");
      if (!/^\d{6,8}$/.test(dni)) return;
      if (!map.has(dni)) map.set(dni, []);
      map.get(dni)!.push({ hoja: sheet.name.replace(/ /g, ""), cat, apellido: apellido.toUpperCase(), nombre: nombre.toUpperCase() });
    });
  }

  console.log("=== DNIs con más de una aparición ===");
  for (const [dni, apps] of map) {
    if (apps.length < 2) continue;
    const labels = apps.map((a) => {
      const isStaff = STAFF_RE.test(a.cat);
      return isStaff ? `${a.hoja}[${a.cat}✚]` : `${a.hoja}`;
    });
    const staffCount = apps.filter((a) => STAFF_RE.test(a.cat)).length;
    const first = apps[0];
    console.log(`${dni}  ${first.apellido} ${first.nombre}  (${apps.length} ap. | ${staffCount} técnico) -> ${labels.join(", ")}`);
  }
}

main().catch(console.error);