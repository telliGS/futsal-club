import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config.js";

const router = Router();

// GET /api/public/status?document=12345678
// Público: el jugador ingresa SU DNI y ve su estado (al día / deudor con detalle)
router.get("/status", async (req, res) => {
  const schema = z.object({ document: z.string().min(6) });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Ingresá un DNI válido" });
  }
  const { document } = parsed.data;

  const player = await prisma.player.findFirst({
    where: { document: document.replace(/[.\s-]/g, "") },
    include: {
      teams: { include: { team: true } },
      payments: { orderBy: { month: "desc" } },
    },
  });
  if (!player) return res.status(404).json({ error: "No se encontró ningún jugador con ese DNI" });

  // Regla del club: la cuota se paga del 1 al 10 de cada mes.
  // Desde el día 11 sin pagar el mes en curso → DEUDOR y sin permiso de jugar.
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // "YYYY-MM"
  const day = now.getDate();
  const currentPayment = player.payments.find((p) => p.month === currentMonth);
  const pagoMesActual = currentPayment ? currentPayment.paid : false;

  // al día solo si pagó el mes en curso (independiente del día); deudas previas cuentan
  const unpaid = player.payments.filter((p) => !p.paid && p.month < currentMonth);
  const totalDeuda = unpaid.reduce((acc, p) => acc + p.amount, 0);

  // vence el plazo el día 10: del día 11 en adelante sin pago del mes → deudor
  const periodoSinPagar = day > 10 && !pagoMesActual;
  const isPaid = pagoMesActual && unpaid.length === 0;
  const deudor = unpaid.length > 0 || periodoSinPagar;
  const puedeJugar = !deudor;

  res.json({
    id: player.id,
    fullName: `${player.firstName} ${player.lastName}`,
    teams: player.teams.map((t) => t.team.name),
    currentMonth,
    isPaid,
    deudor,
    puedeJugar,
    diasParaPagar: deudor ? 0 : Math.max(0, 10 - day), // días restantes del plazo (1-10)
    lastPayment: player.payments.find((p) => p.paid) ?? null,
    unpaidMonths: unpaid.map((p) => ({ month: p.month, amount: p.amount })),
    totalDeuda,
  });
});

export default router;