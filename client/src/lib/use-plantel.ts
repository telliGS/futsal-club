import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api";
import { IPlayer } from "./panel-types";

/**
 * Plantel del equipo seleccionado + filtros de búsqueda/estado.
 * `onError` se llama cuando falla la carga inicial (muestra el error del panel).
 */
export function usePlantel(
  token: string | null,
  teamId: string,
  onError: (msg: string) => void
) {
  const [players, setPlayers] = useState<IPlayer[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (!teamId || !token) return;
    apiFetch<IPlayer[]>(`/teams/${teamId}/players`, {}, token)
      .then(setPlayers)
      .catch(() => {
        setPlayers([]);
        onError("No se pudo cargar el plantel");
      });
  }, [teamId, token]);

  const recargarPlantel = useCallback(async () => {
    if (!token || !teamId) return;
    const updated = await apiFetch<IPlayer[]>(`/teams/${teamId}/players`, {}, token);
    setPlayers(updated);
  }, [token, teamId]);

  return { players, setPlayers, filtroEstado, setFiltroEstado, busqueda, setBusqueda, recargarPlantel };
}