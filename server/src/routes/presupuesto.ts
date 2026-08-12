import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { requireAuth, canAccessTeam } from "../middleware/auth.js";
import { calcularPresupuesto } from "../lib/presupuesto.js";
import { pagaCuotaEnEquipo } from "../lib/nativo.js";
import { calcularEstadoCuota } from "../lib/cuota.js";

const router = Router();

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

async function verificarAcceso(req: any, res: any): Promise<boolean> {
  const team = await prisma.team.findUnique({ where: { id: req.params.teamId } });
  if (!team) {
    res.status(404).json({ error: "Equipo no encontrado" });
    return false;
  }
  if (!(await canAccessTeam(req.user!.id, team.id))) {
    res.status(403).json({ error: "No tenés acceso a este equipo" });
    return false;
  }
  return true;
}

// GET /api/teams/:teamId/presupuesto?mes=YYYY-MM — resumen completo
router.get("/:teamId/presupuesto", requireAuth, async (req, res) => {
  if (!(await verificarAcceso(req, res))) return;

  const fecha = new Date();
  const mes = (req.query.mes as string) || fecha.toISOString().slice(0, 7);

  const team = (await prisma.team.findUnique({
    where: { id: req.params.teamId },
    include: {
      gastosFijos: true,
      gastosExtra: { where: { mes } },
      players: {
        where: { role: "JUGADOR" },
        include: { player: { select: { status: true, teams: { include: { team: { select: { name: true, type: true, category: true } } } } } } },
      },
    },
  }))!;

  // Jugadores nativos: los que NO tienen vínculo formativo como JUGADOR,
  // o cuyo equipo es formativo. Los vínculos técnicos (DT/AT/PF/DEL) no
  // cuentan: ej. Marcos Ruiz Diaz es técnico en C11/C13/C20 FEM pero juega
  // solo en JH NEGRO → paga acá.
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

  res.json({
    teamId: team.id,
    categoria: team.name,
    mes,
    jugadores,
    cuota: team.quota,
    jugadoresExcluidos: vinculados.length - nativos.length + (nativos.length - jugadores),
    gastosFijos: team.gastosFijos.sort((a, b) => a.nombre.localeCompare(b.nombre)),
    gastosExtra: team.gastosExtra,
    resultado,
  });
});

// PUT /api/teams/:teamId/quota — { quota: 30000 | null }
router.put("/:teamId/quota", requireAuth, async (req, res) => {
  if (!(await verificarAcceso(req, res))) return;
  const schema = z.object({
    quota: z.number().min(0).nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Ingresá un monto de cuota válido" });
  await prisma.team.update({
    where: { id: req.params.teamId },
    data: { quota: parsed.data.quota },
  });
  res.json({ ok: true, quota: parsed.data.quota });
});

// POST /api/teams/:teamId/gastos/fijos — { nombre, monto }
router.post("/:teamId/gastos/fijos", requireAuth, async (req, res) => {
  if (!(await verificarAcceso(req, res))) return;
  const schema = z.object({
    nombre: z.string().min(1).max(60),
    monto: z.number().min(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });
  const g = await prisma.gastoFijo.create({
    data: { teamId: req.params.teamId, nombre: parsed.data.nombre.trim(), monto: parsed.data.monto },
  });
  res.status(201).json(g);
});

// DELETE /api/teams/:teamId/gastos/fijos/:id
router.delete("/:teamId/gastos/fijos/:id", requireAuth, async (req, res) => {
  if (!(await verificarAcceso(req, res))) return;
  const exists = await prisma.gastoFijo.findFirst({
    where: { id: req.params.id, teamId: req.params.teamId },
  });
  if (!exists) return res.status(404).json({ error: "Gasto no encontrado" });
  await prisma.gastoFijo.delete({ where: { id: exists.id } });
  res.json({ ok: true });
});

// POST /api/teams/:teamId/gastos/extras — { mes, nombre, monto } (puntual de un mes)
router.post("/:teamId/gastos/extras", requireAuth, async (req, res) => {
  if (!(await verificarAcceso(req, res))) return;
  const schema = z.object({
    mes: z.string().regex(MES_RE, "Mes inválido (formato YYYY-MM)"),
    nombre: z.string().min(1).max(60),
    monto: z.number().min(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });
  const g = await prisma.gastoExtra.create({
    data: { teamId: req.params.teamId, mes: parsed.data.mes, nombre: parsed.data.nombre.trim(), monto: parsed.data.monto },
  });
  res.status(201).json(g);
});

// DELETE /api/teams/:teamId/gastos/extras/:id
router.delete("/:teamId/gastos/extras/:id", requireAuth, async (req, res) => {
  if (!(await verificarAcceso(req, res))) return;
  const exists = await prisma.gastoExtra.findFirst({
    where: { id: req.params.id, teamId: req.params.teamId },
  });
  if (!exists) return res.status(404).json({ error: "Gasto no encontrado" });
  await prisma.gastoExtra.delete({ where: { id: exists.id } });
  res.json({ ok: true });
});

// GET /api/teams/presupuesto/total — TOTAL del club (admin o delegado autenticado)
// Por equipo: jugadores que pagan (regla nativo), cuota, ingreso, gastos
// del mes, balance, deuda. Orden alfabético por categoría.
// Totales generales para discriminar dónde está la pérdida.
router.get("/presupuesto/total", requireAuth, async (req, res) => {
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
              payments: { select: { month: true, paid: true } },
              teams: { include: { team: { select: { name: true, type: true, category: true } } } },
            },
          },
        },
      },
    },
  });

  const porEquipo = teams
    .map((t) => {
      // Solo cuentan los vínculos donde la persona es JUGADOR
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
        (a, l) => a + calcularEstadoCuota(l.player.payments).mesesDebe * cuota,
        0
      );
      return {
        teamId: t.id,
        categoria: t.name,
        tipo: t.type,
        jugadores: pagantes.length,
        cuota,
        ingreso,
        gastosFijos,
        gastosExtra,
        gastos,
        balance: ingreso - gastos,
        deuda,
      };
    })
    .sort((a, b) => {
      // Formativa primero (C11 → C20...), luego PRIMERA
      if (a.tipo !== b.tipo) return a.tipo === "FORMATIVA" ? -1 : 1;
      if (a.tipo === "FORMATIVA") return a.categoria.localeCompare(b.categoria, "es");
      // PRIMERA: 1ra Fem, JH C + JH NEGRO (misma división), JH ELITE último (élite masculino)
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

  const totales = porEquipo.reduce(
    (acc, e) => ({
      jugadores: acc.jugadores + e.jugadores,
      ingreso: acc.ingreso + e.ingreso,
      gastos: acc.gastos + e.gastos,
      deuda: acc.deuda + e.deuda,
      balance: acc.balance + e.balance,
    }),
    { jugadores: 0, ingreso: 0, gastos: 0, deuda: 0, balance: 0 }
  );

  res.json({ mes, porEquipo, totales });
});

export default router;