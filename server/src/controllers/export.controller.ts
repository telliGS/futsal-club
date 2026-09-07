import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../config.js";
import { canAccessTeam } from "../middlewares/auth.js";
import { getTeamPlayersRows, getSeguroRows, getGymRows } from "../lib/listas.js";
import type { FilaSeguroCompleta, FilaGymCompleta, FilaCambio } from "../lib/listas.js";

function toExcel(filas: Array<Record<string, unknown>>, hoja: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Club José Hernández";
  const ws = wb.addWorksheet(hoja);
  if (filas.length === 0) return wb.xlsx.writeBuffer();
  const headers = Object.keys(filas[0]);
  ws.addRow(headers);
  filas.forEach((f) => ws.addRow(headers.map((h) => f[h])));
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF008F39" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return wb.xlsx.writeBuffer();
}

function safeName(s: string) {
  return s.replace(/[^\wÁÉÍÓÚáéíóúÑñüÜ 0-9-]/g, "").trim();
}

function sendXlsx(res: Response, buf: Awaited<ReturnType<typeof toExcel>>, fileName: string) {
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(buf);
}

// ---- Plantel (GET /api/teams/:teamId/export/players) ----
export const exportTeamPlayers = async (req: Request, res: Response) => {
  const teamId = req.params.teamId;
  const rows = await getTeamPlayersRows(teamId);
  const filas = rows.map((p, index) => {
    const estado =
      p.status === "INACTIVO"
        ? "Inactivo"
        : p.estadoCuota.deudor
          ? "Deudor"
          : p.estadoCuota.pendiente
            ? "Pendiente"
            : "Al día";
    return {
      "#": index + 1,
      "Apellido": p.lastName,
      "Nombre": p.firstName,
      "DNI": p.document,
      "Rol": p.role === "JUGADOR" ? "Jugador" : p.role,
      "Posición": p.position || "-",
      "Camiseta": p.jersey || "-",
      "Estado": estado,
      "Fichas": p.fichas.aptoFichas ? "OK" : "Sin fichas",
      "Deuda (meses)": p.estadoCuota.mesesDebe || 0,
    };
  });
  if (filas.length === 0) {
    return res.status(400).json({ success: false, error: "No hay jugadores para exportar" });
  }
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });
  const fecha = new Date().toISOString().slice(0, 10);
  sendXlsx(res, await toExcel(filas, "Jugadores"), `JH_${safeName(team?.name ?? "equipo")}_jugadores_${fecha}.xlsx`);
};

// ---- Seguro (GET /api/seguro/export) ----
export const exportSeguro = async (req: Request, res: Response) => {
  const scope = String(req.query.scope) === "teamId" ? "teamId" : "club";
  const tipo = req.query.tipo === "altas" || req.query.tipo === "bajas" ? req.query.tipo : "completa";
  const teamId = String(req.query.teamId ?? "");

  if (scope === "club" && req.user!.role !== "ADMIN") {
    return res.status(403).json({ success: false, error: "La lista del club completo es solo para administradores" });
  }
  if (scope === "teamId") {
    if (!teamId) return res.status(400).json({ success: false, error: "Falta el equipo (teamId)" });
    if (!(await canAccessTeam(req.user!.id, teamId))) {
      return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
    }
  }

  const rows = await getSeguroRows(scope, tipo, teamId);
  const filas =
    tipo === "completa"
      ? (rows as FilaSeguroCompleta[]).map((p) => ({
          "DNI": p.document,
          "Apellido": p.lastName,
          "Nombre": p.firstName,
          "Fecha nacimiento": p.birthDate ?? "",
          "Estado": p.estado === "ACTIVO" ? "Activo" : p.estado === "DEUDA" ? "Activo (debe)" : p.estado,
          "Equipos": p.equipos.join(", "),
        }))
      : (rows as FilaCambio[]).map((c) => ({
          "Cambio": c.tipo === "ALTA" ? "Alta" : "Baja",
          "Fecha": c.fecha,
          "DNI": c.document,
          "Apellido": c.lastName,
          "Nombre": c.firstName,
          "Fecha nacimiento": c.birthDate ?? "",
          "Equipo": c.equipo,
        }));
  if (filas.length === 0) {
    return res.status(400).json({ success: false, error: tipo === "completa" ? "No hay asegurados activos para exportar" : "No hay cambios de ese tipo pendientes" });
  }
  const hoja = tipo === "completa" ? "Asegurados" : tipo === "altas" ? "Altas" : "Bajas";
  const ambito = scope === "club" ? "Club" : "Equipo";
  const fecha = new Date().toISOString().slice(0, 10);
  sendXlsx(res, await toExcel(filas, hoja), `JH_Seguro_${ambito}_${hoja}_${fecha}.xlsx`);
};

