import { prisma } from "../config.js";
import { calcularEstadoGym } from "./gym.js";
import { calcularEstadoCuota } from "./cuota.js";
import { calcularDocumentos, aptoParaJugar } from "./ficha.js";
import { pagaCuotaEnEquipo, categoriasPagoJugador } from "./nativo.js";

export type Scope = "club" | "teamId";
export type TipoLista = "completa" | "altas" | "bajas";

export interface FilaSeguroCompleta {
  document: string;
  lastName: string;
  firstName: string;
  birthDate: string | null;
  estado: string;
  equipos: string[];
}

export interface FilaGymCompleta extends FilaSeguroCompleta {
  gymEstado: string;
  gymMonto: number;
  gymNota: string | null;
  cuotaEstado: string;
  cuotaMonto: number;
}

export interface FilaCambio {
  tipo: string;
  fecha: string;
  document: string;
  lastName: string;
  firstName: string;
  birthDate: string | null;
  equipo: string;
}

export function toScope(raw: unknown): Scope {
  return raw === "teamId" ? "teamId" : "club";
}

export function toTipo(raw: unknown): TipoLista {
  return raw === "altas" || raw === "bajas" ? raw : "completa";
}

// shape del response de GET /teams/:teamId/players (una sola fuente).
export async function getTeamPlayersRows(teamId: string) {
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

  return links.map((l) => {
    const equiposJugador = l.player.teams.filter((t) => t.role === "JUGADOR");
    const categoriasFicha = (equiposJugador.length > 0 ? equiposJugador : l.player.teams).map((t) => t.team.category);
    const congelado = l.player.status === "INACTIVO" && l.player.inactiveSince
      ? l.player.inactiveSince.toISOString().slice(0, 7)
      : undefined;
    const estadoCuota = calcularEstadoCuota(l.player.payments, new Date(), {
      congelarDesde: congelado,
      deadline: l.player.deadline,
    });
    const estadoFichas = calcularDocumentos(l.player.documentos, new Date(), categoriasFicha);
    const apto = aptoParaJugar(estadoCuota.puedeJugar, estadoFichas);
    const equiposLike = equiposJugador.map((t) => ({
      name: t.team.name,
      type: t.team.type,
      category: t.team.category,
    }));
    const esFormativos = equiposJugador.some((t) => t.team.type === "FORMATIVA");
    const pagaAca = pagaCuotaEnEquipo(equiposLike, tipoEquipoActual ?? "", team?.category ?? null);
    const ahora = new Date();
    const curGym = ahora.toISOString().slice(0, 7);
    const deadlineGym = l.player.deadline && l.player.deadline >= 1 && l.player.deadline <= 31 ? l.player.deadline : 10;
    const gymPago = l.player.gymPayments.find((x) => x.month === curGym);
    const estadoGym = gymPago?.paid ? "PAGO" : ahora.getUTCDate() > deadlineGym ? "DEBE" : "PENDIENTE";
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
      categoriaPago: categoriasPagoJugador(equiposLike),
      payments: l.player.payments,
      gymPayments: l.player.gymPayments,
      estadoCuota,
      estadoGym,
      fichas: estadoFichas,
      apto,
    };
  });
}

