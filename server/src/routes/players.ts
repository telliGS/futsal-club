import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { requireAuth, canAccessTeam } from "../middleware/auth.js";
import { calcularEstadoCuota } from "../lib/cuota.js";
import { calcularDocumentos, MAX_DOC_BYTES, TipoDocumento, TIPOS_DOCUMENTO, aptoParaJugar, vencimientoPorRegla } from "../lib/ficha.js";
import { pagaCuotaEnEquipo, categoriasPagoJugador } from "../lib/nativo.js";

const router = Router();

// ---------- Jugadores de un equipo (delegado con acceso) ----------
// GET /api/teams/:teamId/players
router.get("/teams/:teamId/players", requireAuth, async (req, res) => {
  const { teamId } = req.params;
  const can = await canAccessTeam(req.user!.id, teamId);
  if (!can) return res.status(403).json({ error: "No tenés acceso a este equipo" });

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { category: true, type: true } });
  const tipoEquipoActual = team?.type ?? null;

  const links = await prisma.playerTeam.findMany({
    where: { teamId },
    include: {
      player: {
        include: {
          payments: { orderBy: { month: "desc" }, take: 24 },
          documentos: { select: { tipo: true, fechaVencimiento: true } },
          teams: { include: { team: { select: { name: true, type: true, category: true } } } },
        },
      },
    },
    orderBy: { player: { lastName: "asc" } },
  });

  res.json(
    links.map((l) => {
      // Regla de ficha del club: el documento que manda es el de la
      // categoría MENOR del jugador, valga para todos sus paneles
      // (C17 + C20 + PRIMERA → solo electro). Solo cuentan los
      // equipos donde la persona es JUGADOR (técnicos no definen ficha).
      const equiposJugador = l.player.teams.filter((t) => t.role === "JUGADOR");
      const categoriasFicha = (equiposJugador.length > 0 ? equiposJugador : l.player.teams)
        .map((t) => t.team.category);
      // INACTIVO: la deuda se congela en la fecha en que dejó de jugar
      // (no corre cuota durante el tiempo fuera; al volver se ve la deuda real)
      const congelado = l.player.status === "INACTIVO" && l.player.inactiveSince
        ? l.player.inactiveSince.toISOString().slice(0, 7)
        : undefined;
      const estadoCuota = calcularEstadoCuota(l.player.payments, new Date(), congelado ? { congelarDesde: congelado } : {});
      const estadoFichas = calcularDocumentos(l.player.documentos, new Date(), categoriasFicha);
      const apto = aptoParaJugar(estadoCuota.puedeJugar, estadoFichas);
      // Regla nativo/formativa: ¿dónde paga la cuota este jugador?
      // Solo importan los equipos donde la persona es JUGADOR (los
      // vínculos técnicos DT/AT/PF y de delegado NO cuentan: ej.
      // Marcos Ruiz Diaz es DEL/DT/PF en formativas pero JUGADOR
      // solo en JH NEGRO → paga acá).
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
        status: l.player.status,
        inactiveSince: l.player.inactiveSince,
        role: l.role,
        position: l.position,
        jersey: l.jersey,
        cuentaPresupuesto: l.cuentaPresupuesto,
        // formato: paga la cuota acá (true) o en su categoría formativa (false)
        esFormativos,
        pagaAca,
        categoriaPago,
        payments: l.player.payments,
        // regla de cuota: pago del 1 al 10; del 11 sin pagar = deudor, no juega
        estadoCuota,
        // ficha médica / estudios
        fichas: estadoFichas,
        apto,
      };
    })
  );
});

// ---------- Crear jugador (y vincularlo al equipo) ----------
const createPlayerSchema = z.object({
  document: z.string().min(6),
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  birthDate: z.string().optional().nullable(),
  hasInsurance: z.boolean().optional(),
  role: z.string().optional(),
  position: z.string().optional().nullable(),
  jersey: z.number().int().optional().nullable(),
  cuentaPresupuesto: z.boolean().optional(),
});

