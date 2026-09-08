import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { IMeData, IPlayer, OnPlayersChange } from "./panel-types";
import type { IPlayerFormState } from "../components/panel/PlayerModal";

const emptyPlayerForm = (): IPlayerFormState => ({
  lastName: "",
  firstName: "",
  document: "",
  birthDate: "",
  role: "JUGADOR",
  position: "",
  jersey: "",
  hasInsurance: false,
  vaAlGym: false,
  gymPrecio: "",
  deadline: "10",
});

// Jugador ya registrado para ese DNI (se vincula sin duplicar)
export interface IPlayerEncontrado {
  id: string;
  firstName: string;
  lastName: string;
  equipos: { name: string; type: string }[];
}

/**
 * Alta / edición de jugadores (o cuerpo técnico): abre el modal con formulario
 * vacío o precargado, busca por DNI al escribir (debounce 450 ms), guarda
 * creación o actualización (incluye el caso CAMBIO_PRIMERA: mover a un jugador
 * que ya está como JUGADOR en otra PRIMERA) y permite quitar del equipo.
 */
export function usePlayerForm(
  token: string | null,
  teamId: string,
  me: IMeData | null,
  onPlayersChange: OnPlayersChange,
  onError: (msg: string) => void,
  onToast: (msg: string, type: "success" | "error" | "warning" | "info") => void
) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<IPlayer | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<IPlayerFormState>(emptyPlayerForm());
  const [cuentaPresupuesto, setCuentaPresupuesto] = useState(true);
  const [foundPlayer, setfoundPlayer] = useState<IPlayerEncontrado | null>(null);
  const [buscandoDni, setBuscandoDni] = useState(false);

  // Al escribir un DNI en alta: ¿ya existe? (debounce 450 ms)
  useEffect(() => {
    if (editing || !showForm) return;
    const dni = form.document.replace(/\D/g, "");
    if (dni.length < 6) {
      setfoundPlayer(null);
      setBuscandoDni(false);
      return;
    }
    setBuscandoDni(true);
    const t = setTimeout(async () => {
      try {
        const r = await apiFetch<{ found: boolean; player?: IPlayerEncontrado }>(
          `/players/by-document?document=${dni}`,
          {},
          token ?? undefined
        );
        setfoundPlayer(r.found ? (r.player ?? null) : null);
        // autocompletar datos si vino el jugador
        if (r.found && r.player) {
          setForm((f) => ({
            ...f,
            firstName: r.player!.firstName,
            lastName: r.player!.lastName,
          }));
        }
      } catch {
        setfoundPlayer(null);
      } finally {
        setBuscandoDni(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [form.document, editing, showForm, token]);

  function openNuevo() {
    setEditing(null);
    setForm(emptyPlayerForm());
    setCuentaPresupuesto(true);
    setFormError("");
    setShowForm(true);
  }

  function openEditar(p: IPlayer) {
    setEditing(p);
    setForm({
      lastName: p.lastName,
      firstName: p.firstName,
      document: p.document,
      birthDate: p.birthDate ? String(p.birthDate).slice(0, 10) : "",
      role: p.role ?? "JUGADOR",
      position: p.position ?? "",
      jersey: p.jersey != null ? String(p.jersey) : "",
      hasInsurance: p.hasInsurance ?? false,
      vaAlGym: p.vaAlGym ?? false,
      gymPrecio: p.gymPrecio != null ? String(p.gymPrecio) : "",
      deadline: String(p.deadline ?? 10),
    });
    setCuentaPresupuesto(p.cuentaPresupuesto ?? true);
    setFormError("");
    setShowForm(true);
  }

  async function savePlayer() {
    if (!token || !teamId) return;
    if (!form.lastName.trim() || !form.firstName.trim() || form.document.trim().length < 6) {
      setFormError("Completá apellido, nombre y un DNI válido (mín. 6 dígitos).");
      return;
    }
    setSaving(true);
    setFormError("");
    const body = {
      lastName: form.lastName.trim(),
      firstName: form.firstName.trim(),
      document: form.document.trim(),
      birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : null,
      role: form.role,
      position: form.position.trim() || null,
      jersey: form.jersey ? Number(form.jersey) : null,
      hasInsurance: form.hasInsurance,
      vaAlGym: form.vaAlGym,
      gymPrecio: form.gymPrecio ? Number(form.gymPrecio) : null,
      deadline: Math.min(31, Math.max(1, Number(form.deadline) || 10)),
      cuentaPresupuesto,
    };
    try {
      if (editing) {
        await apiFetch(`/players/${editing.id}`, { method: "PATCH", body: JSON.stringify({ ...body, teamId }) }, token);
      } else {
        await apiFetch(`/teams/${teamId}/players`, { method: "POST", body: JSON.stringify(body) }, token);
      }
      setShowForm(false);
      const updated = await apiFetch<IPlayer[]>(`/teams/${teamId}/players`, {}, token);
      onPlayersChange(() => updated);
      onToast(editing ? `Jugador actualizado: ${body.firstName} ${body.lastName}` : `Jugador agregado: ${body.firstName} ${body.lastName}`, "success");
    } catch (e) {
      const err = e as Error & { code?: string; playerId?: string; equipoActual?: { id: string; name: string } };
      // Ya es JUGADOR en otra PRIMERA → preguntar y mover (sin perder datos)
      if (!editing && err.code === "CAMBIO_PRIMERA" && err.playerId && err.equipoActual) {
        const aNombre = me?.teams.find((t) => t.id === teamId)?.name ?? "este equipo";
        const confirma = window.confirm(
          `${err.message}\n\n¿Moverlo a ${aNombre}? Saldrá automáticamente de ${err.equipoActual.name}. Se conservan todos sus datos, pagos y fichas médicas.`
        );
        if (confirma) {
          try {
            await apiFetch(`/players/${err.playerId}/cambiar-primera`, {
              method: "POST",
              body: JSON.stringify({
                deTeamId: err.equipoActual.id,
                aTeamId: teamId,
                position: form.position.trim() || null,
                jersey: form.jersey ? Number(form.jersey) : null,
                cuentaPresupuesto,
              }),
            }, token);
            setShowForm(false);
            const updated = await apiFetch<IPlayer[]>(`/teams/${teamId}/players`, {}, token);
            onPlayersChange(() => updated);
          } catch (e2) {
            setFormError((e2 as Error).message);
          }
        }
        return;
      }
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removePlayer(p: IPlayer) {
    if (!token || !teamId) return;
    const esTecnico = p.role !== "JUGADOR";
    const nombreEquipo = me?.teams.find((t) => t.id === teamId)?.name ?? "este equipo";
    const ok = window.confirm(
      esTecnico
        ? `¿Quitar a ${p.firstName} ${p.lastName} del cuerpo técnico de ${nombreEquipo}? (el jugador se elimina si no está en otro equipo)`
        : `¿Quitar a ${p.firstName} ${p.lastName} de ${nombreEquipo}? (el jugador se elimina si no está en otro equipo)`
    );
    if (!ok) return;
    try {
      await apiFetch(
        `/players/${p.id}`,
        { method: "DELETE", body: JSON.stringify({ teamId }) },
        token
      );
      onPlayersChange((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      onError((e as Error).message);
    }
  }

  return {
    showForm,
    setShowForm,
    editing,
    saving,
    formError,
    form,
    setForm,
    cuentaPresupuesto,
    setCuentaPresupuesto,
    foundPlayer,
    setfoundPlayer,
    buscandoDni,
    openNuevo,
    openEditar,
    savePlayer,
    removePlayer,
  };
}