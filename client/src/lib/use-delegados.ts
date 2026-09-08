import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { IDelegadoAdmin } from "./panel-types";
import type { DelegadoFormState } from "../components/panel/DelegadoModal";

const emptyDelegadoForm = (): DelegadoFormState => ({
  fullName: "",
  email: "",
  password: "",
  role: "DELEGADO",
  teamIds: [],
});

/**
 * CRUD de cuentas de delegado (solo ADMIN). Carga la lista al montar,
 * crea/edita/activa/desactiva/rehabilita credenciales y elimina cuentas.
 */
export function useDelegados(token: string | null, esAdmin: boolean) {
  const [delegados, setDelegados] = useState<IDelegadoAdmin[]>([]);
  const [delegadosLoading, setDelegadosLoading] = useState(false);
  const [delegadosError, setDelegadosError] = useState("");
  const [delegadoForm, setDelegadoForm] = useState<DelegadoFormState>(emptyDelegadoForm());
  const [delegadoEditingId, setDelegadoEditingId] = useState<string | null>(null);
  const [delegadoSaving, setDelegadoSaving] = useState(false);
  const [showDelegadoModal, setShowDelegadoModal] = useState(false);
  const [delegadoMsg, setDelegadoMsg] = useState("");

  useEffect(() => {
    if (!token || !esAdmin) return;
    setDelegadosLoading(true);
    apiFetch<IDelegadoAdmin[]>("/auth/delegados", {}, token)
      .then(setDelegados)
      .catch(() => setDelegadosError("No se pudo cargar la lista de delegados"))
      .finally(() => setDelegadosLoading(false));
  }, [token, esAdmin]);

  async function saveDelegado(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setDelegadoSaving(true);
    setDelegadosError("");
    try {
      const payload = {
        fullName: delegadoForm.fullName,
        email: delegadoForm.email,
        password: delegadoForm.password || undefined,
        role: delegadoForm.role,
        teamIds: delegadoForm.role === "ADMIN" ? undefined : delegadoForm.teamIds,
      };

      if (delegadoEditingId) {
        await apiFetch(`/auth/delegados/${delegadoEditingId}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
      } else {
        await apiFetch("/auth/delegados", { method: "POST", body: JSON.stringify(payload) }, token);
      }

      const refreshed = await apiFetch<IDelegadoAdmin[]>("/auth/delegados", {}, token);
      setDelegados(refreshed);
      setDelegadoForm(emptyDelegadoForm());
      setDelegadoEditingId(null);
      setShowDelegadoModal(false);
      setDelegadoMsg(delegadoEditingId ? "Cambios guardados." : "Delegado creado.");
      setTimeout(() => setDelegadoMsg(""), 3000);
    } catch (err) {
      setDelegadosError((err as Error).message);
    } finally {
      setDelegadoSaving(false);
    }
  }

  function openNuevoDelegado() {
    setDelegadoEditingId(null);
    setDelegadoForm(emptyDelegadoForm());
    setDelegadosError("");
    setShowDelegadoModal(true);
  }

  function startEditDelegado(d: IDelegadoAdmin) {
    setDelegadoEditingId(d.id);
    setDelegadoForm({
      fullName: d.fullName,
      email: d.email,
      password: "",
      role: d.role === "ADMIN" ? "ADMIN" : "DELEGADO",
      teamIds: d.teamAccess.map((a) => a.team.id),
    });
    setDelegadosError("");
    setShowDelegadoModal(true);
  }

  async function toggleDelegadoActive(d: IDelegadoAdmin) {
    if (!token) return;
    const activando = !d.active;
    const nombre = d.fullName;
    if (!activando && !window.confirm(`¿Desactivar a ${nombre}? No podrá entrar al panel hasta reactivarlo.`)) return;
    try {
      await apiFetch(`/auth/delegados/${d.id}`, { method: "PATCH", body: JSON.stringify({ active: activando }) }, token);
      setDelegados((prev) => prev.map((x) => (x.id === d.id ? { ...x, active: activando } : x)));
      setDelegadoMsg(activando ? `${nombre} reactivado.` : `${nombre} desactivado.`);
      setTimeout(() => setDelegadoMsg(""), 3000);
    } catch (err) {
      setDelegadosError((err as Error).message);
    }
  }

  // El delegado usó su único autocambio → el admin puede habilitarle otro.
  async function reactivarCredenciales(d: IDelegadoAdmin) {
    if (!token) return;
    if (!window.confirm(`¿Volver a habilitar el cambio de credenciales de ${d.fullName}?`)) return;
    try {
      await apiFetch(`/auth/delegados/${d.id}`, { method: "PATCH", body: JSON.stringify({ canChangeCredentials: true }) }, token);
      setDelegados((prev) => prev.map((x) => (x.id === d.id ? { ...x, canChangeCredentials: true } : x)));
      setDelegadoMsg(`${d.fullName} puede volver a cambiar sus credenciales.`);
      setTimeout(() => setDelegadoMsg(""), 3000);
    } catch (err) {
      setDelegadosError((err as Error).message);
    }
  }

  async function eliminarDelegado(d: IDelegadoAdmin) {
    if (!token) return;
    if (!window.confirm(`¿Eliminar la cuenta de ${d.fullName} (${d.email})? Esta acción no se puede deshacer.`)) return;
    try {
      await apiFetch(`/auth/delegados/${d.id}`, { method: "DELETE" }, token);
      setDelegados((prev) => prev.filter((x) => x.id !== d.id));
      setDelegadoMsg(`Cuenta de ${d.fullName} eliminada.`);
      setTimeout(() => setDelegadoMsg(""), 3000);
    } catch (err) {
      setDelegadosError((err as Error).message);
    }
  }

  async function eliminarTodosDelegados() {
    if (!token) return;
    if (delegados.length === 0) return;
    if (!window.confirm(
      `¿Eliminar TODAS las cuentas de delegado (${delegados.length})?\n\n` +
      "Quedará solo la cuenta de administrador. Esta acción no se puede deshacer."
    )) return;
    if (!window.confirm("Confirmación final: ¿borrar todas las cuentas de delegado?")) return;
    try {
      const res = await apiFetch<{ eliminados: number }>("/auth/delegados", { method: "DELETE" }, token);
      setDelegados([]);
      setDelegadoMsg(`${res.eliminados} cuenta${res.eliminados === 1 ? "" : "s"} de delegado eliminadas.`);
      setTimeout(() => setDelegadoMsg(""), 4000);
    } catch (err) {
      setDelegadosError((err as Error).message);
    }
  }

  return {
    delegados,
    setDelegados,
    delegadosLoading,
    delegadosError,
    delegadoForm,
    setDelegadoForm,
    delegadoEditingId,
    delegadoSaving,
    showDelegadoModal,
    setShowDelegadoModal,
    delegadoMsg,
    saveDelegado,
    openNuevoDelegado,
    startEditDelegado,
    toggleDelegadoActive,
    reactivarCredenciales,
    eliminarDelegado,
    eliminarTodosDelegados,
  };
}