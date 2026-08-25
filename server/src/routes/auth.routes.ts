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
    return res.status(400).json({ success: false, error: "Email o contraseña inválidos" });
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return res.status(401).json({ success: false, error: "Credenciales incorrectas" });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ success: false, error: "Credenciales incorrectas" });

  const token = jwt.sign(
    { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
  res.json({ token, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } });
});

// GET /api/auth/me — datos del usuario logueado + equipos asignados.
// El admin (cualquiera con role ADMIN) ve TODOS los equipos.
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { teamAccess: { include: { team: true } } },
  });
  if (!user) return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  const teams = user.role === "ADMIN"
    ? await prisma.team.findMany({ orderBy: { name: "asc" } })
    : user.teamAccess.map((a) => a.team);
  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    canChangeCredentials: user.canChangeCredentials,
    teams,
  });
});

// (Admin) crea un delegado o un admin secundario y le asigna equipos.
// role "ADMIN" → acceso a todo el club (no necesita equipos marcados).
const createDelegadoSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["DELEGADO", "ADMIN"]).optional().default("DELEGADO"),
  teamIds: z.array(z.string()).min(1).optional(),
});

router.post("/delegados", requireAuth, requireAdmin, async (req, res) => {
  const parsed = createDelegadoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });
  }
  const { fullName, email, password, role, teamIds } = parsed.data;
  if (role === "DELEGADO" && (!teamIds || teamIds.length === 0)) {
    return res.status(400).json({ success: false, error: "Asignale al menos un equipo al delegado" });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    // Admin → se le asignan TODOS los equipos (acceso a todo el club).
    // Delegado → solo los equipos marcados.
    const teamIdsFinal = role === "ADMIN"
      ? (await prisma.team.findMany({ select: { id: true } })).map((t) => t.id)
      : teamIds!;
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash: hash,
        role,
        teamAccess: { create: teamIdsFinal.map((teamId) => ({ teamId })) },
      },
    });
    res.status(201).json({ id: user.id, fullName: user.fullName, email: user.email, role: user.role });
  } catch {
    res.status(409).json({ success: false, error: "Ese email ya existe" });
  }
});

// PATCH /api/auth/me/credentials — el usuario cambia su propio email/contraseña
// Regla (11/08): cada delegado creado por el admin puede autocambiarse credenciales
// UNA sola vez (canChangeCredentials). Después, si quiere volver a cambiar, debe
// pedirlo al admin (PATCH /auth/delegados/:id). El admin (role ADMIN) no tiene límite.
router.patch("/me/credentials", requireAuth, async (req, res) => {
  const parsed = updateCredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });
  }

  const { email, password, currentPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ success: false, error: "Usuario no encontrado" });

  if (user.role !== "ADMIN" && !user.canChangeCredentials) {
    return res.status(403).json({
      error: "Ya usaste tu único cambio de credenciales. Pedile al administrador que lo haga.",
    });
  }

  if (password) {
    if (!currentPassword) {
      return res.status(400).json({ success: false, error: "Debes enviar la contraseña actual para cambiarla" });
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, error: "La contraseña actual no es correcta" });
    }
  }

  if (email && email !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ success: false, error: "Ese email ya está en uso" });
    }
  }

  const nextEmail = email ?? user.email;
  const nextPasswordHash = password ? await bcrypt.hash(password, 10) : user.passwordHash;

  await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      email: nextEmail,
      passwordHash: nextPasswordHash,
      // Si el delegado usó su único cambio, lo marcamos como usado.
      canChangeCredentials: user.role === "ADMIN" ? user.canChangeCredentials : false,
    },
  });

  res.json({ ok: true, email: nextEmail, canChangeCredentials: user.role === "ADMIN" });
});

// PATCH /api/auth/delegados/:id — (admin) actualiza email/contraseña/equipos/rol de un delegado o admin secundario
router.patch("/delegados/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const parsed = z.object({
    fullName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.enum(["DELEGADO", "ADMIN"]).optional(),
    teamIds: z.array(z.string()).min(1).optional(),
    active: z.boolean().optional(),
    // Reactiva el cambio de credenciales del delegado (si pidió un segundo cambio).
    canChangeCredentials: z.boolean().optional(),
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });
  }

  const { fullName, email, password, role, teamIds, active, canChangeCredentials } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  }
  if (user.role === "ADMIN" && user.id === req.user!.id) {
    return res.status(400).json({ success: false, error: "No podés modificar tu propia cuenta de administrador" });
  }

  if (email && email !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ success: false, error: "Ese email ya está en uso" });
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
        role: role ?? user.role,
        active: active ?? user.active,
        canChangeCredentials: canChangeCredentials ?? user.canChangeCredentials,
      },
    });

    if (teamIds || role) {
      // Admin → acceso a todos los equipos; delegado → los marcados.
      const equipoFinal = (role === "ADMIN" || user.role === "ADMIN") && role !== "DELEGADO"
        ? (await tx.team.findMany({ select: { id: true } })).map((t) => t.id)
        : teamIds;
      if (equipoFinal) {
        await tx.userTeamAccess.deleteMany({ where: { userId: id } });
        await tx.userTeamAccess.createMany({
          data: equipoFinal.map((teamId) => ({ userId: id, teamId })),
        });
      }
    }
  });

  res.json({ ok: true });
});

// GET /api/auth/delegados — (admin) lista delegados y admins secundarios con sus equipos
router.get("/delegados", requireAuth, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ["DELEGADO", "ADMIN"] },
      // el admin logueado no se lista a sí mismo
      id: { not: req.user!.id },
    },
    include: { teamAccess: { include: { team: true } } },
  });
  res.json(users.map((u) => ({ ...u, passwordHash: undefined })));
});

// DELETE /api/auth/delegados — (admin) elimina TODOS los delegados (deja solo los admins)
router.delete("/delegados", requireAuth, requireAdmin, async (_req, res) => {
  const { count } = await prisma.user.deleteMany({ where: { role: "DELEGADO" } });
  res.json({ ok: true, eliminados: count });
});

// DELETE /api/auth/delegados/:id — (admin) elimina un delegado o admin secundario
router.delete("/delegados/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || (user.role !== "DELEGADO" && user.role !== "ADMIN")) {
    return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  }
  if (user.id === req.user!.id) {
    return res.status(400).json({ success: false, error: "No podés eliminar tu propia cuenta de administrador" });
  }
  // userTeamAccess se borra en cascada (relación onDelete: Cascade)
  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;