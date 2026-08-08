// Prueba E2E del import: arma un xlsx con 3 filas (nuevo, existente, inválida)
// y lo sube al endpoint. Uso: tsx test-import.ts
import "dotenv/config";
import ExcelJS from "exceljs";
import { prisma } from "../config.js";

const API = "http://localhost:4000/api";

async function main() {
  // login
  const login = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@josehernandez.futbol", password: "admin1234" }),
  });
  const { token } = (await login.json()) as any;
  const me = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
  const teamId = (me as any).teams[0].id;
  const teamName = (me as any).teams[0].name;
  console.log(`Team: ${teamName} (${teamId})`);

  // buscar un jugador existente para probar el update
  const existing = await prisma.player.findFirst();
  console.log(`Existente de prueba: ${existing!.firstName} ${existing!.lastName} DNI=${existing!.document}`);

  // generar workbook igual a la plantilla
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Jugadores");
  ws.addRow(["Apellido", "Nombre", "DNI", "Fecha nacimiento (dd/mm/aaaa)", "Rol (JUGADOR/DT/AT/PF/DEL)", "Posición (solo jugador)", "N° camiseta", "Estado (ACTIVO/DEUDA/INACTIVO)"]);
  ws.addRow(["TESTNUEVO", "Uno", "99999999", "10/10/2010", "JUGADOR", "Cierre", "21", "ACTIVO"]);
  ws.addRow([existing!.lastName, existing!.firstName, existing!.document, "", "JUGADOR", "Ala", "5", ""]);
  ws.addRow(["TESTINVALIDO", "Dos", "abc123", "", "JUGADOR", "", "", ""]);
  const buf = await wb.xlsx.writeBuffer();
  const b64 = Buffer.from(buf as any).toString("base64");
  console.log(`Archivo base64: ${b64.length} chars`);

  const imp = await fetch(`${API}/teams/${teamId}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dataBase64: b64, fileName: "prueba.xlsx" }),
  });
  const result = await imp.json();
  console.log("IMPORT RESULT:", JSON.stringify(result, null, 2));

  // verificar jugador creado
  const created = await prisma.player.findUnique({ where: { document: "99999999" } });
  console.log("Creado:", created ? `${created.firstName} ${created.lastName} status=${created.status}` : "NO ENCONTRADO");

  // limpiar el jugador de prueba (liga playerTeam + player)
  if (created) {
    await prisma.playerTeam.deleteMany({ where: { playerId: created.id } });
    await prisma.player.delete({ where: { id: created.id } });
    console.log("Cleanup: borrado TESTNUEVO");
  }
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });