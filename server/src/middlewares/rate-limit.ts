import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

// Throttling para el login: frenar fuerza bruta sobre cuentas admin/delegados.
// En serverless el MemoryStore es por instancia (mejor que nada); una versión
// distribuida pediría un store compartido (Redis) si crece el tráfico.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) =>
    res.status(429).json({ success: false, error: "Demasiados intentos. Probá de nuevo en unos minutos." }),
});