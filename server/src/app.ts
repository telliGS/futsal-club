import express from "express";
import cors from "cors";
import { prisma } from "./config.js";
import authRoutes from "./routes/auth.js";
import teamRoutes from "./routes/teams.js";
import playerRoutes from "./routes/players.js";
import matchRoutes from "./routes/matches.js";
import publicRoutes from "./routes/public.js";

export const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api", playerRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/public", publicRoutes);

app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

export default app;