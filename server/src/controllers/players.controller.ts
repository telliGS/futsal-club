import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { canAccessTeam } from "../middlewares/auth.js";
import { calcularEstadoCuota } from "../lib/cuota.js";
import { calcularDocumentos, MAX_DOC_BYTES, TipoDocumento, TIPOS_DOCUMENTO, aptoParaJugar, vencimientoPorRegla } from "../lib/ficha.js";
import { pagaCuotaEnEquipo, categoriasPagoJugador } from "../lib/nativo.js";
import { registrarAvisoSeguro } from "../lib/seguro.js";
import { registrarAvisoGym } from "../lib/gym.js";

const createPlayerSchema = z.object({
  document: z.string().min(6),
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  birthDate: z.string().optional().nullable(),
  hasInsurance: z.boolean().optional(),
  vaAlGym: z.boolean().optional(),
  gymPrecio: z.number().optional().nullable(),
  deadline: z.number().int().min(1).max(31).optional(),
  role: z.string().optional(),
  position: z.string().optional().nullable(),
  jersey: z.number().int().optional().nullable(),
  cuentaPresupuesto: z.boolean().optional(),
});

const cambiarPrimeraSchema = z.object({
  deTeamId: z.string().min(1),
  aTeamId: z.string().min(1),
  position: z.string().optional().nullable(),
  jersey: z.number().int().optional().nullable(),
  cuentaPresupuesto: z.boolean().optional(),
});

const statusSchema = z.object({
  status: z.enum(["ACTIVO", "INACTIVO"]),
  inactiveSince: z.string().optional().nullable(),
});

const updatePlayerSchema = z.object({
  lastName: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  birthDate: z.string().optional().nullable(),
  hasInsurance: z.boolean().optional(),
  vaAlGym: z.boolean().optional(),
  gymPrecio: z.number().optional().nullable(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
  deadline: z.number().int().min(1).max(31).optional(),
  role: z.string().optional(),
  position: z.string().optional().nullable(),
  jersey: z.number().int().optional().nullable(),
  cuentaPresupuesto: z.boolean().optional(),
});

const uploadDocSchema = z.object({
  tipo: z.enum(TIPOS_DOCUMENTO),
  descripcion: z.string().max(200).optional().nullable(),
  fileName: z.string().min(1).max(200),
  mime: z.string().min(1).max(100),
  dataBase64: z.string().min(1),
  fechaEmision: z.string().optional().nullable(),
  fechaVencimiento: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
});

async function checkPlayerAccess(req: Request, res: Response, playerId: string): Promise<boolean> {
  const links = await prisma.playerTeam.findMany({ where: { playerId } });
  for (const l of links) {
    if (!(await canAccessTeam(req.user!.id, l.teamId))) {
      res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
      return false;
    }
  }
  return true;
}

async function recalcularTrasPago(player: { id: string; status: string; deadline?: number | null }) {
  const payments = await prisma.payment.findMany({
    where: { playerId: player.id },
    orderBy: { month: "desc" },
    take: 24,
  });
  const estadoCuota = calcularEstadoCuota(payments, new Date(), { deadline: player.deadline ?? undefined });
  let nuevoStatus = player.status;
  if (estadoCuota.deudor) {
    nuevoStatus = "DEUDA";
  } else if (player.status === "DEUDA" || player.status === "ACTIVO") {
    nuevoStatus = "ACTIVO";
  }
  if (nuevoStatus !== player.status) {
    await prisma.player.update({ where: { id: player.id }, data: { status: nuevoStatus } });
  }
  return { estadoCuota, status: nuevoStatus };
}

async function canAccessPlayer(userId: string, playerId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "ADMIN") return true;
  const links = await prisma.playerTeam.findMany({ where: { playerId }, select: { teamId: true } });
  for (const l of links) {
    if (await canAccessTeam(userId, l.teamId)) return true;
  }
  return false;
}

async function categoriasDeJugador(playerId: string): Promise<string[]> {
  const teams = await prisma.team.findMany({
    where: { players: { some: { playerId } } },
    select: { category: true },
  });
  return teams.map((t) => t.category).filter(Boolean) as string[];
}

