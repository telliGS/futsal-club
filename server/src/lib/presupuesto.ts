// ============================================================
// Presupuesto por categoría / equipo
// ------------------------------------------------------------
// Fuente de verdad del cálculo:
//   ingreso = jugadores que cuentan × cuota de la categoría
//   gastos  = gastos fijos del mes + gastos extras del mes
//   balance = ingreso − gastos
//   cuota recomendada = gastos ÷ jugadores (con margen de
//   seguridad, redondeada a $500)
// Notas del club:
//   - Cuentan los JUGADORES activos o con deuda (no INACTIVO,
//     no cuerpo técnico) y con cuentaPresupuesto = true (los
//     casos excepcionales tipo "regularizando" se excluyen).
//   - La cuota varía por categoría (cada equipo tiene la suya).
// ============================================================

/** Redondea a un múltiplo de $500 (hacia arriba). */
export function redondearARedondo(x: number, base = 500): number {
  if (x <= 0) return 0;
  return Math.ceil(x / base) * base;
}

export const MARGEN_SEGURIDAD = 0.1; // 10% de colchón sobre la cuota mínima

export interface PresupuestoInput {
  /** jugadores que pagan (activos + deuda, cuentaPresupuesto=true) */
  jugadores: number;
  /** cuota mensual por jugador de la categoría (null = no cargada) */
  cuota: number | null;
  /** suma de gastos fijos del mes */
  gastosFijos: number;
  /** suma de gastos extras del mes en curso */
  gastosExtra: number;
}

export interface PresupuestoResultado {
  ingreso: number;
  gastos: number;
  balance: number;
  /** cuota que cubre justo los gastos (sin margen), redondeada hacia arriba */
  cuotaMinima: number | null;
  /** cuota recomendada con margen de seguridad, redondeada a $500 */
  cuotaRecomendada: number | null;
  /** si no hay jugadores o no hay gastos, la recomendación no aplica */
  recomendacionSana: boolean;
}

export function calcularPresupuesto(input: PresupuestoInput): PresupuestoResultado {
  const { jugadores, cuota, gastosFijos, gastosExtra } = input;
  const gastos = gastosFijos + gastosExtra;

  const ingreso = cuota != null ? jugadores * cuota : 0;

  // Recomendación: solo si hay jugadores y gastos > 0
  const recomendacionSana = jugadores > 0 && gastos > 0;
  const cuotaMinima = recomendacionSana ? redondearARedondo(gastos / jugadores) : null;
  const cuotaRecomendada = recomendacionSana
    ? redondearARedondo((gastos / jugadores) * (1 + MARGEN_SEGURIDAD))
    : null;

  return {
    ingreso,
    gastos,
    balance: ingreso - gastos,
    cuotaMinima,
    cuotaRecomendada,
    recomendacionSana,
  };
}

/** Formatea un monto en pesos argentinos compactos: 1234567 -> "$1.234.567". */
export function formatPesos(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-AR");
}