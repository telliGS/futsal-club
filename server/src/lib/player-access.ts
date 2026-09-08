import { Request, Response } from "express";
import { prisma } from "../config.js";
import { canAccessTeam } from "../middlewares/auth.js";

// ¿El usuario puede operar sobre este jugador? ADMIN siempre; si no, alcanza
// con que tenga acceso a ALGUNO de los equipos a los que el jugador está
// vinculado (consistente con status, update, delete, payments y documentos).
export async function canAccessPlayer(userId: string, playerId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "ADMIN") return true;
  const links = await prisma.playerTeam.findMany({ where: { playerId }, select: { teamId: true } });
  for (const l of links) {
    if (await canAccessTeam(userId, l.teamId)) return true;
  }
  return false;
}

// Guardia para rutas: si el jugador no existe, no responde acá (el controller
// responde 404 "Jugador no encontrado", igual que el flujo actual). Si existe
// pero el usuario no tiene acceso, responde 403 y corta la cadena.
export async function assertPlayerAccess(
  req: Request,
  res: Response,
  playerId: string,
  mensaje = "No tenés acceso a este jugador",
): Promise<boolean> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return true;
  if (!(await canAccessPlayer(req.user!.id, playerId))) {
    res.status(403).json({ success: false, error: mensaje });
    return false;
  }
  return true;
}