export const getTeamPlayers = async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { category: true, type: true } });
  const tipoEquipoActual = team?.type ?? null;

  const links = await prisma.playerTeam.findMany({
    where: { teamId },
    include: {
      player: {
        include: {
          payments: { orderBy: { month: "desc" }, take: 24 },
          gymPayments: { orderBy: { month: "desc" }, take: 24 },
          documentos: { select: { tipo: true, fechaVencimiento: true } },
          teams: { include: { team: { select: { name: true, type: true, category: true } } } },
        },
      },
    },
    orderBy: { player: { lastName: "asc" } },
  });

  res.json(
    links.map((l) => {
      const equiposJugador = l.player.teams.filter((t) => t.role === "JUGADOR");
      const categoriasFicha = (equiposJugador.length > 0 ? equiposJugador : l.player.teams)
        .map((t) => t.team.category);
      const congelado = l.player.status === "INACTIVO" && l.player.inactiveSince
        ? l.player.inactiveSince.toISOString().slice(0, 7)
        : undefined;
      const estadoCuota = calcularEstadoCuota(l.player.payments, new Date(), {
        congelarDesde: congelado,
        deadline: l.player.deadline,
      });
      const estadoFichas = calcularDocumentos(l.player.documentos, new Date(), categoriasFicha);
      const apto = aptoParaJugar(estadoCuota.puedeJugar, estadoFichas);
      const tiposEquipos = equiposJugador.map((t) => t.team.type);
      const nombresEquipos = equiposJugador.map((t) => t.team.name);
      const equiposLike = equiposJugador.map((t) => ({
        name: t.team.name,
        type: t.team.type,
        category: t.team.category,
      }));
      const esFormativos = equiposJugador.some((t) => t.team.type === "FORMATIVA");
      const pagaAca = pagaCuotaEnEquipo(equiposLike, tipoEquipoActual ?? "", team?.category ?? null);
      const categoriaPago = categoriasPagoJugador(equiposLike);
      return {
        id: l.player.id,
        lastName: l.player.lastName,
        firstName: l.player.firstName,
        document: l.player.document,
        birthDate: l.player.birthDate,
        hasInsurance: l.player.hasInsurance,
        vaAlGym: l.player.vaAlGym,
        gymPrecio: l.player.gymPrecio,
        deadline: l.player.deadline,
        status: l.player.status,
        inactiveSince: l.player.inactiveSince,
        role: l.role,
        position: l.position,
        jersey: l.jersey,
        cuentaPresupuesto: l.cuentaPresupuesto,
        esFormativos,
        pagaAca,
        categoriaPago,
        payments: l.player.payments,
        gymPayments: l.player.gymPayments,
        estadoCuota,
        fichas: estadoFichas,
        apto,
      };
    })
  );
};

export const createPlayer = async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const parsed = createPlayerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });
  }
  const { document, lastName, firstName, birthDate, hasInsurance, vaAlGym, gymPrecio, deadline, role, position, jersey, cuentaPresupuesto } = parsed.data;

  let player = await prisma.player.findUnique({ where: { document } });
  const esNuevo = !player;
  if (!player) {
    player = await prisma.player.create({
      data: {
        document,
        lastName,
        firstName,
        birthDate: birthDate ? new Date(birthDate) : null,
        hasInsurance: hasInsurance ?? false,
        vaAlGym: vaAlGym ?? false,
        gymPrecio: gymPrecio ?? null,
        deadline: deadline ?? 10,
      },
    });
  }
  const rol = (role ?? "JUGADOR") as string;
  if (rol === "JUGADOR") {
    const destTeam = await prisma.team.findUnique({
      where: { id: teamId },
      select: { type: true },
    });
    if (destTeam?.type === "PRIMERA" && player) {
      const otraPrimera = await prisma.playerTeam.findFirst({
        where: {
          playerId: player.id,
          role: "JUGADOR",
          teamId: { not: teamId },
          team: { type: "PRIMERA" },
        },
        include: { team: { select: { id: true, name: true } } },
      });
      if (otraPrimera) {
        return res.status(409).json({
          error: `Este jugador ya es JUGADOR en ${otraPrimera.team.name}. Un jugador no puede estar en dos equipos de primera.`,
          code: "CAMBIO_PRIMERA",
          playerId: player.id,
          equipoActual: { id: otraPrimera.team.id, name: otraPrimera.team.name },
        });
      }
    }
  }
  await prisma.playerTeam.upsert({
    where: { playerId_teamId: { playerId: player.id, teamId } },
    update: { role: role ?? "JUGADOR", position, jersey, cuentaPresupuesto: cuentaPresupuesto ?? undefined },
    create: { playerId: player.id, teamId, role: role ?? "JUGADOR", position, jersey, cuentaPresupuesto: cuentaPresupuesto ?? true },
  });

  if (esNuevo) {
    await registrarAvisoSeguro({
      playerId: player.id,
      tipo: "ALTA",
      creadoPorId: req.user!.id,
      teamId,
    });
  }
  if (esNuevo && vaAlGym) {
    await registrarAvisoGym({ playerId: player.id, tipo: "ALTA", creadoPorId: req.user!.id, teamId });
  }

  res.status(201).json(player);
};