// Filas de la lista del seguro (scope teamId o club, tipo completa/altas/bajas).
export async function getSeguroRows(scope: Scope, tipo: TipoLista, teamId: string): Promise<FilaSeguroCompleta[] | FilaCambio[]> {
  if (tipo !== "completa") {
    const avisos = await prisma.avisoSeguro.findMany({
      where: {
        resueltoAt: null,
        tipo: tipo === "altas" ? "ALTA" : "BAJA",
        ...(scope === "teamId" ? { teamId } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    const teamNombres = await prisma.team.findMany({ select: { id: true, name: true } });
    const nombre = (id: string | null) => teamNombres.find((t) => t.id === id)?.name ?? "";
    return avisos.map((a) => ({
      tipo: a.tipo,
      fecha: a.createdAt.toISOString().slice(0, 10),
      document: a.document,
      lastName: a.lastName,
      firstName: a.firstName,
      birthDate: a.birthDate ? a.birthDate.toISOString().slice(0, 10) : null,
      equipo: nombre(a.teamId),
    }));
  }

  if (scope === "teamId") {
    const links = await prisma.playerTeam.findMany({
      where: { teamId, role: "JUGADOR" },
      include: {
        player: { include: { teams: { include: { team: { select: { name: true, type: true } } } } } },
      },
    });
    return links
      .filter((l) => l.player.status !== "INACTIVO")
      .map((l) => ({
        document: l.player.document,
        lastName: l.player.lastName,
        firstName: l.player.firstName,
        birthDate: l.player.birthDate ? l.player.birthDate.toISOString().slice(0, 10) : null,
        estado: l.player.status,
        equipos: l.player.teams.filter((t) => t.role === "JUGADOR").map((t) => t.team.name),
      }));
  }

  const players = await prisma.player.findMany({
    where: {
      status: { not: "INACTIVO" },
      teams: { some: { role: "JUGADOR" } },
    },
    include: { teams: { include: { team: { select: { name: true, type: true } } } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return players.map((p) => ({
    document: p.document,
    lastName: p.lastName,
    firstName: p.firstName,
    birthDate: p.birthDate ? p.birthDate.toISOString().slice(0, 10) : null,
    estado: p.status,
    equipos: p.teams.filter((t) => t.role === "JUGADOR").map((t) => t.team.name),
  }));
}

// Filas de la lista del gym (scope teamId o club, tipo + mes).
export async function getGymRows(scope: Scope, tipo: TipoLista, teamId: string, mes: string): Promise<FilaGymCompleta[] | FilaCambio[]> {
  if (tipo !== "completa") {
    const avisos = await prisma.avisoGym.findMany({
      where: {
        resueltoAt: null,
        tipo: tipo === "altas" ? "ALTA" : "BAJA",
        ...(scope === "teamId" ? { teamId } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    const teamNombres = await prisma.team.findMany({ select: { id: true, name: true } });
    const nombre = (id: string | null) => teamNombres.find((t) => t.id === id)?.name ?? "";
    return avisos.map((a) => ({
      tipo: a.tipo,
      fecha: a.createdAt.toISOString().slice(0, 10),
      document: a.document,
      lastName: a.lastName,
      firstName: a.firstName,
      birthDate: a.birthDate ? a.birthDate.toISOString().slice(0, 10) : null,
      equipo: nombre(a.teamId),
    }));
  }

  const now = new Date();
  const deadline = (p: { deadline: number }) =>
    p.deadline && p.deadline >= 1 && p.deadline <= 31 ? p.deadline : 10;
  const estadoFila = (p: {
    document: string;
    lastName: string;
    firstName: string;
    birthDate: Date | null;
    deadline: number;
    status: string;
    gymPago?: { paid: boolean; amount: number; note: string | null } | null;
    cuotaPago?: { paid: boolean; amount: number } | null;
  }) => {
    const gym = calcularEstadoGym(
      p.gymPago ? [{ month: mes, paid: p.gymPago.paid }] : [],
      now,
      deadline(p)
    );
    const cuota = calcularEstadoCuota(
      p.cuotaPago ? [{ month: mes, paid: p.cuotaPago.paid }] : [],
      now,
      { deadline: deadline(p) }
    );
    return {
      document: p.document,
      lastName: p.lastName,
      firstName: p.firstName,
      birthDate: p.birthDate ? p.birthDate.toISOString().slice(0, 10) : null,
      estado: p.status,
      gymEstado: gym.pagado ? "PAGO" : gym.deudor ? "DEBE" : "PENDIENTE",
      gymMonto: p.gymPago?.paid ? p.gymPago.amount : 0,
      gymNota: p.gymPago?.note ?? null,
      cuotaEstado: cuota.alDia || cuota.pendiente ? (cuota.pendiente ? "PENDIENTE" : "AL_DIA") : "DEBE",
      cuotaMonto: p.cuotaPago?.paid ? p.cuotaPago.amount : 0,
      equipos: [] as string[],
    };
  };

  if (scope === "teamId") {
    const links = await prisma.playerTeam.findMany({
      where: { teamId, role: "JUGADOR", player: { vaAlGym: true } },
      include: {
        player: {
          include: {
            teams: { include: { team: { select: { name: true, type: true } } } },
            gymPayments: { where: { month: mes } },
            payments: { where: { month: mes } },
          },
        },
      },
    });
    return links.map((l) => {
      const f = estadoFila({
        document: l.player.document,
        lastName: l.player.lastName,
        firstName: l.player.firstName,
        birthDate: l.player.birthDate,
        deadline: l.player.deadline,
        status: l.player.status,
        gymPago: l.player.gymPayments[0] ?? null,
        cuotaPago: l.player.payments[0] ?? null,
      });
      f.equipos = l.player.teams.filter((t) => t.role === "JUGADOR").map((t) => t.team.name);
      return f;
    });
  }

  const players = await prisma.player.findMany({
    where: { vaAlGym: true, teams: { some: { role: "JUGADOR" } } },
    include: {
      teams: { include: { team: { select: { name: true, type: true } } } },
      gymPayments: { where: { month: mes } },
      payments: { where: { month: mes } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return players.map((p) => {
    const f = estadoFila({
      document: p.document,
      lastName: p.lastName,
      firstName: p.firstName,
      birthDate: p.birthDate,
      deadline: p.deadline,
      status: p.status,
      gymPago: p.gymPayments[0] ?? null,
      cuotaPago: p.payments[0] ?? null,
    });
    f.equipos = p.teams.filter((t) => t.role === "JUGADOR").map((t) => t.team.name);
    return f;
  });
}