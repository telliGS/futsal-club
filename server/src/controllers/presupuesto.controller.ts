import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { calcularPresupuesto } from "../lib/presupuesto.js";
import { pagaCuotaEnEquipo } from "../lib/nativo.js";
import { calcularEstadoCuota } from "../lib/cuota.js";

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const getPresupuesto = async (req: Request, res: Response) => {
  const fecha = new Date();
  const mes = (req.query.mes as string) || fecha.toISOString().slice(0, 7);

  const team = (await prisma.team.findUnique({
    where: { id: req.params.teamId },
    include: {
      gastosFijos: true,
      gastosExtra: { where: { mes } },
      players: {
        where: { role: "JUGADOR" },
        include: {
          player: {
            select: {
              status: true,
              payments: { select: { month: true, paid: true, amount: true } },
              teams: { include: { team: { select: { name: true, type: true, category: true } } } },
            },
          },
        },
      },
    },
  }))!;

  const vinculados = team.players.map((l) => ({
    ...l,
    equiposJugador: l.player.teams
      .filter((t) => t.role === "JUGADOR")
      .map((t) => ({ name: t.team.name, type: t.team.type, category: t.team.category })),
  }));
  const esEquipoFormativo = team.type === "FORMATIVA";
  const nativos = vinculados.filter(
    (l) => l.player.status !== "INACTIVO" && pagaCuotaEnEquipo(l.equiposJugador, esEquipoFormativo ? "FORMATIVA" : "PRIMERA", team.category)
  );
  const jugadores = nativos.filter((l) => l.cuentaPresupuesto).length;
  const gastosFijos = team.gastosFijos.reduce((a, g) => a + g.monto, 0);
  const gastosExtra = team.gastosExtra.reduce((a, g) => a + g.monto, 0);

  const resultado = calcularPresupuesto({
    jugadores,
    cuota: team.quota,
    gastosFijos,
    gastosExtra,
  });

  const recaudado = nativos
    .filter((l) => l.cuentaPresupuesto)
    .reduce(
      (a, l) => a + l.player.payments.filter((p) => p.month === mes && p.paid).reduce((s, p) => s + p.amount, 0),
      0
    );
  const faltaCobrar = Math.max(0, resultado.ingreso - recaudado);

  res.json({
    teamId: team.id,
    categoria: team.name,
    mes,
    jugadores,
    cuota: team.quota,
    jugadoresExcluidos: vinculados.length - nativos.length + (nativos.length - jugadores),
    gastosFijos: team.gastosFijos.sort((a, b) => a.nombre.localeCompare(b.nombre)),
    gastosExtra: team.gastosExtra,
    recaudado,
    faltaCobrar,
    resultado,
  });
};

