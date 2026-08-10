// Consulta a Lorenzo Frutos (DNI 54839312) para saber si es real o de prueba.
import "dotenv/config";
import { prisma } from "../config.js";

async function main() {
  const p = await prisma.player.findUnique({
    where: { document: "54839312" },
    include: {
      teams: {
        include: { team: { select: { id: true, name: true } } },
      },
      payments: { select: { month: true, paid: true } },
      documentos: { select: { tipo: true, fileName: true } },
    },
  });
  if (!p) {
    console.log("NO EXISTE el DNI 54839312");
    return;
  }
  console.log(`ID: ${p.id}`);
  console.log(`Nombre: ${p.firstName} ${p.lastName}`);
  console.log(`birthDate: ${p.birthDate?.toISOString().slice(0, 10) ?? "null"}`);
  console.log(`status: ${p.status}`);
  console.log(`hasInsurance: ${p.hasInsurance}`);
  console.log(`Equipos (links):`);
  for (const l of p.teams) {
    console.log(`  - ${l.team.name} | rol=${l.role} pos=${l.position ?? "-"} num=${l.jersey ?? "-"} cuentaPresupuesto=${l.cuentaPresupuesto}`);
  }
  console.log(`Payments (${p.payments.length}): ${p.payments.map((pm) => `${pm.month}=${pm.paid ? "pagado" : "no"}`).join(", ") || "ninguno"}`);
  console.log(`Documentos (${p.documentos.length}): ${p.documentos.map((d) => `${d.tipo}:${d.fileName}`).join(", ") || "ninguno"}`);
}

main().catch((e) => { console.error(e); process.exit(1); });