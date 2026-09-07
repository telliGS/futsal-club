import type { IPlayer } from "./panel-types";

export interface IFiltroPlantel {
  filtroEstado: string;
  busqueda?: string;
}

/** Filtra el plantel por estado de cuota (o inactivos) y luego por nombre/DNI. */
export function filtrarJugadores(
  plantel: IPlayer[],
  { filtroEstado, busqueda = "" }: IFiltroPlantel
): { jugadoresFiltrados: IPlayer[]; jugadoresBusqueda: IPlayer[] } {
  const jugadoresFiltrados = plantel.filter((p) => {
    if (filtroEstado === "todos") return true;
    const ec = p.estadoCuota;
    if (filtroEstado === "al_dia") return ec.alDia;
    if (filtroEstado === "pendiente") return ec.pendiente;
    if (filtroEstado === "deudor") return ec.deudor;
    if (filtroEstado === "inactivo") return p.status === "INACTIVO";
    return true;
  });

  const q = busqueda.toLowerCase().trim();
  const jugadoresBusqueda = q
    ? jugadoresFiltrados.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.document.includes(q)
      )
    : jugadoresFiltrados;

  return { jugadoresFiltrados, jugadoresBusqueda };
}