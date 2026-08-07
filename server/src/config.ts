// Configuración central: carga .env y exporta las instancias compartidas
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export function getJwtSecret(): string {
  if (!process.env.JWT_SECRET) throw new Error("Falta JWT_SECRET en .env");
  return process.env.JWT_SECRET;
}

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "12h";
export const PORT = Number(process.env.PORT ?? 4000);