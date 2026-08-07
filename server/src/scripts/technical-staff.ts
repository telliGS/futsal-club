// Mapa de cuerpo técnico por hoja: lee del XLSX la columna "Cat. Nativa"
// y extrae las filas D.T./A.T./P.F./DEL con la persona asignada.
// Uso: tsx src/scripts/technical-staff.ts
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

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE); 

  for (const sheet of wb.worksheets) {
    const staffRows: string[] = [];
    sheet.eachRow((row, n) => {
      if (n === 1) return;
      const cat = cellText(row.getCell(1)).trim().toUpperCase();
      if (!cat) return;
      const apellido = cellText(row.getCell(2)).trim();
      const nombre = cellText(row.getCell(3)).trim();
      const dni = cellText(row.getCell(4)).trim();
      // solo marca de cuerpo técnico
      if (/^(D\.?T\.?|A\.?T\.?|P\.?F\.?|DEL|DT|AT|PF|DELEG|PROF|COORD)/.test(cat)) {
        staffRows.push(`${cat}\t${apellido} ${nombre}\t${dni}`);
      }
    });
    if (staffRows.length > 0) {
      console.log(`\n=== ${sheet.name.trim()} ===`);
      staffRows.forEach((s) => console.log(`  ${s}`));
    }
  }
}

main().catch(console.error);