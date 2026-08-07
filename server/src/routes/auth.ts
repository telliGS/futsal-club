import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma, getJwtSecret, JWT_EXPIRES_IN } from "../config.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Email o contraseña inválidos" });
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Credenciales incorrectas" });

  const token = jwt.sign(
    { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
  res.json({ token, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } });
});

// GET /api/auth/me — datos del usuario logueado + equipos asignados
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { teamAccess: { include: { team: true } } },
  });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    teams: user.teamAccess.map((a) => a.team),
  });
});

// (Admin) crea un delegado y le asigna equipos
const createDelegadoSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  teamIds: z.array(z.string()).min(1),
});

router.post("/delegados", requireAuth, requireAdmin, async (req, res) => {
  const parsed = createDelegadoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
  }
  const { fullName, email, password, teamIds } = parsed.data;
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash: hash,
        role: "DELEGADO",
        teamAccess: { create: teamIds.map((t) => ({ teamId: t })) },
      },
    });
    res.status(201).json({ id: user.id, fullName: user.fullName, email: user.email });
  } catch {
    res.status(409).json({ error: "Ese email ya existe" });
  }
});

// GET /api/auth/delegados — (admin) lista delegados con sus equipos
router.get("/delegados", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: "DELEGADO" },
    include: { teamAccess: { include: { team: true } } },
  });
  res.json(users.map((u) => ({ ...u, passwordHash: undefined })));
});

export default router;