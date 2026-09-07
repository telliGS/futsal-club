import express from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "./config.js";
import authRoutes from "./routes/auth.routes.js";
import teamRoutes from "./routes/teams.routes.js";
import importRoutes from "./routes/import.routes.js";
import presupuestoRoutes from "./routes/presupuesto.routes.js";
import playerRoutes from "./routes/players.routes.js";
import matchRoutes from "./routes/matches.routes.js";
import syncRoutes from "./routes/sync.routes.js";
import publicRoutes from "./routes/public.routes.js";
import poliRoutes from "./routes/poli.routes.js";
import seguroRoutes from "./routes/seguro.routes.js";
import gymRoutes from "./routes/gym.routes.js";

export const app = express();
// Headers de seguridad (CSP off: este servidor solo sirve JSON/descargas, no HTML).
app.use(helmet({ contentSecurityPolicy: false }));
// CORS restringido: solo orígenes explícitos (dev local + front de producción).
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173,https://jh-futsal.vercel.app")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
// Límite ampliado: los documentos (base64 de PDFs/fotos, hasta 2 MB) y los
// xlsx de importación (hasta 5 MB) viajan como JSON. 10 MB cubre el peor caso
// con margen. El default de Express (100 KB) rompía las subidas con 413.
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/teams", importRoutes);
app.use("/api/teams", presupuestoRoutes);
app.use("/api", playerRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/poli", poliRoutes);
app.use("/api", seguroRoutes);
app.use("/api", gymRoutes);

app.use((_req, res) => res.status(404).json({ success: false, error: "Ruta no encontrada" }));

export default app;