router.post("/teams/:teamId/players", requireAuth, async (req, res) => {
  const { teamId } = req.params;
  const can = await canAccessTeam(req.user!.id, teamId);
  if (!can) return res.status(403).json({ error: "No tenés acceso a este equipo" });

  const parsed = createPlayerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
  }
  const { document, lastName, firstName, birthDate, hasInsurance, role, position, jersey, cuentaPresupuesto } = parsed.data;

  // upsert jugador por DNI (si ya existe en otro equipo, solo se vincula)
  let player = await prisma.player.findUnique({ where: { document } });
  if (!player) {
    player = await prisma.player.create({
      data: {
        document,
        lastName,
        firstName,
        birthDate: birthDate ? new Date(birthDate) : null,
        hasInsurance: hasInsurance ?? false,
      },
    });
  }
  // REGLA: un jugador NO puede ser JUGADOR en dos equipos de PRIMERA.
  // Si el destino es PRIMERA y ya es JUGADOR en otra PRIMERA → 409 con
  // code CAMBIO_PRIMERA + datos (pide confirmación explícita en el panel);
  // solo el endpoint /players/:id/cambiar-primera permite moverlo.
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

  res.status(201).json(player);
});

// ---------- Mover jugador de una PRIMERA a otra ----------
// Confirmación explícita del caso CAMBIO_PRIMERA (409 del POST de alta):
// quita el vínculo JUGADOR del equipo origen y lo vincula al destino.
// Los datos del jugador (payments, documentos, fichas) viven en el Player
// y NO se pierden; solo cambia el vínculo de equipo.
const cambiarPrimeraSchema = z.object({
  deTeamId: z.string().min(1),
  aTeamId: z.string().min(1),
  position: z.string().optional().nullable(),
  jersey: z.number().int().optional().nullable(),
  cuentaPresupuesto: z.boolean().optional(),
});

router.post("/players/:id/cambiar-primera", requireAuth, async (req, res) => {
  const { id } = req.params;
  const parsed = cambiarPrimeraSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
  }
  const { deTeamId, aTeamId, position, jersey, cuentaPresupuesto } = parsed.data;
  if (deTeamId === aTeamId) return res.status(400).json({ error: "El jugador ya está en ese equipo" });

  const can = await canAccessTeam(req.user!.id, aTeamId);
  if (!can) return res.status(403).json({ error: "No tenés acceso a este equipo" });

  // coherente con el 409: el jugador debe ser JUGADOR en una PRIMERA distinta del destino
  const origen = await prisma.playerTeam.findFirst({
    where: { playerId: id, role: "JUGADOR", teamId: deTeamId },
  });
  if (!origen) {
    return res.status(400).json({ error: "El jugador no es JUGADOR en el equipo de origen" });
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
});

// GET /api/players/by-document?document=X — ¿el DNI ya está registrado?
// Para el alta: si existe, el POST solo VINCULA (no duplica). Devuelve
// datos básicos + equipos (solo rol JUGADOR) si el usuario tiene acceso
// a algún equipo del jugador (evita "pescar" planteles ajenos).
router.get("/players/by-document", requireAuth, async (req, res) => {
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
});

// ---------- Pasar a INACTIVO / REACTIVAR ----------
// INACTIVO: deja de contar en el presupuesto y la deuda se CONGELA en
// inactiveSince = hasta dónde jugó (no corre cuota mientras está fuera).
// REACTIVAR: se limpia el congelamiento y se recalcula la regla — si tenía
// deuda real queda DEUDA (sin apto) hasta ponerse al día; el panel avisa
// con los meses que debe.
const statusSchema = z.object({
  status: z.enum(["ACTIVO", "INACTIVO"]),
  inactiveSince: z.string().optional().nullable(), // "YYYY-MM" (o null)
});

