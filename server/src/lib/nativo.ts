// ============================================================
// Regla de negocio: ¿dónde paga la cuota un jugador?
// ------------------------------------------------------------
// Un jugador paga la cuota en su categoría NATIVA: la formativa
// de MENOR edad entre las que juega (C17 + C20 → C17; C17 + C20 +
// JH NEGRO → C17). En el resto de formativas y en cualquier equipo
// PRIMERA aparece en el plantel pero NO paga cuota ahí, no cuenta
// para su presupuesto y no tiene opciones de pago.
// Un jugador sin vínculo formativo paga en sus equipos (sea cual
// sea el tipo) — el caso raro de dos primeras paga en todas.
//
// IMPORTANTE: las funciones reciben SOLO los equipos donde la
// persona tiene rol JUGADOR (filtrar ANTES). Los vínculos
// técnicos (DT/AT/PF) y de delegado (DEL) NO cuentan: ej. Marcos
// Ruiz Diaz es DEL en C11/C13, DT en C20 FEM y PF en JH ELITE,
// pero es JUGADOR solo en JH NEGRO → paga ahí.
// ============================================================

export type TeamType = "FORMATIVA" | "PRIMERA" | string;

export interface IEquipoJugador {
  name: string;
  type: TeamType;
  category?: string | null;
}

/** Orden por edad: el número de la categoría (C17 → 17). Sin número → mayor (va al final). */
export function ordenCategoria(cat: string | null | undefined): number {
  const m = /^C(\d+)/i.exec(cat ?? "");
  return m ? Number(m[1]) : 999;
}

/** ¿El jugador tiene al menos un vínculo en un equipo FORMATIVA? */
export function tieneVinculoFormativo(tiposDeSusEquipos: TeamType[]): boolean {
  return tiposDeSusEquipos.some((t) => t === "FORMATIVA");
}

/**
 * La categoría NATIVA del jugador: la formativa de MENOR edad entre
 * sus vínculos (ej. C17 + C20 → C17). Devuelve null si no tiene
 * ningún vínculo formativo.
 */
export function categoriaNativa(equipos: IEquipoJugador[]): IEquipoJugador | null {
  const formativas = equipos.filter((e) => e.type === "FORMATIVA");
  if (formativas.length === 0) return null;
  return [...formativas].sort(
    (a, b) => ordenCategoria(a.category) - ordenCategoria(b.category)
  )[0];
}

/**
 * ¿Este jugador paga la cuota en el equipo actual?
 * - Con algún vínculo formativo:
 *     → paga SOLO en su categoría nativa (la formativa menor);
 *       en las demás formativas y en PRIMERA no paga acá.
 * - Sin vínculo formativo → paga en el equipo actual.
 */
export function pagaCuotaEnEquipo(
  equiposJugador: IEquipoJugador[],
  tipoEquipoActual: TeamType,
  categoriaActual?: string | null
): boolean {
  const nativa = categoriaNativa(equiposJugador);
  if (!nativa) return true;
  if (tipoEquipoActual !== "FORMATIVA") return false;
  return ordenCategoria(categoriaActual) === ordenCategoria(nativa.category);
}

/**
 * Nombres de las categorías donde paga (una sola: la nativa menor),
 * ej. ["C17"]. Vacío si no tiene vínculo formativo.
 */
export function categoriasPagoJugador(equiposJugador: IEquipoJugador[]): string[] {
  const nativa = categoriaNativa(equiposJugador);
  return nativa ? [nativa.name] : [];
}