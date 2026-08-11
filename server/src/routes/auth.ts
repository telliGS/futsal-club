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

const updateCredentialsSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  currentPassword: z.string().min(1).optional(),
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

// PATCH /api/auth/me/credentials — el usuario cambia su propio email/contraseña
router.patch("/me/credentials", requireAuth, async (req, res) => {
  const parsed = updateCredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
  }

  const { email, password, currentPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

  if (password) {
    if (!currentPassword) {
      return res.status(400).json({ error: "Debes enviar la contraseña actual para cambiarla" });
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "La contraseña actual no es correcta" });
    }
  }

  if (email && email !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: "Ese email ya está en uso" });
    }
  }

  const nextEmail = email ?? user.email;
  const nextPasswordHash = password ? await bcrypt.hash(password, 10) : user.passwordHash;

  await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      email: nextEmail,
      passwordHash: nextPasswordHash,
    },
  });

  res.json({ ok: true, email: nextEmail });
});

// PATCH /api/auth/delegados/:id — (admin) actualiza email/contraseña/equipos de un delegado
router.patch("/delegados/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const parsed = z.object({
    fullName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    teamIds: z.array(z.string()).min(1).optional(),
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
  }

  const { fullName, email, password, teamIds } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "DELEGADO") {
    return res.status(404).json({ error: "Delegado no encontrado" });
  }

  if (email && email !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: "Ese email ya está en uso" });
    }
  }

  const hash = password ? await bcrypt.hash(password, 10) : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        fullName: fullName ?? user.fullName,
        email: email ?? user.email,
        passwordHash: hash ?? user.passwordHash,
      },
    });

    if (teamIds) {
      await tx.userTeamAccess.deleteMany({ where: { userId: id } });
      if (teamIds.length > 0) {
        await tx.userTeamAccess.createMany({
          data: teamIds.map((teamId) => ({ userId: id, teamId })),
        });
      }
    }
  });

  res.json({ ok: true });
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