router.patch("/players/:id/status", requireAuth, async (req, res) => {
  const { id } = req.params;
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Status inválido", details: parsed.error.issues });
  }
  const { status: nuevo, inactiveSince } = parsed.data;

  const player = await prisma.player.findUnique({
    where: { id },
    include: { teams: { select: { teamId: true } }, payments: { orderBy: { month: "desc" }, take: 24 } },
  });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });

  // acceso: cualquiera de los equipos donde está el jugador
  let acceso = false;
  for (const t of player.teams) {
    if (await canAccessTeam(req.user!.id, t.teamId)) {
      acceso = true;
      break;
    }
  }
  if (!acceso) return res.status(403).json({ error: "No tenés acceso a equipos de este jugador" });

  if (nuevo === "INACTIVO") {
    // hasta dónde jugó: el mes indicado (o si no, hoy) → primer día del mes
    let desde: Date;
    if (inactiveSince && /^\d{4}-\d{2}/.test(inactiveSince)) {
      const mesActual = new Date().toISOString().slice(0, 7);
      if (inactiveSince.slice(0, 7) > mesActual) {
        return res.status(400).json({ error: `El mes de corte no puede ser futuro (mes actual: ${mesActual})` });
      }
      desde = new Date(`${inactiveSince.slice(0, 7)}-01T00:00:00Z`);
    } else {
      desde = new Date();
    }
    await prisma.player.update({ where: { id }, data: { status: "INACTIVO", inactiveSince: desde } });
    const congelado = desde.toISOString().slice(0, 7);
    const estadoCuota = calcularEstadoCuota(player.payments, new Date(), { congelarDesde: congelado });
    res.json({ ok: true, status: "INACTIVO", inactiveSince: desde, estadoCuota });
    return;
  }

  // REACTIVAR: si debe meses (antes de irse) vuelve DEUDA → no puede jugar
  await prisma.player.update({ where: { id }, data: { status: "ACTIVO", inactiveSince: null } });
  const estadoCuota = calcularEstadoCuota(player.payments);
  const statusFinal = estadoCuota.deudor ? "DEUDA" : "ACTIVO";
  if (statusFinal === "DEUDA") {
    await prisma.player.update({ where: { id }, data: { status: "DEUDA" } });
  }
  res.json({ ok: true, status: statusFinal, inactiveSince: null, estadoCuota });
});

// ---------- Editar jugador ----------
const updatePlayerSchema = z.object({
  lastName: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  birthDate: z.string().optional().nullable(),
  hasInsurance: z.boolean().optional(),
  status: z.string().optional(), // ACTIVO | DEUDA | INACTIVO
  notes: z.string().optional().nullable(),
  role: z.string().optional(),
  position: z.string().optional().nullable(),
  jersey: z.number().int().optional().nullable(),
  cuentaPresupuesto: z.boolean().optional(),
});

// PATCH /api/players/:id  (body: datos del jugador + opcional teamId para rol/pos/n° del vínculo correcto)
router.patch("/players/:id", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });

  // verificar acceso por cualquiera de sus vínculos
  const links = await prisma.playerTeam.findMany({ where: { playerId: player.id } });
  let allowed = false;
  for (const l of links) {
    if (await canAccessTeam(req.user!.id, l.teamId)) {
      allowed = true;
      break;
    }
  }
  if (!allowed) return res.status(403).json({ error: "No tenés acceso a este jugador" });

  const parsed = updatePlayerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  const { birthDate, role, position, jersey, cuentaPresupuesto, ...rest } = parsed.data;
  const updated = await prisma.player.update({
    where: { id: player.id },
    data: {
      ...rest,
      birthDate: birthDate ? new Date(birthDate) : birthDate === null ? null : undefined,
    },
  });

  // rol/pos/número/cuentaPresupuesto se guardan en el vínculo del equipo indicado (o el primero con acceso)
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
});

// ---------- Borrar jugador ----------
// DELETE /api/players/:id  (quita del vínculo; si no le queda equipo, borra)
router.delete("/players/:id", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  const links = await prisma.playerTeam.findMany({ where: { playerId: player.id } });
  for (const l of links) {
    if (!(await canAccessTeam(req.user!.id, l.teamId))) {
      return res.status(403).json({ error: "No tenés acceso a este jugador" });
    }
  }
  if (links.length === 1) {
    await prisma.player.delete({ where: { id: player.id } });
  } else {
    // está en varios equipos: solo desvincula del primero (cambio en el front usual)
    await prisma.playerTeam.delete({ where: { playerId_teamId: { playerId: player.id, teamId: links[0].teamId } } });
  }
  res.json({ ok: true });
});