export const cambiarPrimera = async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = cambiarPrimeraSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });
  }
  const { deTeamId, aTeamId, position, jersey, cuentaPresupuesto } = parsed.data;
  if (deTeamId === aTeamId) return res.status(400).json({ success: false, error: "El jugador ya está en ese equipo" });

  const origen = await prisma.playerTeam.findFirst({
    where: { playerId: id, role: "JUGADOR", teamId: deTeamId },
  });
  if (!origen) {
    return res.status(400).json({ success: false, error: "El jugador no es JUGADOR en el equipo de origen" });
  }

  await prisma.$transaction([
    prisma.playerTeam.deleteMany({
      where: { playerId: id, teamId: deTeamId, role: "JUGADOR" },
    }),
    prisma.playerTeam.upsert({
      where: { playerId_teamId: { playerId: id, teamId: aTeamId } },
      update: { role: "JUGADOR", position, jersey, cuentaPresupuesto: cuentaPresupuesto ?? undefined },
      create: { playerId: id, teamId: aTeamId, role: "JUGADOR", position, jersey, cuentaPresupuesto: cuentaPresupuesto ?? true },
    }),
  ]);

  res.json({ ok: true });
};

export const getByDocument = async (req: Request, res: Response) => {
  const document = String(req.query.document ?? "").replace(/\D/g, "");
  if (!document) return res.json({ found: false });
  const player = await prisma.player.findUnique({
    where: { document },
    include: { teams: { include: { team: { select: { name: true, type: true } } } } },
  });
  if (!player) return res.json({ found: false });

  let acceso = false;
  for (const t of player.teams) {
    if (await canAccessTeam(req.user!.id, t.teamId)) {
      acceso = true;
      break;
    }
  }
  if (!acceso) return res.json({ found: false });

  res.json({
    found: true,
    player: {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      birthDate: player.birthDate,
      equipos: player.teams
        .filter((t) => t.role === "JUGADOR")
        .map((t) => ({ name: t.team.name, type: t.team.type })),
    },
  });
};

export const updateStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Status inválido", details: parsed.error.issues });
  }
  const { status: nuevo, inactiveSince } = parsed.data;

  const player = await prisma.player.findUnique({
    where: { id },
    include: { teams: { select: { teamId: true } }, payments: { orderBy: { month: "desc" }, take: 24 } },
  });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });

  if (nuevo === "INACTIVO") {
    let desde: Date;
    if (inactiveSince && /^\d{4}-\d{2}/.test(inactiveSince)) {
      const mesActual = new Date().toISOString().slice(0, 7);
      if (inactiveSince.slice(0, 7) > mesActual) {
        return res.status(400).json({ success: false, error: `El mes de corte no puede ser futuro (mes actual: ${mesActual})` });
      }
      desde = new Date(`${inactiveSince.slice(0, 7)}-01T00:00:00Z`);
    } else {
      desde = new Date();
    }
    await prisma.player.update({ where: { id }, data: { status: "INACTIVO", inactiveSince: desde } });
    if (player.status !== "INACTIVO") {
      await registrarAvisoSeguro({ playerId: id, tipo: "BAJA", creadoPorId: req.user!.id });
      if (player.vaAlGym) await registrarAvisoGym({ playerId: id, tipo: "BAJA", creadoPorId: req.user!.id });
    }
    const congelado = desde.toISOString().slice(0, 7);
    const estadoCuota = calcularEstadoCuota(player.payments, new Date(), {
      congelarDesde: congelado,
      deadline: player.deadline,
    });
    res.json({ ok: true, status: "INACTIVO", inactiveSince: desde, estadoCuota });
    return;
  }

  await prisma.player.update({ where: { id }, data: { status: "ACTIVO", inactiveSince: null } });
  const estadoCuota = calcularEstadoCuota(player.payments, new Date(), { deadline: player.deadline });
  const statusFinal = estadoCuota.deudor ? "DEUDA" : "ACTIVO";
  if (statusFinal === "DEUDA") {
    await prisma.player.update({ where: { id }, data: { status: "DEUDA" } });
  }
  if (player.status === "INACTIVO") {
    await registrarAvisoSeguro({ playerId: id, tipo: "ALTA", creadoPorId: req.user!.id });
    if (player.vaAlGym) await registrarAvisoGym({ playerId: id, tipo: "ALTA", creadoPorId: req.user!.id });
  }
  res.json({ ok: true, status: statusFinal, inactiveSince: null, estadoCuota });
};

