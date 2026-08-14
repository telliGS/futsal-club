// Lista de asegurados del club: cada ALTA/BAJA de un jugador ACTIVO queda
// registrada como aviso (AvisoSeguro) para que el admin y el delegado que hizo
// el cambio sepan que la lista del seguro quedó desactualizada.

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

/** Registra un aviso de cambio de asegurados, deduplicando por (playerId, tipo) pendiente. */
export async function registrarAvisoSeguro({
  playerId,
  tipo,
  creadoPorId,
  teamId,
  snapshot,
}: DatosAviso): Promise<void> {
  const pendiente = await prisma.avisoSeguro.findFirst({
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

  await prisma.avisoSeguro.create({
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