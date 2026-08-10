import { prisma } from "../config.js";

async function main() {
  const p = await prisma.player.findFirst({
    where: { firstName: { contains: "Guillermo" }, lastName: { contains: "Telli" } },
    include: { payments: { orderBy: { month: "asc" } } },
  });
  if (!p) {
    console.log("No encontrado");
    return;
  }
  console.log(`${p.firstName} ${p.lastName} (${p.document})`);
  for (const pay of p.payments) {
    console.log(`  -> ${pay.month} paid=${pay.paid} amount=${pay.amount}`);
  }
  // ¿Cuántos pagos futuros hay en toda la BD?
  const futuros = await prisma.payment.findMany({
    where: { month: { gt: "2026-08" }, paid: true },
    select: { month: true, player: { select: { firstName: true, lastName: true } } },
  });
  console.log(`\nPagos PAID en meses futuros (>2026-08): ${futuros.length}`);
  for (const f of futuros) {
    console.log(`  -> ${f.player.firstName} ${f.player.lastName}: ${f.month}`);
  }
}

main().finally(() => prisma.$disconnect());