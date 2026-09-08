import { useEffect, useState } from "react";
import { apiFetch, getToken, setToken } from "./api";
import { IMeData, ITeam } from "./panel-types";
import type { CredFormState } from "../components/panel/CredencialesModal";

export type PanelView = "lista" | "calendario" | "presupuesto" | "delegados" | "poli";

/**
 * Sesión del panel: token, usuario (`me`), equipo seleccionado, listado de
 * todos los equipos (solo ADMIN) y el cambio de credenciales propio (una sola
 * vez, cuando `canChangeCredentials`). Redirige a /ingresar si no hay sesión.
 */
export function usePanelSession() {
  const token = getToken();
  const [me, setMe] = useState<IMeData | null>(null);
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<PanelView>("lista");
  const [allTeams, setallTeams] = useState<ITeam[]>([]);
  const [showCredModal, setShowCredModal] = useState(false);
  const [credForm, setCredForm] = useState<CredFormState>({ email: "", password: "", currentPassword: "" });
  const [credSaving, setCredSaving] = useState(false);
  const [credMsg, setCredMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const esAdmin = me?.role === "ADMIN";
  const categoriaActual = me?.teams.find((t) => t.id === teamId)?.category ?? null;

  useEffect(() => {
    const currentToken = getToken();
    if (!currentToken) {
      setToken(null);
      window.location.href = "/ingresar";
      return;
    }

    apiFetch<IMeData>("/auth/me", {}, currentToken)
      .then((m) => {
        setMe(m);
        setTeamId((prev) => prev || (m.role === "ADMIN" && m.teams.length === 0 ? "" : m.teams[0]?.id ?? ""));
      })
      .catch(() => {
        setToken(null);
        window.location.href = "/ingresar";
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch<ITeam[]>("/teams", {}, token)
      .then(setallTeams)
      .catch(() => setallTeams([]));
  }, [token]);

  // Guarda el cambio de email/contraseña propio (solo si canChangeCredentials).
  // El server lo marca como usado → esta es la única vez que puede autocambiarse.
  async function guardarCredenciales() {
    if (!token || !me) return;
    setCredSaving(true);
    setCredMsg(null);
    try {
      const res = await apiFetch<{ ok: boolean; email: string }>(
        "/auth/me/credentials",
        { method: "PATCH", body: JSON.stringify(credForm) },
        token
      );
      setCredMsg({ ok: true, text: `Listo. Tus credenciales se actualizaron (email: ${res.email}).` });
      // Recargar el /me para que refleje el canChangeCredentials: false
      const m = await apiFetch<IMeData>("/auth/me", {}, token);
      setMe(m);
      setTimeout(() => setShowCredModal(false), 1800);
    } catch (err) {
      setCredMsg({ ok: false, text: (err as Error).message });
    } finally {
      setCredSaving(false);
    }
  }

  function abrirCredenciales() {
    if (!me) return;
    setCredForm({ email: me.email ?? "", password: "", currentPassword: "" });
    setCredMsg(null);
    setShowCredModal(true);
  }

  function salir() {
    setToken(null);
    window.location.href = "/";
  }

  return {
    token,
    me,
    setMe,
    teamId,
    setTeamId,
    loading,
    view,
    setView,
    allTeams,
    esAdmin,
    categoriaActual,
    showCredModal,
    setShowCredModal,
    credForm,
    setCredForm,
    credSaving,
    credMsg,
    guardarCredenciales,
    abrirCredenciales,
    salir,
  };
}