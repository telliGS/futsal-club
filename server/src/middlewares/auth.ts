import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma, getJwtSecret } from "../config.js";

export interface IAuthUser {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "DELEGADO";
}

declare global {
  namespace Express {
    interface Request {
      user?: IAuthUser;
    }
  }
}

/** Extrae y valida el Bearer token, deja req.user */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Token requerido" });
  }
  try {
    const payload = jwt.verify(header.slice(7), getJwtSecret()) as IAuthUser;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Token inválido o expirado" });
  }
}

/** Solo admins (dueño del sistema) */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ success: false, error: "Acción reservada al administrador" });
  }
  next();
}

export function requireAdminOrDelegado(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === "ADMIN" || req.user?.role === "DELEGADO") {
    return next();
  }
  return res.status(403).json({ success: false, error: "Acción reservada al administrador o delegado" });
}

/** Verifica que un delegado tenga acceso a un equipo concreto */
export async function canAccessTeam(
  userId: string,
  teamId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.role === "ADMIN") return true;
  const access = await prisma.userTeamAccess.findFirst({
    where: { userId, teamId },
  });
  return Boolean(access);
}