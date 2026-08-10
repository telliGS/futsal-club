import { prisma } from "../config.js";

// Limpia pagos registrados en meses futuros (no pueden existir: no se pagó
// un mes que todavía no llegó). Ejecutar tras confirmar el mes actual.

async function main() {
  const ahora = new Date();
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  console.log(`Mes actual: ${mesActual}`);

  const del = await prisma.payment.deleteMany({
    where: { month: { gt: mesActual } },
  });
  console.log(`Pagos futuros eliminados: ${del.count}`);
}

main().finally(() => prisma.$disconnect());