// ------------------- Cuotas -------------------

// Acceso del usuario a TODOS los equipos del jugador (con uno alcanza... en
// realidad exige acceso a todos, igual que el POST actual).
async function checkPlayerAccess(req: any, res: any, playerId: string): Promise<boolean> {
  const links = await prisma.playerTeam.findMany({ where: { playerId } });
  for (const l of links) {
    if (!(await canAccessTeam(req.user!.id, l.teamId))) {
      res.status(403).json({ error: "No tenés acceso a este jugador" });
      return false;
    }
  }
  return true;
}

// Recalcula la regla de cuota tras un cambio y sincroniza el status del jugador.
async function recalcularTrasPago(player: { id: string; status: string }) {
  const payments = await prisma.payment.findMany({
    where: { playerId: player.id },
    orderBy: { month: "desc" },
    take: 24,
  });
  const estadoCuota = calcularEstadoCuota(payments);
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

// POST /api/players/:id/payments/:month
router.post("/players/:id/payments/:month", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  if (!(await checkPlayerAccess(req, res, player.id))) return;

  const { month } = req.params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: "Formato de mes inválido. Usá YYYY-MM" });
  }
  // No se puede pagar un mes que todavía no llegó (evita "pagos" futuros que
  // rompen la consulta de cuota y el calendario)
  const mesActual = new Date().toISOString().slice(0, 7);
  if (month > mesActual) {
    return res.status(400).json({ error: `No se puede registrar el mes ${month}: todavía no llegó (mes actual: ${mesActual})` });
  }
  const paid = Boolean(req.body?.paid);
  const amount = typeof req.body?.amount === "number" ? req.body.amount : 0;

  const payment = await prisma.payment.upsert({
    where: { playerId_month: { playerId: player.id, month } },
    update: { paid, amount, paidAt: paid ? new Date() : null },
    create: { playerId: player.id, month, paid, amount, paidAt: paid ? new Date() : null },
  });

  const { estadoCuota, status } = await recalcularTrasPago(player);

  res.json({ payment, estadoCuota, status });
});

// DELETE /api/players/:id/payments/:month — pone el mes en NULL: ni pagado
// ni adeudado. Para meses que no le corresponden al jugador (ej. se incorporó
// después: Mateo Villalba entró en febrero → enero impago se ELIMINA y deja
// de contar como deuda). Idempotente: si no hay registro, responde ok igual.
router.delete("/players/:id/payments/:month", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  if (!(await checkPlayerAccess(req, res, player.id))) return;

  const { month } = req.params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: "Formato de mes inválido. Usá YYYY-MM" });
  }

  await prisma.payment.deleteMany({ where: { playerId: player.id, month } });

  const { estadoCuota, status } = await recalcularTrasPago(player);

  res.json({ removed: true, estadoCuota, status });
});

// GET /api/players/:id/payments — historial
router.get("/players/:id/payments", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  const links = await prisma.playerTeam.findMany({ where: { playerId: player.id } });
  for (const l of links) {
    if (!(await canAccessTeam(req.user!.id, l.teamId))) {
      return res.status(403).json({ error: "No tenés acceso a este jugador" });
    }
  }
  const payments = await prisma.payment.findMany({
    where: { playerId: player.id },
    orderBy: { month: "desc" },
  });
  res.json(payments);
});

// ------------------- Documentos (ficha médica / estudios) -------------------

/** Verifica que el usuario tenga acceso a algún equipo del jugador (o sea ADMIN). */
async function canAccessPlayer(userId: string, playerId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "ADMIN") return true;
  const links = await prisma.playerTeam.findMany({ where: { playerId }, select: { teamId: true } });
  for (const l of links) {
    if (await canAccessTeam(userId, l.teamId)) return true;
  }
  return false;
}

