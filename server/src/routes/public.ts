import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { calcularDocumentos, aptoParaJugar, labelTipo } from "../lib/ficha.js";
import { buildSemana, currentWeekArg } from "../lib/poli.js";
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

  // Equipos donde la persona es JUGADOR (los vínculos de técnico/delegado
  // no definen cuota ni ficha). Si no juega en ninguno (puro técnico/DT),
  // la cuota NO aplica: un DT que pone su DNI no puede salir "en deuda".
  const equiposJugador = player.teams.filter((t) => t.role === "JUGADOR");
  if (equiposJugador.length === 0) {
    return res.json({
      id: player.id,
      fullName: `${player.firstName} ${player.lastName}`,
      teams: player.teams.map((t) => t.team.name),
      esTecnico: true,
      sinCuota: true,
      currentMonth: new Date().toISOString().slice(0, 7),
      isPaid: false,
      pendiente: false,
      deudor: false,
      puedeJugar: null,
      motivo: null,
      diasParaPagar: 0,
      lastPayment: null,
      unpaidMonths: [],
      totalDeuda: 0,
      fichas: [],
      fichasDetalle: { electro: null, ergo: null, fichaMedica: null },
    });
  }

  // Regla del club: cada jugador tiene un día límite (deadline) para pagar la
  // cuota del mes en curso (por defecto el 10). Desde el día siguiente sin
  // pagar → DEUDOR y sin permiso de jugar.
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // "YYYY-MM"
  const day = now.getDate();
  const deadline = player.deadline && player.deadline >= 1 && player.deadline <= 31 ? player.deadline : 10;
  // Solo cuentan los meses ≤ al actual (un registro futuro es un error de datos)
  const pagosHastaHoy = player.payments.filter((p) => p.month <= currentMonth);
  const currentPayment = pagosHastaHoy.find((p) => p.month === currentMonth);
  const pagoMesActual = currentPayment ? currentPayment.paid : false;

  // al día solo si pagó el mes en curso (independiente del día); deudas previas cuentan
  const unpaid = pagosHastaHoy.filter((p) => !p.paid && p.month < currentMonth);
  const totalDeuda = unpaid.reduce((acc, p) => acc + p.amount, 0);

  // vence el plazo en el día límite del jugador: del día siguiente sin pago del mes → deudor
  const periodoSinPagar = day > deadline && !pagoMesActual;
  const isPaid = pagoMesActual && unpaid.length === 0;
  const deudor = unpaid.length > 0 || periodoSinPagar;
  // Dentro del plazo (hasta el día límite) y todavía no pagó el mes en curso → pendiente
  const pendiente = !pagoMesActual && !deudor;
  const puedeJugarCuota = !deudor;

  // Fichas / estudios (regla por categoría: mayores → ergo, menores → electro).
  // Solo cuentan los equipos donde la persona es JUGADOR.
  const categoriasFicha = equiposJugador.map((t) => t.team.category);
  const ficha = calcularDocumentos(
    player.documentos,
    new Date(),
    categoriasFicha
  );
  const apto = aptoParaJugar(puedeJugarCuota, ficha);
  const motivo = apto.razones.map((r) => r.replace(/^cuota adeudada$/, "cuota del mes sin pagar")).join(", ");

  // Equipos donde juega (solo JUGADOR)
  const equiposVisibles = equiposJugador.map((t) => t.team.name);

  res.json({
    id: player.id,
    fullName: `${player.firstName} ${player.lastName}`,
    teams: equiposVisibles,
    currentMonth,
    isPaid,
    pendiente,
    deudor,
    puedeJugar: apto.puedeJugar,
    motivo: apto.puedeJugar ? null : motivo,
    diasParaPagar: deudor ? 0 : Math.max(0, deadline - day), // días restantes del plazo
    deadline, // día límite de pago del jugador
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
  const { end: finFindeActual } = weekendWindowArg(new Date());
  const [equipos, vínculos, partidos] = await Promise.all([
    prisma.team.count(),
    prisma.playerTeam.findMany({
      where: { role: "JUGADOR", player: { status: { not: "INACTIVO" } } },
      select: { playerId: true },
    }),
    // Partidos por jugar del finde en curso (los que no tienen resultado aún)
    prisma.match.count({
      where: {
        dateTime: { gte: new Date(Date.now() - 2 * 3_600_000), lte: finFindeActual },
        clubGoals: null,
      },
    }),
  ]);
  const jugadores = new Set(vínculos.map((v) => v.playerId)).size;
  res.json({ equipos, jugadores, partidosProximos: partidos });
});

// GET /api/public/schedule — cronograma de entrenamiento de la semana EN CURSO
// (lunes→domingo en hora ARG), con bloques y partidos del club. Sin auth:
// la idea es que todos vean dónde y cuándo entrena cada categoría.
router.get("/schedule", async (_req, res) => {
  const { from, to } = currentWeekArg();
  res.json(await buildSemana(from, to));
});

export default router;