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

  // Estado: al día si pagó el MES EN CURSO (o es antes del mes en curso)
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // "YYYY-MM"
  const currentPayment = player.payments.find((p) => p.month === currentMonth);

  // Al día si pagó el mes actual; sin registro no hay deuda (aún no se cobró)
  const isPaid = currentPayment ? currentPayment.paid : true;

  const unpaid = player.payments.filter((p) => !p.paid && p.month < currentMonth);
  const totalDeuda = unpaid.reduce((acc, p) => acc + p.amount, 0);

  res.json({
    id: player.id,
    fullName: `${player.firstName} ${player.lastName}`,
    teams: player.teams.map((t) => t.team.name),
    currentMonth,
    isPaid,
    lastPayment: player.payments.find((p) => p.paid) ?? null,
    unpaidMonths: unpaid.map((p) => ({ month: p.month, amount: p.amount })),
    totalDeuda,
  });
});

export default router;