export const updateQuota = async (req: Request, res: Response) => {
  const schema = z.object({
    quota: z.number().min(0).nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Ingresá un monto de cuota válido" });
  await prisma.team.update({
    where: { id: req.params.teamId },
    data: { quota: parsed.data.quota },
  });
  res.json({ ok: true, quota: parsed.data.quota });
};

export const createGastoFijo = async (req: Request, res: Response) => {
  const schema = z.object({
    nombre: z.string().min(1).max(60),
    monto: z.number().min(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Datos inválidos" });
  const g = await prisma.gastoFijo.create({
    data: { teamId: req.params.teamId, nombre: parsed.data.nombre.trim(), monto: parsed.data.monto },
  });
  res.status(201).json(g);
};

export const deleteGastoFijo = async (req: Request, res: Response) => {
  const exists = await prisma.gastoFijo.findFirst({
    where: { id: req.params.id, teamId: req.params.teamId },
  });
  if (!exists) return res.status(404).json({ success: false, error: "Gasto no encontrado" });
  await prisma.gastoFijo.delete({ where: { id: exists.id } });
  res.json({ ok: true });
};

export const createGastoExtra = async (req: Request, res: Response) => {
  const schema = z.object({
    mes: z.string().regex(MES_RE, "Mes inválido (formato YYYY-MM)"),
    nombre: z.string().min(1).max(60),
    monto: z.number().min(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Datos inválidos" });
  const g = await prisma.gastoExtra.create({
    data: { teamId: req.params.teamId, mes: parsed.data.mes, nombre: parsed.data.nombre.trim(), monto: parsed.data.monto },
  });
  res.status(201).json(g);
};

export const deleteGastoExtra = async (req: Request, res: Response) => {
  const exists = await prisma.gastoExtra.findFirst({
    where: { id: req.params.id, teamId: req.params.teamId },
  });
  if (!exists) return res.status(404).json({ success: false, error: "Gasto no encontrado" });
  await prisma.gastoExtra.delete({ where: { id: exists.id } });
  res.json({ ok: true });
};

export const getTotal = async (req: Request, res: Response) => {
  const fecha = new Date();
  const mes = (req.query.mes as string) || fecha.toISOString().slice(0, 7);

  const teams = await prisma.team.findMany({
    include: {
      gastosFijos: true,
      gastosExtra: { where: { mes } },
      players: {
        where: { role: "JUGADOR" },
        include: {
          player: {
            select: {
              status: true,
              deadline: true,
              payments: { select: { month: true, paid: true, amount: true } },
              teams: { include: { team: { select: { name: true, type: true, category: true } } } },
            },
          },
        },
      },
    },
  });

  const porEquipo = teams
    .map((t) => {
      const vinculados = t.players.map((l) => ({
        ...l,
        equiposJugador: l.player.teams
          .filter((x) => x.role === "JUGADOR")
          .map((x) => ({ name: x.team.name, type: x.team.type, category: x.team.category })),
      }));
      const pagantes = vinculados.filter(
        (l) =>
          l.player.status !== "INACTIVO" &&
          l.cuentaPresupuesto &&
          pagaCuotaEnEquipo(l.equiposJugador, t.type, t.category)
      );
      const cuota = t.quota ?? 0;
      const ingreso = pagantes.length * cuota;
      const gastosFijos = t.gastosFijos.reduce((a, g) => a + g.monto, 0);
      const gastosExtra = t.gastosExtra.reduce((a, g) => a + g.monto, 0);
      const gastos = gastosFijos + gastosExtra;
      const deuda = pagantes.reduce(
        (a, l) =>
          a +
          calcularEstadoCuota(l.player.payments, new Date(), { deadline: l.player.deadline }).mesesDebe *
            cuota,
        0
      );
      const recaudado = pagantes.reduce(
        (a, l) => a + l.player.payments.filter((p) => p.month === mes && p.paid).reduce((s, p) => s + p.amount, 0),
        0
      );
      const faltaCobrar = Math.max(0, ingreso - recaudado);
      const recaudadoPorMes: Record<string, number> = {};
      for (const l of pagantes) {
        for (const p of l.player.payments) {
          if (!p.paid || !p.month) continue;
          recaudadoPorMes[p.month] = (recaudadoPorMes[p.month] ?? 0) + p.amount;
        }
      }
      return {
        teamId: t.id,
        categoria: t.name,
        tipo: t.type,
        jugadores: pagantes.length,
        cuota,
        ingreso,
        recaudado,
        faltaCobrar,
        recaudadoPorMes,
        gastosFijos,
        gastosExtra,
        gastos,
        balance: ingreso - gastos,
        deuda,
      };
    })
    .sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === "FORMATIVA" ? -1 : 1;
      if (a.tipo === "FORMATIVA") return a.categoria.localeCompare(b.categoria, "es");
      const ordenPrimera: Record<string, number> = {
        "1ra Fem": 0,
        "JH C": 1,
        "JH NEGRO": 2,
        "JH ELITE": 3,
      };
      const ia = ordenPrimera[a.categoria] ?? 99;
      const ib = ordenPrimera[b.categoria] ?? 99;
      if (ia !== ib) return ia - ib;
      return a.categoria.localeCompare(b.categoria, "es");
    });

  const totales: { jugadores: number; ingreso: number; recaudado: number; gastos: number; deuda: number; balance: number; faltaCobrar: number } = porEquipo.reduce(
    (acc, e) => ({
      jugadores: acc.jugadores + e.jugadores,
      ingreso: acc.ingreso + e.ingreso,
      recaudado: acc.recaudado + e.recaudado,
      gastos: acc.gastos + e.gastos,
      deuda: acc.deuda + e.deuda,
      balance: acc.balance + e.balance,
      faltaCobrar: acc.faltaCobrar,
    }),
    { jugadores: 0, ingreso: 0, recaudado: 0, gastos: 0, deuda: 0, balance: 0, faltaCobrar: 0 }
  );
  totales.faltaCobrar = Math.max(0, totales.ingreso - totales.recaudado);

  const [anio] = mes.split("-");
  const mesElegido = parseInt(mes.split("-")[1], 10);
  const meses: string[] = [];
  for (let i = 1; i <= mesElegido; i++) {
    meses.push(`${anio}-${String(i).padStart(2, "0")}`);
  }
  const porMes: Array<{ mes: string; estimado: number; recaudado: number; acumulado: number }> = meses.map((m) => {
    const recaudado = porEquipo.reduce((a, e) => a + (e.recaudadoPorMes[m] ?? 0), 0);
    return { mes: m, estimado: totales.ingreso, recaudado, acumulado: 0 };
  });
  let acumulado = 0;
  for (const m of porMes) {
    acumulado += m.recaudado;
    m.acumulado = acumulado;
  }
  for (const e of porEquipo) {
    const { recaudadoPorMes: _, ...rest } = e as typeof e & { recaudadoPorMes?: unknown };
    Object.assign(e, rest);
  }

  const gymConfig = await prisma.gymConfig.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", precio: 0 },
  });
  const gymJugadores = await prisma.player.findMany({
    where: { vaAlGym: true, status: { not: "INACTIVO" } },
    select: {
      id: true,
      gymPrecio: true,
      gymPayments: { where: { month: mes }, select: { paid: true, amount: true } },
    },
  });
  const gymGasto = gymJugadores.reduce((a, p) => a + (p.gymPrecio ?? gymConfig.precio), 0);
  const gymRecaudado = gymJugadores.reduce(
    (a, p) => a + (p.gymPayments[0]?.paid ? p.gymPayments[0].amount : 0),
    0
  );
  const gym = {
    precio: gymConfig.precio,
    jugadores: gymJugadores.length,
    gasto: gymGasto,
    recaudado: gymRecaudado,
    faltaCobrar: Math.max(0, gymGasto - gymRecaudado),
  };

  res.json({ mes, porEquipo, totales, porMes, gym });
};
