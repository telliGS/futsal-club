import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api";
import { IGymAvisos, ISeguroAvisos } from "./panel-types";

/**
 * Avisos y modales de Seguro (lista de asegurados) y Gimnasio (lista de los
 * que van + pagos mensuales). Los avisos se cargan al montar y cada vez que
 * cambia el token.
 */
export function useSeguroGym(token: string | null) {
  const [showSeguro, setShowSeguro] = useState(false);
  const [seguroAvisos, setSeguroAvisos] = useState<ISeguroAvisos | null>(null);
  const [showGym, setShowGym] = useState(false);
  const [gymAvisos, setGymAvisos] = useState<IGymAvisos | null>(null);
  const [gymPrecioGlobal, setGymPrecioGlobal] = useState<number | null>(null);

  const cargarAvisosSeguro = useCallback(async () => {
    if (!token) return;
    try {
      const r = await apiFetch<ISeguroAvisos>("/seguro/avisos", {}, token);
      setSeguroAvisos(r);
    } catch {
      setSeguroAvisos(null);
    }
  }, [token]);

  const cargarAvisosGym = useCallback(async () => {
    if (!token) return;
    try {
      const r = await apiFetch<IGymAvisos>("/gym/avisos", {}, token);
      setGymAvisos(r);
      const cfg = await apiFetch<{ precio: number }>("/gym/config", {}, token);
      setGymPrecioGlobal(cfg.precio);
    } catch {
      setGymAvisos(null);
      setGymPrecioGlobal(null);
    }
  }, [token]);

  useEffect(() => {
    cargarAvisosSeguro();
    cargarAvisosGym();
  }, [cargarAvisosSeguro, cargarAvisosGym]);

  return {
    showSeguro,
    setShowSeguro,
    seguroAvisos,
    cargarAvisosSeguro,
    showGym,
    setShowGym,
    gymAvisos,
    gymPrecioGlobal,
    setGymPrecioGlobal,
    cargarAvisosGym,
  };
}