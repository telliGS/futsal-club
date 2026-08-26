import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma, getJwtSecret, JWT_EXPIRES_IN } from "../config.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateCredentialsSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  currentPassword: z.string().min(1).optional(),
});

const createDelegadoSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["DELEGADO", "ADMIN"]).optional().default("DELEGADO"),
  teamIds: z.array(z.string()).min(1).optional(),
});

export const login = async (req: Request, res: Response) => {
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
};

export const getMe = async (req: Request, res: Response) => {
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
};

export const createDelegado = async (req: Request, res: Response) => {
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
};

export const updateCredentials = async (req: Request, res: Response) => {
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
      canChangeCredentials: user.role === "ADMIN" ? user.canChangeCredentials : false,
    },
  });

  res.json({ ok: true, email: nextEmail, canChangeCredentials: user.role === "ADMIN" });
};

export const updateDelegado = async (req: Request, res: Response) => {
  const id = req.params.id;
  const parsed = z.object({
    fullName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.enum(["DELEGADO", "ADMIN"]).optional(),
    teamIds: z.array(z.string()).min(1).optional(),
    active: z.boolean().optional(),
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
};

export const getDelegados = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ["DELEGADO", "ADMIN"] },
      id: { not: req.user!.id },
    },
    include: { teamAccess: { include: { team: true } } },
  });
  res.json(users.map((u) => ({ ...u, passwordHash: undefined })));
};

export const deleteAllDelegados = async (_req: Request, res: Response) => {
  const { count } = await prisma.user.deleteMany({ where: { role: "DELEGADO" } });
  res.json({ ok: true, eliminados: count });
};

export const deleteDelegado = async (req: Request, res: Response) => {
  const id = req.params.id;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || (user.role !== "DELEGADO" && user.role !== "ADMIN")) {
    return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  }
  if (user.id === req.user!.id) {
    return res.status(400).json({ success: false, error: "No podés eliminar tu propia cuenta de administrador" });
  }
  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
};
