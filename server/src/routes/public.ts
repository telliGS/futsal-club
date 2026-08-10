import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { calcularDocumentos, aptoParaJugar, labelTipo } from "../lib/ficha.js";
import { weekendWindowArg } from "../lib/timbo.js";

const router = Router();

// GET /api/public/status?document=12345678
// Público: el jugador ingresa SU DNI y ve su estado (al día / deudor con detalle + fichas)
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
      documentos: { select: { tipo: true, fechaVencimiento: true } },
    },
  });
  if (!player) return res.status(404).json({ error: "No se encontró ningún jugador con ese DNI" });

  // Regla del club: la cuota se paga del 1 al 10 de cada mes.
  // Desde el día 11 sin pagar el mes en curso → DEUDOR y sin permiso de jugar.
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // "YYYY-MM"
  const day = now.getDate();
  // Solo cuentan los meses ≤ al actual (un registro futuro es un error de datos)
  const pagosHastaHoy = player.payments.filter((p) => p.month <= currentMonth);
  const currentPayment = pagosHastaHoy.find((p) => p.month === currentMonth);
  const pagoMesActual = currentPayment ? currentPayment.paid : false;

  // al día solo si pagó el mes en curso (independiente del día); deudas previas cuentan
  const unpaid = pagosHastaHoy.filter((p) => !p.paid && p.month < currentMonth);
  const totalDeuda = unpaid.reduce((acc, p) => acc + p.amount, 0);

  // vence el plazo el día 10: del día 11 en adelante sin pago del mes → deudor
  const periodoSinPagar = day > 10 && !pagoMesActual;
  const isPaid = pagoMesActual && unpaid.length === 0;
  const deudor = unpaid.length > 0 || periodoSinPagar;
  // Dentro del plazo (días 1-10) y todavía no pagó el mes en curso → pendiente
  const pendiente = !pagoMesActual && !deudor;
  const puedeJugarCuota = !deudor;

  // Fichas / estudios (regla por categoría: mayores → ergo, menores → electro).
  // Solo cuentan los equipos donde la persona es JUGADOR (los vínculos de
  // técnico/delegado no definen su cuota ni su ficha).
  const equiposJugador = player.teams.filter((t) => t.role === "JUGADOR");
  const categoriasFicha = equiposJugador.length > 0
    ? equiposJugador.map((t) => t.team.category)
    : player.teams.map((t) => t.team.category);
  const ficha = calcularDocumentos(
    player.documentos,
    new Date(),
    categoriasFicha
  );
  const apto = aptoParaJugar(puedeJugarCuota, ficha);
  const motivo = apto.razones.map((r) => r.replace(/^cuota adeudada$/, "cuota del mes sin pagar")).join(", ");

  // Equipos donde juega (solo JUGADOR): si no juega en ninguno (puro técnico),
  // mostramos sus equipos de todos modos para que el mensaje no quede vacío.
  const equiposVisibles = equiposJugador.length > 0
    ? equiposJugador
    : player.teams;

  res.json({
    id: player.id,
    fullName: `${player.firstName} ${player.lastName}`,
    teams: equiposVisibles.map((t) => t.team.name),
    currentMonth,
    isPaid,
    pendiente,
    deudor,
    puedeJugar: apto.puedeJugar,
    motivo: apto.puedeJugar ? null : motivo,
    diasParaPagar: deudor ? 0 : Math.max(0, 10 - day), // días restantes del plazo (1-10)
    lastPayment: pagosHastaHoy.find((p) => p.paid) ?? null,
    unpaidMonths: unpaid.map((p) => ({ month: p.month, amount: p.amount })),
    totalDeuda,
    fichas: ficha.resumen,
    fichasDetalle: {
      electro: ficha.porTipo.ELECTROCARDIOGRAMA,
      ergo: ficha.porTipo.ERGONOMETRIA,
      fichaMedica: ficha.porTipo.FICHA_MEDICA,
    },
  });
});

// GET /api/public/teams — lista las categorías del club (id/name/type; el id permite traer el fixture de cada una)
router.get("/teams", async (_req, res) => {
  const teams = await prisma.team.findMany({
    select: { id: true, name: true, type: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  res.json(teams);
});

// GET /api/public/stats — números del club para el home (datos agregados, sin datos personales)
router.get("/stats", async (_req, res) => {
  const { start, end } = weekendWindowArg(new Date());
  const [equipos, vínculos, partidos] = await Promise.all([
    prisma.team.count(),
    prisma.playerTeam.findMany({
      where: { role: "JUGADOR", player: { status: { not: "INACTIVO" } } },
      select: { playerId: true },
    }),
    // Solo los partidos aún por jugarse del finde en curso (misma ventana que el home)
    prisma.match.count({ where: { dateTime: { gte: new Date(), lte: end } } }),
  ]);
  const jugadores = new Set(vínculos.map((v) => v.playerId)).size;
  res.json({ equipos, jugadores, partidosProximos: partidos });
});

export default router;