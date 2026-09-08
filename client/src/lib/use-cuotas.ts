import { useState } from "react";
import { apiFetch } from "./api";
import { formatPesos, monthShort } from "./panel-helpers";
import { IPlayer } from "./panel-types";

/**
 * Pago de cuota mensual de un jugador: registrar (con monto + detalle),
 * quitar (queda impago → deuda) o poner nulo (ni pagado ni adeudado).
 * Actualiza el estado local del plantel (`onPlayersChange`) manteniendo
 * el `estadoCuota`/`status` que devuelve el server.
 */
export function useCuotas(
  token: string | null,
  onPlayersChange: (updater: (prev: IPlayer[]) => IPlayer[]) => void,
  onError: (msg: string) => void,
  onToast: (msg: string, type: "success" | "error" | "warning" | "info") => void
) {
  const [pagoModal, setPagoModal] = useState<{ player: IPlayer; month: string } | null>(null);
  const [pagoSaving, setPagoSaving] = useState(false);

  function abrirPago(p: IPlayer, month: string) {
    setPagoModal({ player: p, month });
  }

  async function guardarPago(amount: number, note: string) {
    if (!token || !pagoModal) return;
    const { player, month } = pagoModal;
    setPagoSaving(true);
    try {
      const res = await apiFetch<{ estadoCuota: IPlayer["estadoCuota"]; status: string }>(
        `/players/${player.id}/payments/${month}`,
        { method: "POST", body: JSON.stringify({ paid: true, amount, note }) },
        token
      );
      onPlayersChange((prev) =>
        prev.map((x) =>
          x.id === player.id
            ? {
                ...x,
                payments: [
                  { month, paid: true, amount, note },
                  ...x.payments.filter((y) => y.month !== month),
                ],
                estadoCuota: res.estadoCuota,
                status: res.status,
              }
            : x
        )
      );
      setPagoModal(null);
      onToast(`Pago de ${monthShort(month)} registrado (${formatPesos(amount)}).`, "success");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setPagoSaving(false);
    }
  }

  async function quitarPago() {
    if (!token || !pagoModal) return;
    const { player, month } = pagoModal;
    const ok = window.confirm(
      `¿Quitar el pago de la cuota ${monthShort(month)} de ${player.firstName} ${player.lastName}? Queda como impago (cuenta como deuda).`
    );
    if (!ok) return;
    setPagoSaving(true);
    try {
      const res = await apiFetch<{ estadoCuota: IPlayer["estadoCuota"]; status: string }>(
        `/players/${player.id}/payments/${month}`,
        { method: "POST", body: JSON.stringify({ paid: false, amount: 0 }) },
        token
      );
      onPlayersChange((prev) =>
        prev.map((x) =>
          x.id === player.id
            ? {
                ...x,
                payments: [
                  { month, paid: false, amount: 0 },
                  ...x.payments.filter((y) => y.month !== month),
                ],
                estadoCuota: res.estadoCuota,
                status: res.status,
              }
            : x
        )
      );
      setPagoModal(null);
      onToast(`Pago de ${monthShort(month)} quitado.`, "warning");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setPagoSaving(false);
    }
  }

  async function ponerNulo() {
    if (!token || !pagoModal) return;
    const { player, month } = pagoModal;
    const ok = window.confirm(
      `¿Quitar el registro de ${monthShort(month)} de ${player.firstName} ${player.lastName}?\n\nQueda vacío: ni pagado ni adeudado (útil cuando ese mes no le corresponde, ej. todavía no se había incorporado).`
    );
    if (!ok) return;
    setPagoSaving(true);
    try {
      const res = await apiFetch<{ estadoCuota: IPlayer["estadoCuota"]; status: string }>(
        `/players/${player.id}/payments/${month}`,
        { method: "DELETE" },
        token
      );
      onPlayersChange((prev) =>
        prev.map((x) =>
          x.id === player.id
            ? {
                ...x,
                payments: x.payments.filter((y) => y.month !== month),
                estadoCuota: res.estadoCuota,
                status: res.status,
              }
            : x
        )
      );
      setPagoModal(null);
      onToast(`Registro de ${monthShort(month)} quitado (nulo).`, "info");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setPagoSaving(false);
    }
  }

  return { pagoModal, setPagoModal, pagoSaving, abrirPago, guardarPago, quitarPago, ponerNulo };
}