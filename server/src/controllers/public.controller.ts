import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { calcularDocumentos, aptoParaJugar } from "../lib/ficha.js";
import { buildSemana, currentWeekArg } from "../lib/poli.js";
import { weekendWindowArg } from "../lib/timbo.js";

export const getStatus = async (req: Request, res: Response) => {
  const schema = z.object({ document: z.string().min(6) });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Ingresá un DNI válido" });
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
  if (!player) return res.status(404).json({ success: false, error: "No se encontró ningún jugador con ese DNI" });

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

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const day = now.getDate();
  const deadline = player.deadline && player.deadline >= 1 && player.deadline <= 31 ? player.deadline : 10;
  const pagosHastaHoy = player.payments.filter((p) => p.month <= currentMonth);
  const currentPayment = pagosHastaHoy.find((p) => p.month === currentMonth);
  const pagoMesActual = currentPayment ? currentPayment.paid : false;

  const unpaid = pagosHastaHoy.filter((p) => !p.paid && p.month < currentMonth);
  const totalDeuda = unpaid.reduce((acc, p) => acc + p.amount, 0);

  const periodoSinPagar = day > deadline && !pagoMesActual;
  const isPaid = pagoMesActual && unpaid.length === 0;
  const deudor = unpaid.length > 0 || periodoSinPagar;
  const pendiente = !pagoMesActual && !deudor;
  const puedeJugarCuota = !deudor;

  const categoriasFicha = equiposJugador.map((t) => t.team.category);
  const ficha = calcularDocumentos(
    player.documentos,
    new Date(),
    categoriasFicha
  );
  const apto = aptoParaJugar(puedeJugarCuota, ficha);
  const motivo = apto.razones.map((r) => r.replace(/^cuota adeudada$/, "cuota del mes sin pagar")).join(", ");

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
    diasParaPagar: deudor ? 0 : Math.max(0, deadline - day),
    deadline,
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
};

export const getTeamsList = async (_req: Request, res: Response) => {
  const teams = await prisma.team.findMany({
    select: { id: true, name: true, type: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  res.json(teams);
};

export const getStats = async (_req: Request, res: Response) => {
  const { end: finFindeActual } = weekendWindowArg(new Date());
  const now = new Date();
  const FIN_MATCH_MS = 90 * 60_000;
  const [equipos, vínculos, partidos] = await Promise.all([
    prisma.team.count(),
    prisma.playerTeam.findMany({
      where: { role: "JUGADOR", player: { status: { not: "INACTIVO" } } },
      select: { playerId: true },
    }),
    prisma.match.count({
      where: {
        dateTime: { gte: new Date(now.getTime() - FIN_MATCH_MS), lte: finFindeActual },
        clubGoals: null,
      },
    }),
  ]);
  const jugadores = new Set(vínculos.map((v) => v.playerId)).size;
  res.json({ equipos, jugadores, partidosProximos: partidos });
};

export const getSchedule = async (_req: Request, res: Response) => {
  const { from, to } = currentWeekArg();
  res.json(await buildSemana(from, to));
};
