import express from "express";
import cors from "cors";
import { prisma } from "./config.js";
import authRoutes from "./routes/auth.js";
import teamRoutes from "./routes/teams.js";
import importRoutes from "./routes/import.js";
import playerRoutes from "./routes/players.js";
import matchRoutes from "./routes/matches.js";
import syncRoutes from "./routes/sync.js";
import publicRoutes from "./routes/public.js";

export const app = express();
app.use(cors());
// Límite ampliado: los documentos (base64 de PDFs/fotos, hasta 2 MB) y los
// xlsx de importación (hasta 5 MB) viajan como JSON. 10 MB cubre el peor caso
// con margen. El default de Express (100 KB) rompía las subidas con 413.
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/teams", importRoutes);
app.use("/api", playerRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/public", publicRoutes);

app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

export default app;