// Reglas de cuota del club José Hernández
// La cuota se paga del 1 al 10 de cada mes.
// Desde el día 11 sin pagar el mes en curso → el jugador es DEUDOR
// y NO tiene permiso de jugar (hasta regularizar).

export interface PagoLike {
  month: string; // YYYY-MM
  paid: boolean;
}

export interface EstadoCuota {
  deudor: boolean; // no puede jugar
  alDia: boolean; // mes actual pago y sin deuda previa
  pendiente: boolean; // dentro de los primeros 10 días y aún no pagó
  puedeJugar: boolean; // !deudor
  mesesDebe: number; // meses adeudados (incluye el actual si venció el plazo)
}

function mesKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Día de corte: la cuota se paga del 1 al 10 de cada mes.
export const DIA_CORTE = 10;

export function calcularEstadoCuota(
  payments: PagoLike[],
  now: Date = new Date(),
  opts: { congelarDesde?: string } = {}
): EstadoCuota {
  const { congelarDesde } = opts;
  const mesActual = mesKey(now);
  const dia = now.getDate();

  const pagadoMesActual = payments.some((p) => p.month === mesActual && p.paid);
  // meses anteriores al actual sin pago (deudas vigentes). Si el jugador
  // está INACTIVO (congelarDesde = última fecha jugada, YYYY-MM) solo
  // cuentan los meses impagos ANTERIORES a esa fecha: no corre cuota
  // durante el tiempo que estuvo fuera.
  const deudaPrevia = payments.filter(
    (p) => !p.paid && p.month < mesActual && (!congelarDesde || p.month < congelarDesde)
  ).length;
  // si estamos del día 11 en adelante y el mes en curso no está pago → venció
  const vencioMesActual = dia > DIA_CORTE && !pagadoMesActual && !congelarDesde;

  const deudor = deudaPrevia > 0 || vencioMesActual;
  const pendiente = !pagadoMesActual && !vencioMesActual;

  let mesesDebe = deudaPrevia;
  if (vencioMesActual) mesesDebe += 1;

  return {
    deudor,
    alDia: pagadoMesActual && !deudor,
    pendiente: pendiente && !deudor,
    puedeJugar: !deudor,
    mesesDebe,
  };
}