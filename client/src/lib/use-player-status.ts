import { useState } from "react";
import { apiFetch } from "./api";
import { IPlayer } from "./panel-types";

/**
 * Estado de un jugador: pasar a INACTIVO (con mes de corte) o reactivarlo.
 * `recargar` refresca el plantel tras cada operación (igual que antes usaba
 * `recargarPlantel` del Dashboard).
 */
export function usePlayerStatus(
  token: string | null,
  recargar: () => Promise<void>,
  onError: (msg: string) => void
) {
  const [inactivoModal, setInactivoModal] = useState<IPlayer | null>(null);
  const [inactivoMes, setInactivoMes] = useState(() => new Date().toISOString().slice(0, 7));

  function abrirInactivo(p: IPlayer) {
    setInactivoMes(new Date().toISOString().slice(0, 7));
    setInactivoModal(p);
  }

  async function setInactivo(p: IPlayer, desde: string) {
    if (!token) return;
    try {
      await apiFetch(
        `/players/${p.id}/status`,
        { method: "PATCH", body: JSON.stringify({ status: "INACTIVO", inactiveSince: desde }) },
        token
      );
      await recargar();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  async function reactivar(p: IPlayer) {
    if (!token) return;
    const ok = window.confirm(
      `¿Reactivar a ${p.firstName} ${p.lastName}?\n\nSi tiene meses de deuda de antes de irse, quedará DEUDOR y no podrá jugar hasta ponerse al día.`
    );
    if (!ok) return;
    try {
      const r = await apiFetch<{ status: string; estadoCuota: { mesesDebe: number; deudor: boolean } }>(
        `/players/${p.id}/status`,
        { method: "PATCH", body: JSON.stringify({ status: "ACTIVO" }) },
        token
      );
      if (r.status === "DEUDA" && r.estadoCuota.deudor) {
        const n = r.estadoCuota.mesesDebe;
        window.alert(
          `${p.firstName} ${p.lastName} vuelve con ${n} ${n === 1 ? "mes de deuda" : "meses de deuda"} (de antes de irse). Queda como DEUDOR: no tiene permiso de jugar hasta ponerse al día.`
        );
      }
      await recargar();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  return { inactivoModal, setInactivoModal, inactivoMes, setInactivoMes, abrirInactivo, setInactivo, reactivar };
}