export const updatePlayer = async (req: Request, res: Response) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });

  const links = await prisma.playerTeam.findMany({ where: { playerId: player.id } });
  let allowed = false;
  for (const l of links) {
    if (await canAccessTeam(req.user!.id, l.teamId)) {
      allowed = true;
      break;
    }
  }
  if (!allowed) return res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });

  const parsed = updatePlayerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Datos inválidos" });

  const { birthDate, role, position, jersey, cuentaPresupuesto, ...rest } = parsed.data;
  const nuevoStatus = rest.status as string | undefined;
  const updated = await prisma.player.update({
    where: { id: player.id },
    data: {
      ...rest,
      birthDate: birthDate ? new Date(birthDate) : birthDate === null ? null : undefined,
    },
  });

  if (nuevoStatus === "INACTIVO" && player.status !== "INACTIVO") {
    await registrarAvisoSeguro({ playerId: player.id, tipo: "BAJA", creadoPorId: req.user!.id });
    if (player.vaAlGym) await registrarAvisoGym({ playerId: player.id, tipo: "BAJA", creadoPorId: req.user!.id });
  } else if (nuevoStatus && nuevoStatus !== "INACTIVO" && player.status === "INACTIVO") {
    await registrarAvisoSeguro({ playerId: player.id, tipo: "ALTA", creadoPorId: req.user!.id });
    if (player.vaAlGym) await registrarAvisoGym({ playerId: player.id, tipo: "ALTA", creadoPorId: req.user!.id });
  }

  if (rest.vaAlGym !== undefined && rest.vaAlGym !== player.vaAlGym) {
    await registrarAvisoGym({
      playerId: player.id,
      tipo: rest.vaAlGym ? "ALTA" : "BAJA",
      creadoPorId: req.user!.id,
    });
  }

  if (role || position || jersey !== undefined || cuentaPresupuesto !== undefined) {
    const target = links.find((l) => l.teamId === req.body?.teamId) ?? links.find((l) => canAccessTeam(req.user!.id, l.teamId)) ?? links[0];
    if (target) {
      await prisma.playerTeam.update({
        where: { playerId_teamId: { playerId: player.id, teamId: target.teamId } },
        data: { role: role ?? undefined, position, jersey, cuentaPresupuesto },
      });
    }
  }
  res.json(updated);
};

export const deletePlayer = async (req: Request, res: Response) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });
  const links = await prisma.playerTeam.findMany({ where: { playerId: player.id } });
  for (const l of links) {
    if (!(await canAccessTeam(req.user!.id, l.teamId))) {
      return res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
    }
  }
  if (links.length === 1) {
    if (player.status !== "INACTIVO") {
      await registrarAvisoSeguro({
        playerId: player.id,
        tipo: "BAJA",
        creadoPorId: req.user!.id,
        teamId: links[0].teamId,
        snapshot: {
          document: player.document,
          lastName: player.lastName,
          firstName: player.firstName,
          birthDate: player.birthDate,
        },
      });
      if (player.vaAlGym) {
        await registrarAvisoGym({
          playerId: player.id,
          tipo: "BAJA",
          creadoPorId: req.user!.id,
          teamId: links[0].teamId,
          snapshot: {
            document: player.document,
            lastName: player.lastName,
            firstName: player.firstName,
            birthDate: player.birthDate,
          },
        });
      }
    }
    await prisma.player.delete({ where: { id: player.id } });
  } else {
    await prisma.playerTeam.delete({ where: { playerId_teamId: { playerId: player.id, teamId: links[0].teamId } } });
  }
  res.json({ ok: true });
};

export const createPayment = async (req: Request, res: Response) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });

  const { month } = req.params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ success: false, error: "Formato de mes inválido. Usá YYYY-MM" });
  }
  const mesActual = new Date().toISOString().slice(0, 7);
  if (month > mesActual) {
    return res.status(400).json({ success: false, error: `No se puede registrar el mes ${month}: todavía no llegó (mes actual: ${mesActual})` });
  }
  const paid = Boolean(req.body?.paid);
  const amount = typeof req.body?.amount === "number" ? req.body.amount : 0;
  const note = typeof req.body?.note === "string" && req.body.note.trim() ? req.body.note.trim() : null;

  const payment = await prisma.payment.upsert({
    where: { playerId_month: { playerId: player.id, month } },
    update: { paid, amount, note, paidAt: paid ? new Date() : null },
    create: { playerId: player.id, month, paid, amount, note, paidAt: paid ? new Date() : null },
  });

  const { estadoCuota, status } = await recalcularTrasPago(player);

  res.json({ payment, estadoCuota, status });
};

