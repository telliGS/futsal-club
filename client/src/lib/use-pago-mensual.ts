import { useState } from "react";
import { apiFetch } from "./api";
import { formatPesos, monthShort } from "./panel-helpers";
import { IPlayer, IToast, OnPlayersChange } from "./panel-types";

/**
 * Pago mensual de un jugador (cuota o gimnasio): registrar (con monto +
 * detalle), quitar (queda impago → deuda) o poner nulo (ni pagado ni
 * adeudado). Actualiza el estado local del plantel (`onPlayersChange`)
 * manteniendo lo que devuelve el server.
 *
 * Cuota y gym comparten el 100% del flujo y solo difieren en: endpoint,
 * campo del jugador (`payments` vs `gymPayments`), si el server devuelve
 * `estadoCuota`/`status` para refrescar, y los textos de UX (config).
 */
interface PagoMensualConfig {
  /** Etiqueta capitalizada para toasts: "Pago" | "Gym" */
  etiqueta: string;
  /** Confirm "quitar": "de la cuota" | "del gym" */
  articulo: string;
  /** Confirm "quitar": "cuenta como deuda" | "debe el gym" */
  consecuencia: string;
  /** Confirm "nulo": "de" | "del gym" */
  preNuloConfirm: string;
  /** Toast "nulo": "de" | "del gym de" */
  preNuloToast: string;
  /** Nota extra del confirm "nulo" (o "") */
  notaNulo: string;
  /** Campo del jugador que se actualiza en el plantel local */
  campo: "payments" | "gymPayments";
  /** Cuota: el server devuelve estadoCuota/status para refrescar la fila */
  aplicarEstado: boolean;
  escribirUrl: (playerId: string, month: string) => string;
  borrarUrl: (playerId: string, month: string) => string;
}

type EstadoRes = { estadoCuota: IPlayer["estadoCuota"]; status: string };

/**
 * @param onToast tipo de toast: "success" | "error" | "warning" | "info"
 */
export function usePagoMensual(
  cfg: PagoMensualConfig,
  token: string | null,
  onPlayersChange: OnPlayersChange,
  onError: (msg: string) => void,
  onToast: (msg: string, type: IToast["type"]) => void
) {
  const [modal, setModal] = useState<{ player: IPlayer; month: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function abrir(p: IPlayer, month: string) {
    setModal({ player: p, month });
  }

  // Aplica el cambio en la fila local del jugador: reemplaza/elimina el mes y
  // (si el server lo devuelve) refresca estadoCuota/status.
  function aplicarFila(
    x: IPlayer,
    month: string,
    mes: { month: string; paid: boolean; amount: number; note?: string | null } | null,
    res: EstadoRes | null
  ): IPlayer {
    const actuales = x[cfg.campo] ?? [];
    const siguientes = mes
      ? [mes, ...actuales.filter((y) => y.month !== month)]
      : actuales.filter((y) => y.month !== month);
    const row: IPlayer = { ...x, [cfg.campo]: siguientes };
    if (res) {
      row.estadoCuota = res.estadoCuota;
      row.status = res.status;
    }
    return row;
  }

  async function guardar(amount: number, note: string) {
    if (!token || !modal) return;
    const { player, month } = modal;
    setSaving(true);
    try {
      const opts = { method: "POST", body: JSON.stringify({ paid: true, amount, note }) };
      const res = cfg.aplicarEstado
        ? await apiFetch<EstadoRes>(cfg.escribirUrl(player.id, month), opts, token)
        : await apiFetch<unknown>(cfg.escribirUrl(player.id, month), opts, token);
      const estado = cfg.aplicarEstado ? (res as EstadoRes) : null;
      onPlayersChange((prev) =>
        prev.map((x) => (x.id === player.id ? aplicarFila(x, month, { month, paid: true, amount, note }, estado) : x))
      );
      setModal(null);
      onToast(`${cfg.etiqueta} de ${monthShort(month)} registrado (${formatPesos(amount)}).`, "success");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function quitar() {
    if (!token || !modal) return;
    const { player, month } = modal;
    const ok = window.confirm(
      `¿Quitar el pago ${cfg.articulo} ${monthShort(month)} de ${player.firstName} ${player.lastName}? Queda como impago (${cfg.consecuencia}).`
    );
    if (!ok) return;
    setSaving(true);
    try {
      const opts = { method: "POST", body: JSON.stringify({ paid: false, amount: 0 }) };
      const res = cfg.aplicarEstado
        ? await apiFetch<EstadoRes>(cfg.escribirUrl(player.id, month), opts, token)
        : await apiFetch<unknown>(cfg.escribirUrl(player.id, month), opts, token);
      const estado = cfg.aplicarEstado ? (res as EstadoRes) : null;
      onPlayersChange((prev) =>
        prev.map((x) => (x.id === player.id ? aplicarFila(x, month, { month, paid: false, amount: 0 }, estado) : x))
      );
      setModal(null);
      onToast(`${cfg.etiqueta} de ${monthShort(month)} quitado.`, "warning");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function ponerNulo() {
    if (!token || !modal) return;
    const { player, month } = modal;
    const ok = window.confirm(
      `¿Quitar el registro ${cfg.preNuloConfirm} ${monthShort(month)} de ${player.firstName} ${player.lastName}?\n\nQueda vacío: ni pagado ni adeudado${cfg.notaNulo}.`
    );
    if (!ok) return;
    setSaving(true);
    try {
      const res = cfg.aplicarEstado
        ? await apiFetch<EstadoRes>(cfg.borrarUrl(player.id, month), { method: "DELETE" }, token)
        : await apiFetch<unknown>(cfg.borrarUrl(player.id, month), { method: "DELETE" }, token);
      const estado = cfg.aplicarEstado ? (res as EstadoRes) : null;
      onPlayersChange((prev) =>
        prev.map((x) => (x.id === player.id ? aplicarFila(x, month, null, estado) : x))
      );
      setModal(null);
      onToast(`Registro ${cfg.preNuloToast} ${monthShort(month)} quitado (nulo).`, "info");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return { modal, setModal, saving, abrir, guardar, quitar, ponerNulo };
}