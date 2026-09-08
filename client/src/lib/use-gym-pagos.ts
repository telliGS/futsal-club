import { useState } from "react";
import { apiFetch } from "./api";
import { formatPesos, monthShort } from "./panel-helpers";
import { IPlayer } from "./panel-types";

/**
 * Pago mensual de gimnasio (mismo flujo que la cuota pero contra /gym).
 * Actualiza `gymPayments` del plantel local.
 */
export function useGymPagos(
  token: string | null,
  onPlayersChange: (updater: (prev: IPlayer[]) => IPlayer[]) => void,
  onError: (msg: string) => void,
  onToast: (msg: string, type: "success" | "error" | "warning" | "info") => void
) {
  const [pagoGymModal, setPagoGymModal] = useState<{ player: IPlayer; month: string } | null>(null);
  const [pagoGymSaving, setPagoGymSaving] = useState(false);

  function abrirPagoGym(p: IPlayer, month: string) {
    setPagoGymModal({ player: p, month });
  }

  async function guardarPagoGym(amount: number, note: string) {
    if (!token || !pagoGymModal) return;
    const { player, month } = pagoGymModal;
    setPagoGymSaving(true);
    try {
      await apiFetch(`/gym/players/${player.id}/pagos/${month}`, {
        method: "POST",
        body: JSON.stringify({ paid: true, amount, note }),
      }, token);
      onPlayersChange((prev) =>
        prev.map((x) =>
          x.id === player.id
            ? {
                ...x,
                gymPayments: [
                  { month, paid: true, amount, note },
                  ...(x.gymPayments ?? []).filter((y) => y.month !== month),
                ],
              }
            : x
        )
      );
      setPagoGymModal(null);
      onToast(`Gym de ${monthShort(month)} registrado (${formatPesos(amount)}).`, "success");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setPagoGymSaving(false);
    }
  }

  async function quitarPagoGym() {
    if (!token || !pagoGymModal) return;
    const { player, month } = pagoGymModal;
    const ok = window.confirm(
      `¿Quitar el pago del gym ${monthShort(month)} de ${player.firstName} ${player.lastName}? Queda como impago (debe el gym).`
    );
    if (!ok) return;
    setPagoGymSaving(true);
    try {
      await apiFetch(`/gym/players/${player.id}/pagos/${month}`, {
        method: "POST",
        body: JSON.stringify({ paid: false, amount: 0 }),
      }, token);
      onPlayersChange((prev) =>
        prev.map((x) =>
          x.id === player.id
            ? {
                ...x,
                gymPayments: [
                  { month, paid: false, amount: 0 },
                  ...(x.gymPayments ?? []).filter((y) => y.month !== month),
                ],
              }
            : x
        )
      );
      setPagoGymModal(null);
      onToast(`Gym de ${monthShort(month)} quitado.`, "warning");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setPagoGymSaving(false);
    }
  }

  async function ponerNuloGym() {
    if (!token || !pagoGymModal) return;
    const { player, month } = pagoGymModal;
    const ok = window.confirm(
      `¿Quitar el registro del gym ${monthShort(month)} de ${player.firstName} ${player.lastName}?\n\nQueda vacío: ni pagado ni adeudado.`
    );
    if (!ok) return;
    setPagoGymSaving(true);
    try {
      await apiFetch(`/gym/players/${player.id}/pagos/${month}`, { method: "DELETE" }, token);
      onPlayersChange((prev) =>
        prev.map((x) =>
          x.id === player.id
            ? { ...x, gymPayments: (x.gymPayments ?? []).filter((y) => y.month !== month) }
            : x
        )
      );
      setPagoGymModal(null);
      onToast(`Registro del gym de ${monthShort(month)} quitado (nulo).`, "info");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setPagoGymSaving(false);
    }
  }

  return {
    pagoGymModal,
    setPagoGymModal,
    pagoGymSaving,
    abrirPagoGym,
    guardarPagoGym,
    quitarPagoGym,
    ponerNuloGym,
  };
}