/** Categorías de los equipos del jugador (para la regla por categoría). */
async function categoriasDeJugador(playerId: string): Promise<string[]> {
  const teams = await prisma.team.findMany({
    where: { players: { some: { playerId } } },
    select: { category: true },
  });
  return teams.map((t) => t.category).filter(Boolean) as string[];
}

const uploadDocSchema = z.object({
  tipo: z.enum(TIPOS_DOCUMENTO),
  descripcion: z.string().max(200).optional().nullable(),
  fileName: z.string().min(1).max(200),
  mime: z.string().min(1).max(100),
  dataBase64: z.string().min(1),
  fechaEmision: z.string().optional().nullable(), // fecha del papel (referencia)
  fechaVencimiento: z.string().optional().nullable(), // si viene, manda (lo que dice el papel)
  categoria: z.string().optional().nullable(), // categoría del equipo (referencia)
});

// GET /api/players/:id/documents — lista de documentos (sin el archivo) + estado calculado
router.get("/players/:id/documents", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  if (!(await canAccessPlayer(req.user!.id, player.id))) {
    return res.status(403).json({ error: "No tenés acceso a este jugador" });
  }
  const docs = await prisma.jugadorDocumento.findMany({
    where: { playerId: player.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, tipo: true, descripcion: true, fileName: true, mime: true,
      size: true, fechaEmision: true, fechaVencimiento: true, subidoPorId: true, createdAt: true,
    },
  });
  // cálculo de estado con los mismísimos campos que van al cliente
  // (regla por categoría: mayores → ergo, menores → electro)
  const categorias = await categoriasDeJugador(player.id);
  const estado = calcularDocumentos(docs.map((d) => ({ tipo: d.tipo, fechaVencimiento: d.fechaVencimiento })), new Date(), categorias);
  res.json({ documentos: docs, estado });
});

// POST /api/players/:id/documents — subir documento (data en base64, máx ~2 MB)
router.post("/players/:id/documents", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  if (!(await canAccessPlayer(req.user!.id, player.id))) {
    return res.status(403).json({ error: "No tenés acceso a este jugador" });
  }
  const parsed = uploadDocSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });

  const { tipo, descripcion, fileName, mime, dataBase64, fechaEmision, fechaVencimiento, categoria } = parsed.data;
  const buf = Buffer.from(dataBase64, "base64");
  if (buf.length === 0) return res.status(400).json({ error: "El archivo está vacío" });
  if (buf.length > MAX_DOC_BYTES) {
    return res.status(400).json({ error: `El archivo supera el máximo de 2 MB (son ${(buf.length / 1024 / 1024).toFixed(1)} MB)` });
  }

  const emision = fechaEmision ? new Date(fechaEmision) : null;
  // La fecha que manda: la explícita si vino; si no, la regla del club
  // (ficha médica y ergo 2 años / electro 1 año desde la emisión).
  // OTRO: sin vencimiento automático.
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
});

// GET /api/players/:id/documents/:docId/download — descargar el archivo
router.get("/players/:id/documents/:docId/download", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  if (!(await canAccessPlayer(req.user!.id, player.id))) {
    return res.status(403).json({ error: "No tenés acceso a este jugador" });
  }
  const doc = await prisma.jugadorDocumento.findUnique({ where: { id: req.params.docId } });
  if (!doc || doc.playerId !== player.id) return res.status(404).json({ error: "Documento no encontrado" });

  res.setHeader("Content-Type", doc.mime);
  res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName.replace(/[\\"]/g, "_")}"`);
  res.send(doc.data);
});

// DELETE /api/players/:id/documents/:docId — borrar (con confirmación de quién)
router.delete("/players/:id/documents/:docId", requireAuth, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  if (!(await canAccessPlayer(req.user!.id, player.id))) {
    return res.status(403).json({ error: "No tenés acceso a este jugador" });
  }
  const doc = await prisma.jugadorDocumento.findFirst({ where: { id: req.params.docId, playerId: player.id } });
  if (!doc) return res.status(404).json({ error: "Documento no encontrado" });
  await prisma.jugadorDocumento.delete({ where: { id: doc.id } });
  res.json({ ok: true });
});

export default router;