// Diagnóstico del XLSX oficial: detecta filas en ROJO y DNIs duplicados.
// Uso: tsx src/scripts/analyze-xlsx.ts
// El rojo en el sheet significa (según el delegado): deudor o ya no juega.
import ExcelJS from "exceljs";

const FILE = process.argv[2] ?? "C:\\Users\\Guille\\AppData\\Local\\Temp\\opencode\\cobros_jh.xlsx";

function colorIsRed(argb?: string): boolean {
  if (!argb) return false;
  const hex = argb.replace("#", "").replace(/^FF/, "").toUpperCase();
  // rojos dominantes: R alto, G y B bajos
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  return r > 150 && g < 100 && b < 100; // rojo fuerte
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("text" in v && v.text) return v.text.toString();
    if ("richText" in v) return (v.richText ?? []).map((t: any) => t.text ?? "").join("");
    if ("result" in v && v.result) return v.result.toString();
    if ("hyperlinks" in v) return "";
    return "";
  }
  return v.toString();
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  console.log("Hojas:", wb.worksheets.map((s) => s.name).join(", "));

  const dnisSeen = new Map<string, string>(); // dni -> "hoja|Apellido"
  const dupes: string[] = [];
  let totalRed = 0;

  for (const sheet of wb.worksheets) {
    const oficialCol = sheet.getCell(1, 1).value?.toString() ?? "";
    if (!sheet.name.startsWith("C") && !sheet.name.includes("JH")) {
      console.log(`\n[${sheet.name}] ⏭️  hoja no jugador (${sheet.name})`);
      continue;
    }
    console.log(`\n=== Hoja: ${sheet.name} ===`);
    // buscar por fila: col1=Cat, col2=Apellido, col3=Nombre, col4=DNI
    const rows: { row: number; cat: string; apellido: string; nombre: string; dni: string; red: boolean }[] = [];
    sheet.eachRow((row, n) => {
      if (n === 1) return; // header
      const apellido = cellText(row.getCell(2));
      const nombre = cellText(row.getCell(3));
      const dni = cellText(row.getCell(4));
      const cat = cellText(row.getCell(1));
      if (!apellido && !nombre && !dni) return;

      // detectar rojo en cualquier celda de la fila de datos
      let red = false;
      for (let c = 1; c <= 8; c++) {
        const cell = row.getCell(c);
        const fill = cell.fill as any;
        if (fill?.fgColor?.argb && colorIsRed(fill.fgColor.argb)) { red = true; break; }
      }
      rows.push({ nombre, apellido, dni, cat, red, });
    });

    const redRows = rows.filter((r) => r.red);
    totalRed += redRows.length;
    console.log(`  filas totales: ${rows.length}, rojas: ${redRows.length}`);
    for (const r of redRows) {
      console.log(`   🔴 fila ${r.nombre ? "id" : ""} [${r.cat}] ${r.apellido} ${r.nombre} | DNI ${r.dni}`);
    }

    // duplicados
    for (const r of rows) {
      const dniClean = r.dni.replace(/[.\s-]/g, "");
      if (!/^\d{6,8}$/.test(dniClean)) continue;
      if (dnisSeen.has(dniClean)) {
        dupes.push(`${dniClean}: aparece en ${dnisSeen.get(dniClean)} y en ${sheet.name} (${r.apellido} ${r.nombre})`);
      } else {
        dnisSeen.set(dniClean, `${sheet.name} (${r.apellido} ${r.nombre})`);
      }
    }
  }

  console.log("\n================ RESUMEN ================");
  console.log(`Total filas con rojo: ${totalRed}`);
  console.log(`DNIs repetidos entre hojas: ${dupes.length}`);
  dupes.forEach((d) => console.log("  " + d));
}

main().catch(console.error);