export const deletePayment = async (req: Request, res: Response) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });

  const { month } = req.params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ success: false, error: "Formato de mes inválido. Usá YYYY-MM" });
  }

  await prisma.payment.deleteMany({ where: { playerId: player.id, month } });

  const { estadoCuota, status } = await recalcularTrasPago(player);

  res.json({ removed: true, estadoCuota, status });
};

export const getPayments = async (req: Request, res: Response) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });
  const links = await prisma.playerTeam.findMany({ where: { playerId: player.id } });
  for (const l of links) {
    if (!(await canAccessTeam(req.user!.id, l.teamId))) {
      return res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
    }
  }
  const payments = await prisma.payment.findMany({
    where: { playerId: player.id },
    orderBy: { month: "desc" },
  });
  res.json(payments);
};

export const getDocuments = async (req: Request, res: Response) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });
  if (!(await canAccessPlayer(req.user!.id, player.id))) {
    return res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
  }
  const docs = await prisma.jugadorDocumento.findMany({
    where: { playerId: player.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, tipo: true, descripcion: true, fileName: true, mime: true,
      size: true, fechaEmision: true, fechaVencimiento: true, subidoPorId: true, createdAt: true,
    },
  });
  const categorias = await categoriasDeJugador(player.id);
  const estado = calcularDocumentos(docs.map((d) => ({ tipo: d.tipo, fechaVencimiento: d.fechaVencimiento })), new Date(), categorias);
  res.json({ documentos: docs, estado });
};

export const uploadDocument = async (req: Request, res: Response) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });
  if (!(await canAccessPlayer(req.user!.id, player.id))) {
    return res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
  }
  const parsed = uploadDocSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.issues });

  const { tipo, descripcion, fileName, mime, dataBase64, fechaEmision, fechaVencimiento, categoria } = parsed.data;
  const buf = Buffer.from(dataBase64, "base64");
  if (buf.length === 0) return res.status(400).json({ success: false, error: "El archivo está vacío" });
  if (buf.length > MAX_DOC_BYTES) {
    return res.status(400).json({ success: false, error: `El archivo supera el máximo de 2 MB (son ${(buf.length / 1024 / 1024).toFixed(1)} MB)` });
  }

  const emision = fechaEmision ? new Date(fechaEmision) : null;
  const vence =
    fechaVencimiento ? new Date(fechaVencimiento)
    : vencimientoPorRegla(tipo, emision, categoria);

  const doc = await prisma.jugadorDocumento.create({
    data: {
      playerId: player.id,
      tipo,
      descripcion: descripcion ?? null,
      fileName,
      mime,
      size: buf.length,
      data: buf,
      fechaEmision: emision,
      fechaVencimiento: vence,
      subidoPorId: req.user!.id,
    },
  });

  const docs = await prisma.jugadorDocumento.findMany({ where: { playerId: player.id }, select: { tipo: true, fechaVencimiento: true } });
  const categorias = await categoriasDeJugador(player.id);
  const estado = calcularDocumentos(docs, new Date(), categorias);
  res.status(201).json({ documento: { ...doc, data: undefined }, estado });
};

export const downloadDocument = async (req: Request, res: Response) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });
  if (!(await canAccessPlayer(req.user!.id, player.id))) {
    return res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
  }
  const doc = await prisma.jugadorDocumento.findUnique({ where: { id: req.params.docId } });
  if (!doc || doc.playerId !== player.id) return res.status(404).json({ success: false, error: "Documento no encontrado" });

  res.setHeader("Content-Type", doc.mime);
  res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName.replace(/[\\"]/g, "_")}"`);
  res.send(doc.data);
};

export const deleteDocument = async (req: Request, res: Response) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ success: false, error: "Jugador no encontrado" });
  if (!(await canAccessPlayer(req.user!.id, player.id))) {
    return res.status(403).json({ success: false, error: "No tenés acceso a este jugador" });
  }
  const doc = await prisma.jugadorDocumento.findFirst({ where: { id: req.params.docId, playerId: player.id } });
  if (!doc) return res.status(404).json({ success: false, error: "Documento no encontrado" });
  await prisma.jugadorDocumento.delete({ where: { id: doc.id } });
  res.json({ ok: true });
};
