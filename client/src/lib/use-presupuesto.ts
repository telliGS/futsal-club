import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { ITotalPresupuesto, IPresupuestoData } from "./panel-types";

/**
 * Presupuesto del equipo (cuota + gastos fijos/extras por mes) y el total
 * consolidado del club (solo ADMIN, carga on-demand con `verTotal`).
 */
export function usePresupuesto(token: string | null, teamId: string, role: string | undefined) {
  const [presup, setPresup] = useState<IPresupuestoData | null>(null);
  const [presupMes, setPresupMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [presupLoading, setPresupLoading] = useState(false);
  const [presupError, setPresupError] = useState("");
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaInput, setQuotaInput] = useState("");
  const [quotaSaving, setQuotaSaving] = useState(false);
  const [gastoModal, setGastoModal] = useState<null | { tipo: "fijo" | "extra"; mes?: string }>(null);
  const [gastoForm, setGastoForm] = useState({ nombre: "", monto: "" });
  const [gastoSaving, setGastoSaving] = useState(false);
  const [verTotal, setVerTotal] = useState(false);
  const [totalData, setTotalData] = useState<ITotalPresupuesto | null>(null);
  const [totalLoading, setTotalLoading] = useState(false);
  const [totalError, setTotalError] = useState("");

  useEffect(() => {
    if (!teamId || !token) return;
    setPresupLoading(true);
    setPresupError("");
    apiFetch<IPresupuestoData>(`/teams/${teamId}/presupuesto?mes=${presupMes}`, {}, token)
      .then(setPresup)
      .catch(() => {
        setPresup(null);
        setPresupError("No se pudo cargar el presupuesto");
      })
      .finally(() => setPresupLoading(false));
  }, [teamId, token, presupMes]);

  useEffect(() => {
    if (!verTotal || !token) return;
    setTotalLoading(true);
    setTotalError("");
    apiFetch<ITotalPresupuesto>(`/teams/presupuesto/total?mes=${presupMes}`, {}, token)
      .then(setTotalData)
      .catch(() => {
        setTotalData(null);
        setTotalError("No se pudo cargar el total del club");
      })
      .finally(() => setTotalLoading(false));
  }, [verTotal, token, presupMes, role]);

  async function guardarQuota() {
    if (!token || !teamId) return;
    const n = Number(quotaInput.replace(/[^0-9]/g, ""));
    setQuotaSaving(true);
    try {
      await apiFetch(`/teams/${teamId}/quota`, { method: "PUT", body: JSON.stringify({ quota: n > 0 ? n : null }) }, token);
      setQuotaInput("");
      setShowQuotaModal(false);
      const updated = await apiFetch<IPresupuestoData>(`/teams/${teamId}/presupuesto?mes=${presupMes}`, {}, token);
      setPresup(updated);
    } catch (e) {
      setPresupError((e as Error).message);
    } finally {
      setQuotaSaving(false);
    }
  }

  function openGastoModal(tipo: "fijo" | "extra") {
    setGastoModal({ tipo, mes: presupMes });
  }

  async function guardarGasto() {
    if (!token || !teamId || !gastoModal) return;
    const monto = Number(gastoForm.monto.replace(/[^0-9]/g, ""));
    const nombre = gastoForm.nombre.trim();
    if (!nombre || monto <= 0) {
      setPresupError("Completá el nombre y un monto válido.");
      return;
    }
    setGastoSaving(true);
    try {
      if (gastoModal.tipo === "fijo") {
        await apiFetch(`/teams/${teamId}/gastos/fijos`, { method: "POST", body: JSON.stringify({ nombre, monto }) }, token);
      } else {
        await apiFetch(`/teams/${teamId}/gastos/extras`, { method: "POST", body: JSON.stringify({ nombre, monto, mes: gastoModal.mes ?? presupMes }) }, token);
      }
      setGastoForm({ nombre: "", monto: "" });
      setGastoModal(null);
      const updated = await apiFetch<IPresupuestoData>(`/teams/${teamId}/presupuesto?mes=${presupMes}`, {}, token);
      setPresup(updated);
    } catch (e) {
      setPresupError((e as Error).message);
    } finally {
      setGastoSaving(false);
    }
  }

  async function borrarGasto(tipo: "fijo" | "extra", id: string) {
    if (!token || !teamId) return;
    if (!window.confirm("¿Eliminar este gasto?")) return;
    try {
      await apiFetch(`/teams/${teamId}/gastos/${tipo === "fijo" ? "fijos" : "extras"}/${id}`, { method: "DELETE" }, token);
      const updated = await apiFetch<IPresupuestoData>(`/teams/${teamId}/presupuesto?mes=${presupMes}`, {}, token);
      setPresup(updated);
    } catch (e) {
      setPresupError((e as Error).message);
    }
  }

  return {
    presup,
    setPresup,
    presupMes,
    setPresupMes,
    presupLoading,
    presupError,
    showQuotaModal,
    setShowQuotaModal,
    quotaInput,
    setQuotaInput,
    quotaSaving,
    gastoModal,
    setGastoModal,
    gastoForm,
    setGastoForm,
    gastoSaving,
    verTotal,
    setVerTotal,
    totalData,
    totalLoading,
    totalError,
    guardarQuota,
    openGastoModal,
    guardarGasto,
    borrarGasto,
  };
}