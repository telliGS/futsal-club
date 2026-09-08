import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api";
import { fmtDay, lunesDeSemana } from "./panel-helpers";
import { IPoliBloque, IPoliDia, IPoliSemana, IPoliSlot, ITeam } from "./panel-types";
import type { PoliExFormState } from "../components/panel/PoliExModal";
import type { PoliSlotFormState } from "../components/panel/PoliSlotModal";

const emptyPoliSlotForm = (): PoliSlotFormState => ({
  dayOfWeek: 1,
  startTime: "19:00",
  endTime: "20:30",
  place: "Polideportivo",
  teamId: "",
  responsable: "",
  note: "",
});

const emptyPoliExForm = (): PoliExFormState => ({
  teamId: "",
  place: "",
  startTime: "",
  endTime: "",
  canceled: false,
  note: "",
});

/**
 * Cronograma de entrenamientos: semana vista + bloques semanales (slots) +
 * excepciones puntuales. Se recarga cada vez que la vista es "poli" o cambia
 * el offset de semana. `esAdmin`, `allTeams` y `misTeams` determinan qué
 * equipos puede operar el usuario en cada bloque.
 */
export function usePoli(
  token: string | null,
  esAdmin: boolean,
  allTeams: ITeam[],
  misTeams: ITeam[] | undefined,
  view: string
) {
  const [poliSemana, setPoliSemana] = useState<IPoliDia[]>([]);
  const [poliSlots, setPoliSlots] = useState<IPoliSlot[]>([]);
  const [poliLoading, setPoliLoading] = useState(false);
  const [poliError, setPoliError] = useState("");
  const [poliMsg, setPoliMsg] = useState("");
  const [poliSemanaOffset, setPoliSemanaOffset] = useState(0); // 0 = semana actual
  const [poliHoy, setPoliHoy] = useState<string | undefined>(); // "YYYY-MM-DD" en hora ARG (del server)
  const [showPoliSlotModal, setshowPoliSlotModal] = useState(false);
  const [poliSlotForm, setPoliSlotForm] = useState<PoliSlotFormState>(emptyPoliSlotForm());
  const [poliSlotEditingId, setPoliSlotEditingId] = useState<string | null>(null);
  const [poliSlotSaving, setPoliSlotSaving] = useState(false);
  const [showPoliExModal, setShowPoliExModal] = useState<{ fecha: string; bloque?: IPoliBloque } | null>(null);
  const [poliExForm, setPoliExForm] = useState<PoliExFormState>(emptyPoliExForm());
  const [poliExSaving, setPoliExSaving] = useState(false);

  const equiposPoliEditables = esAdmin ? allTeams : (misTeams ?? []);
  // El admin puede operar todo; el delegado solo sus equipos (un bloque sin equipo es de admin)
  const puedeOperarPoli = (teamIdSlot: string | null | undefined): boolean => {
    if (esAdmin) return true;
    if (!teamIdSlot) return false;
    return (misTeams ?? []).some((t) => t.id === teamIdSlot);
  };

  const cargarPoli = useCallback(async () => {
    if (!token) return;
    setPoliLoading(true);
    setPoliError("");
    try {
      const lun = lunesDeSemana(poliSemanaOffset);
      const dom = new Date(lun);
      dom.setDate(lun.getDate() + 6);
      const [sem, slots] = await Promise.all([
        apiFetch<IPoliSemana>(`/poli/week?from=${fmtDay(lun)}&to=${fmtDay(dom)}`, {}, token),
        apiFetch<IPoliSlot[]>("/poli/slots", {}, token),
      ]);
      setPoliSemana(sem.semana);
      setPoliHoy(sem.hoy);
      setPoliSlots(slots);
    } catch (err) {
      setPoliError((err as Error).message);
    } finally {
      setPoliLoading(false);
    }
  }, [token, poliSemanaOffset]);

  // Cargar la semana cuando se entra a la vista "poli" o cambia el offset/semana
  useEffect(() => {
    if (view === "poli") cargarPoli();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, token, poliSemanaOffset]);

  function moverSemana(delta: number) {
    setPoliSemanaOffset((o) => o + delta);
  }

  async function togglePoliSlot(s: IPoliSlot) {
    if (!token) return;
    setPoliLoading(true);
    try {
      await apiFetch(`/poli/slots/${s.id}`, { method: "PATCH", body: JSON.stringify({ active: !s.active }) }, token);
      setPoliMsg(s.active ? "Bloque suspendido." : "Bloque reactivado.");
      setTimeout(() => setPoliMsg(""), 3000);
      await cargarPoli();
    } catch (err) {
      setPoliError((err as Error).message);
      setPoliLoading(false);
    }
  }

  function openNuevoPoliSlot() {
    setPoliSlotEditingId(null);
    setPoliSlotForm({
      ...emptyPoliSlotForm(),
      teamId: (esAdmin ? allTeams[0] : misTeams?.[0])?.id ?? "",
    });
    setPoliError("");
    setshowPoliSlotModal(true);
  }

  function startEditPoliSlot(s: IPoliSlot) {
    setPoliSlotEditingId(s.id);
    setPoliSlotForm({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      place: s.place,
      teamId: s.teamId ?? "",
      responsable: s.responsable ?? "",
      note: s.note ?? "",
    });
    setPoliError("");
    setshowPoliSlotModal(true);
  }

  async function savePoliSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setPoliSlotSaving(true);
    setPoliError("");
    try {
      const payload = {
        dayOfWeek: poliSlotForm.dayOfWeek,
        startTime: poliSlotForm.startTime,
        endTime: poliSlotForm.endTime,
        place: poliSlotForm.place,
        teamId: poliSlotForm.teamId || null,
        responsable: poliSlotForm.responsable || null,
        note: poliSlotForm.note || null,
      };
      if (poliSlotEditingId) {
        await apiFetch(`/poli/slots/${poliSlotEditingId}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
        setPoliMsg("Bloque actualizado.");
      } else {
        await apiFetch("/poli/slots", { method: "POST", body: JSON.stringify(payload) }, token);
        setPoliMsg("Bloque semanal creado.");
      }
      setTimeout(() => setPoliMsg(""), 3000);
      setshowPoliSlotModal(false);
      cargarPoli();
    } catch (err) {
      setPoliError((err as Error).message);
    } finally {
      setPoliSlotSaving(false);
    }
  }

  async function borrarPoliSlot(s: IPoliSlot) {
    if (!token) return;
    if (!window.confirm(`¿Eliminar el bloque ${s.startTime}-${s.endTime} (${s.place})?`)) return;
    setPoliLoading(true);
    try {
      await apiFetch(`/poli/slots/${s.id}`, { method: "DELETE" }, token);
      setPoliMsg("Bloque eliminado.");
      setTimeout(() => setPoliMsg(""), 3000);
      await cargarPoli();
    } catch (err) {
      setPoliError((err as Error).message);
      setPoliLoading(false);
    }
  }

  function abrirExcepcion(fecha: string, bloque?: IPoliBloque) {
    const defaultTeam = bloque?.team?.id ?? (esAdmin ? "" : (equiposPoliEditables[0]?.id ?? ""));
    setPoliExForm({
      place: bloque?.place ?? "",
      startTime: bloque?.startTime ?? "",
      endTime: bloque?.endTime ?? "",
      canceled: false,
      note: "",
      teamId: defaultTeam,
    });
    setPoliError("");
    setShowPoliExModal({ fecha, bloque });
  }

  async function saveExcepcion(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !showPoliExModal) return;
    setPoliExSaving(true);
    setPoliError("");
    const controller = new AbortController();
    const safetyId = setTimeout(() => { controller.abort(); setPoliExSaving(false); }, 15000);
    try {
      const bloque = showPoliExModal.bloque;
      const esExtra = !bloque || bloque.tipo === "EXTRA"; // "+ Extra" o editar un extra existente
      // Si el bloque ya tiene una excepción (plantilla modificada o extra existente),
      // la actualizamos/eliminamos en vez de crear una nueva (evita duplicados).
      const exId = bloque?.excepcion?.id ?? (bloque?.tipo === "EXTRA" && bloque.id.startsWith("extra-")
        ? bloque.id.replace("extra-", "")
        : null);

      if (exId) {
        if (poliExForm.canceled && bloque?.tipo === "EXTRA") {
          // Cancelar un extra = eliminarlo por completo (no queda rastro en la semana).
          await apiFetch(`/poli/exceptions/${exId}`, { method: "DELETE", signal: controller.signal } as RequestInit, token);
          setPoliMsg("Entrenamiento puntual eliminado.");
        } else {
          const patch = {
            ...(poliExForm.canceled ? { canceled: true } : {}),
            place: poliExForm.canceled ? null : (poliExForm.place || null),
            startTime: poliExForm.canceled ? null : (poliExForm.startTime || null),
            endTime: poliExForm.canceled ? null : (poliExForm.endTime || null),
            note: poliExForm.note || null,
          };
          await apiFetch(`/poli/exceptions/${exId}`, { method: "PATCH", body: JSON.stringify(patch), signal: controller.signal } as RequestInit, token);
          setPoliMsg(poliExForm.canceled ? "Entrenamiento cancelado para ese día." : "Cambio aplicado para ese día.");
        }
      } else {
        const payload = {
          date: showPoliExModal.fecha,
          slotId: esExtra ? null : bloque.id,
          // En un extra, teamId define la categoría que entrena; al modificar un
          // slot de plantilla el equipo se hereda del slot (teamId null).
          teamId: esExtra ? (poliExForm.teamId || null) : null,
          place: poliExForm.canceled ? null : (poliExForm.place || null),
          startTime: poliExForm.canceled ? null : (poliExForm.startTime || null),
          endTime: poliExForm.canceled ? null : (poliExForm.endTime || null),
          canceled: poliExForm.canceled,
          note: poliExForm.note || null,
        };
        await apiFetch("/poli/exceptions", { method: "POST", body: JSON.stringify(payload), signal: controller.signal } as RequestInit, token);
        setPoliMsg(poliExForm.canceled ? "Entrenamiento cancelado para ese día." : "Cambio aplicado para ese día.");
      }
      clearTimeout(safetyId);
      setTimeout(() => setPoliMsg(""), 3000);
      setShowPoliExModal(null);
      cargarPoli();
    } catch (err) {
      clearTimeout(safetyId);
      if ((err as Error).name !== "AbortError") {
        setPoliError((err as Error).message);
      }
    } finally {
      clearTimeout(safetyId);
      setPoliExSaving(false);
    }
  }

  return {
    poliSemana,
    poliSlots,
    poliLoading,
    poliError,
    poliMsg,
    poliSemanaOffset,
    setPoliSemanaOffset,
    poliHoy,
    showPoliSlotModal,
    setshowPoliSlotModal,
    poliSlotForm,
    setPoliSlotForm,
    poliSlotEditingId,
    poliSlotSaving,
    showPoliExModal,
    setShowPoliExModal,
    poliExForm,
    setPoliExForm,
    poliExSaving,
    cargarPoli,
    openNuevoPoliSlot,
    startEditPoliSlot,
    savePoliSlot,
    borrarPoliSlot,
    abrirExcepcion,
    saveExcepcion,
    moverSemana,
    togglePoliSlot,
    puedeOperarPoli,
    equiposPoliEditables,
  };
}