// ---- Gym (GET /api/gym/export) ----
const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const exportGym = async (req: Request, res: Response) => {
  const scope = String(req.query.scope) === "teamId" ? "teamId" : "club";
  const tipo = req.query.tipo === "altas" || req.query.tipo === "bajas" ? req.query.tipo : "completa";
  const teamId = String(req.query.teamId ?? "");
  const rawMes = String(req.query.mes ?? "");
  const mes = MES_RE.test(rawMes) ? rawMes : new Date().toISOString().slice(0, 7);

  if (scope === "club" && req.user!.role !== "ADMIN") {
    return res.status(403).json({ success: false, error: "La lista del club completo es solo para administradores" });
  }
  if (scope === "teamId") {
    if (!teamId) return res.status(400).json({ success: false, error: "Falta el equipo (teamId)" });
    if (!(await canAccessTeam(req.user!.id, teamId))) {
      return res.status(403).json({ success: false, error: "No tenés acceso a este equipo" });
    }
  }

  const estadoGymLabel = (e: string) => (e === "PAGO" ? "Pagó" : e === "DEBE" ? "Debe" : "Pendiente");
  const estadoCuotaLabel = (e: string) => (e === "AL_DIA" ? "Al día" : e === "DEBE" ? "Debe" : "Pendiente");
  const rows = await getGymRows(scope, tipo, teamId, mes);
  const filas =
    tipo === "completa"
      ? (rows as FilaGymCompleta[]).map((p) => ({
          "DNI": p.document,
          "Apellido": p.lastName,
          "Nombre": p.firstName,
          "Fecha nacimiento": p.birthDate ?? "",
          "Equipos": p.equipos.join(", "),
          "Gym del mes": estadoGymLabel(p.gymEstado),
          "Monto gym": p.gymMonto > 0 ? "$" + p.gymMonto.toLocaleString("es-AR") : "",
          "Nota gym": p.gymNota ?? "",
          "Cuota del mes": estadoCuotaLabel(p.cuotaEstado),
          "Monto cuota": p.cuotaMonto > 0 ? "$" + p.cuotaMonto.toLocaleString("es-AR") : "",
        }))
      : (rows as FilaCambio[]).map((c) => ({
          "Cambio": c.tipo === "ALTA" ? "Alta" : "Baja",
          "Fecha": c.fecha,
          "DNI": c.document,
          "Apellido": c.lastName,
          "Nombre": c.firstName,
          "Fecha nacimiento": c.birthDate ?? "",
          "Equipo": c.equipo,
        }));
  if (filas.length === 0) {
    return res.status(400).json({ success: false, error: tipo === "completa" ? "No hay jugadores que vayan al gym para exportar" : "No hay cambios de ese tipo pendientes" });
  }
  const hoja = tipo === "completa" ? "Gym" : tipo === "altas" ? "Altas gym" : "Bajas gym";
  const ambito = scope === "club" ? "Club" : "Equipo";
  const fecha = new Date().toISOString().slice(0, 10);
  sendXlsx(res, await toExcel(filas, hoja), `JH_Gym_${ambito}_${hoja}_${mes}_${fecha}.xlsx`);
};