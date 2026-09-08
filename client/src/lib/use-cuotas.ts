import { usePagoMensual } from "./use-pago-mensual";
import { IToast, OnPlayersChange } from "./panel-types";

/**
 * Pago de cuota mensual de un jugador: registrar (con monto + detalle),
 * quitar (queda impago → deuda) o poner nulo (ni pagado ni adeudado).
 * Actualiza el estado local del plantel (`onPlayersChange`) manteniendo
 * el `estadoCuota`/`status` que devuelve el server.
 *
 * Vivo en `usePagoMensual` (comparte el flujo exacto con el gym).
 */
const cfgCuota = {
  etiqueta: "Pago",
  articulo: "de la cuota",
  consecuencia: "cuenta como deuda",
  preNuloConfirm: "de",
  preNuloToast: "de",
  notaNulo: " (útil cuando ese mes no le corresponde, ej. todavía no se había incorporado)",
  campo: "payments" as const,
  aplicarEstado: true,
  escribirUrl: (playerId: string, month: string) => `/players/${playerId}/payments/${month}`,
  borrarUrl: (playerId: string, month: string) => `/players/${playerId}/payments/${month}`,
};

export function useCuotas(
  token: string | null,
  onPlayersChange: OnPlayersChange,
  onError: (msg: string) => void,
  onToast: (msg: string, type: IToast["type"]) => void
) {
  const { modal, setModal, saving, abrir, guardar, quitar, ponerNulo } = usePagoMensual(
    cfgCuota,
    token,
    onPlayersChange,
    onError,
    onToast
  );

  return {
    pagoModal: modal,
    setPagoModal: setModal,
    pagoSaving: saving,
    abrirPago: abrir,
    guardarPago: guardar,
    quitarPago: quitar,
    ponerNulo: ponerNulo,
  };
}