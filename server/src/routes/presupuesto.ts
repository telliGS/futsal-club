import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { requireAuth, canAccessTeam } from "../middleware/auth.js";
import { calcularPresupuesto } from "../lib/presupuesto.js";

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
        include: { player: { select: { status: true } } },
      },
    },
  }))!;

  const jugadores = team.players.filter(
    (l) => l.player.status !== "INACTIVO" && l.cuentaPresupuesto
  ).length;
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
    jugadoresExcluidos: team.players.filter((l) => l.cuentaPresupuesto === false).length,
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

export default router;