// Gimnasio del club: lista de jugadores que van + avisos de altas/bajas.
// Cada vez que un jugador empieza o deja de ir al gym (vaAlGym cambia) queda
// un aviso (AvisoGym) para que el admin sepa que la lista quedó desactualizada.
// Se limpia al exportar la lista completa del gym (resueltoAt).

import { prisma } from "../config.js";

export type AvisoTipo = "ALTA" | "BAJA";

export interface DatosAviso {
  playerId: string;
  tipo: AvisoTipo;
  creadoPorId: string;
  teamId?: string;
  // Snapshot explícito: se usa cuando el jugador ya no existe (se lo borró)
  // y hay que exportar igual la BAJA con sus datos.
  snapshot?: {
    document: string;
    lastName: string;
    firstName: string;
    birthDate: Date | null;
  };
}

/** Registra un aviso de cambio de la lista del gym, deduplicando por (playerId, tipo) pendiente. */
export async function registrarAvisoGym({
  playerId,
  tipo,
  creadoPorId,
  teamId,
  snapshot,
}: DatosAviso): Promise<void> {
  const pendiente = await prisma.avisoGym.findFirst({
    where: { playerId, tipo, resueltoAt: null },
  });
  if (pendiente) return; // ya hay un aviso pendiente del mismo tipo → no duplicar

  const datos =
    snapshot ??
    await prisma.player.findUnique({
      where: { id: playerId },
      select: { document: true, lastName: true, firstName: true, birthDate: true },
    });
  if (!datos) return;

  await prisma.avisoGym.create({
    data: {
      playerId,
      tipo,
      document: datos.document,
      lastName: datos.lastName,
      firstName: datos.firstName,
      birthDate: datos.birthDate,
      teamId: teamId ?? null,
      creadoPorId,
    },
  });
}

export interface GymPagoLike {
  month: string; // YYYY-MM
  paid: boolean;
}

export interface EstadoGym {
  pagado: boolean; // pagó el gym del mes en curso
  pendiente: boolean; // dentro del plazo y todavía no pagó
  deudor: boolean; // venció el plazo sin pagar el gym del mes
  diasParaPagar: number; // días restantes del plazo (0 si deudor/pagado)
}

/**
 * Estado del gym de un jugador para el mes en curso. Usa el mismo día límite
 * (deadline) que la cuota del jugador (default 10). "deudor" aquí solo habla
 * del gym (no bloquea jugar, pero muestra lo que falta cobrar).
 */
export function calcularEstadoGym(
  payments: GymPagoLike[],
  now: Date = new Date(),
  deadline = 10
): EstadoGym {
  const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dia = now.getDate();
  const d = deadline >= 1 && deadline <= 31 ? deadline : 10;

  const pago = payments.find((p) => p.month === mesActual);
  const pagado = Boolean(pago?.paid);
  const vencio = dia > d && !pagado;

  return {
    pagado,
    pendiente: !pagado && !vencio,
    deudor: vencio,
    diasParaPagar: pagado || vencio ? 0 : Math.max(0, d - dia),
  };
}
