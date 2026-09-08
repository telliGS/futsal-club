import { usePagoMensual } from "./use-pago-mensual";
import { IToast, OnPlayersChange } from "./panel-types";

/**
 * Pago mensual de gimnasio (mismo flujo que la cuota pero contra /gym).
 * Actualiza `gymPayments` del plantel local. Vivo en `usePagoMensual`
 * (comparte el flujo exacto con la cuota).
 */
const cfgGym = {
  etiqueta: "Gym",
  articulo: "del gym",
  consecuencia: "debe el gym",
  preNuloConfirm: "del gym",
  preNuloToast: "del gym de",
  notaNulo: "",
  campo: "gymPayments" as const,
  aplicarEstado: false,
  escribirUrl: (playerId: string, month: string) => `/gym/players/${playerId}/pagos/${month}`,
  borrarUrl: (playerId: string, month: string) => `/gym/players/${playerId}/pagos/${month}`,
};

export function useGymPagos(
  token: string | null,
  onPlayersChange: OnPlayersChange,
  onError: (msg: string) => void,
  onToast: (msg: string, type: IToast["type"]) => void
) {
  const { modal, setModal, saving, abrir, guardar, quitar, ponerNulo } = usePagoMensual(
    cfgGym,
    token,
    onPlayersChange,
    onError,
    onToast
  );

  return {
    pagoGymModal: modal,
    setPagoGymModal: setModal,
    pagoGymSaving: saving,
    abrirPagoGym: abrir,
    guardarPagoGym: guardar,
    quitarPagoGym: quitar,
    ponerNuloGym: ponerNulo,
  };
}