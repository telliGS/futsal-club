import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { apiFetch, API, getToken, setToken } from "../lib/api";
import Layout from "../components/Layout";
import CalendarioView from "../components/panel/CalendarioView";
import DelegadosView from "../components/panel/DelegadosView";
import PoliView from "../components/panel/PoliView";
import PresupuestoView from "../components/panel/PresupuestoView";
import PlayerListView from "../components/panel/PlayerListView";
import PlayerModal from "../components/panel/PlayerModal";
import CredencialesModal from "../components/panel/CredencialesModal";
import PoliSlotModal from "../components/panel/PoliSlotModal";
import PoliExModal from "../components/panel/PoliExModal";
import ImportModal from "../components/panel/ImportModal";
import FichasModal from "../components/panel/FichasModal";
import DelegadoModal from "../components/panel/DelegadoModal";
import QuotaModal from "../components/panel/QuotaModal";
import GastoModal from "../components/panel/GastoModal";
import InactivoModal from "../components/panel/InactivoModal";
import SeguroModal from "../components/panel/SeguroModal";
import PagoModal from "../components/panel/PagoModal";
import GymModal from "../components/panel/GymModal";
import PagoGymModal from "../components/panel/PagoGymModal";
import { monthRange, monthShort, Icon } from "../lib/panel-helpers";
import { cn } from "../lib/cn";
import {
  Team,
  FichaEstado,
  DocItem,
  Player,
  Toast,
  MeData,
  DelegadoAdmin,
  PoliSlot,
  PoliBloque,
  PoliDia,
  PoliSemana,
  PresupuestoData,
  TotalPresupuesto,
  SeguroAvisos,
  GymAvisos,
} from "../lib/panel-types";

export default function Dashboard() {
  const token = getToken();
  const [me, setMe] = useState<MeData | null>(null);
  const [teamId, setTeamId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [view, setView] = useState<"lista" | "calendario" | "presupuesto" | "delegados" | "poli">("lista");
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [delegados, setDelegados] = useState<DelegadoAdmin[]>([]);
  const [delegadosLoading, setDelegadosLoading] = useState(false);
  const [delegadosError, setDelegadosError] = useState("");
  const [delegadoForm, setDelegadoForm] = useState<{
    fullName: string;
    email: string;
    password: string;
    role: "DELEGADO" | "ADMIN";
    teamIds: string[];
  }>({
    fullName: "",
    email: "",
    password: "",
    role: "DELEGADO",
    teamIds: [] as string[],
  });
  const [delegadoEditingId, setDelegadoEditingId] = useState<string | null>(null);
  const [delegadoSaving, setDelegadoSaving] = useState(false);
  const [showDelegadoModal, setShowDelegadoModal] = useState(false);
  const [delegadoMsg, setDelegadoMsg] = useState("");

  // ----- Toasts -----
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastCounter, setToastCounter] = useState(0);

  // ----- Exportación -----
  const [exportando, setExportando] = useState(false);

  // ----- Seguro (lista de asegurados + avisos) -----
  const [showSeguro, setShowSeguro] = useState(false);
  const [seguroAvisos, setSeguroAvisos] = useState<SeguroAvisos | null>(null);

  async function cargarAvisosSeguro() {
    if (!token) return;
    try {
      const r = await apiFetch<SeguroAvisos>("/seguro/avisos", {}, token);
      setSeguroAvisos(r);
    } catch {
      setSeguroAvisos(null);
    }
  }

  // ----- Gimnasio (lista de los que van + avisos + pagos mensuales) -----
  const [showGym, setShowGym] = useState(false);
  const [gymAvisos, setGymAvisos] = useState<GymAvisos | null>(null);
  const [gymPrecioGlobal, setGymPrecioGlobal] = useState<number | null>(null);

  async function cargarAvisosGym() {
    if (!token) return;
    try {
      const r = await apiFetch<GymAvisos>("/gym/avisos", {}, token);
      setGymAvisos(r);
      const cfg = await apiFetch<{ precio: number }>("/gym/config", {}, token);
      setGymPrecioGlobal(cfg.precio);
    } catch {
      setGymAvisos(null);
      setGymPrecioGlobal(null);
    }
  }

  useEffect(() => {
    cargarAvisosSeguro();
    cargarAvisosGym();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ---------- Cambio de credenciales propio (1 sola vez) ----------
  const [showCredModal, setShowCredModal] = useState(false);
  const [credForm, setCredForm] = useState({ email: "", password: "", currentPassword: "" });
  const [credSaving, setCredSaving] = useState(false);
  const [credMsg, setCredMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ---------- Poli ----------
  const [poliSemana, setPoliSemana] = useState<PoliDia[]>([]);
  const [poliSlots, setPoliSlots] = useState<PoliSlot[]>([]);
  const [poliLoading, setPoliLoading] = useState(false);
  const [poliError, setPoliError] = useState("");
  const [poliMsg, setPoliMsg] = useState("");
  const [poliSemanaOffset, setPoliSemanaOffset] = useState(0); // 0 = semana actual
  const [poliHoy, setPoliHoy] = useState<string | undefined>(); // "YYYY-MM-DD" en hora ARG (del server)
  const [showPoliSlotModal, setShowPoliSlotModal] = useState(false);
  const [poliSlotForm, setPoliSlotForm] = useState({
    dayOfWeek: 1,
    startTime: "19:00",
    endTime: "20:30",
    place: "Polideportivo",
    teamId: "",
    responsable: "",
    note: "",
  });
  const [poliSlotEditingId, setPoliSlotEditingId] = useState<string | null>(null);
  const [poliSlotSaving, setPoliSlotSaving] = useState(false);
  const [showPoliExModal, setShowPoliExModal] = useState<{ fecha: string; bloque?: PoliBloque } | null>(null);
  const [poliExForm, setPoliExForm] = useState({
    place: "",
    startTime: "",
    endTime: "",
    canceled: false,
    note: "",
    teamId: "",
  });
  const [poliExSaving, setPoliExSaving] = useState(false);

  // ---------- Alta / edición de jugadores ----------
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
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
  const [cuentaPresupuesto, setCuentaPresupuesto] = useState(true);

  // Jugador ya registrado para ese DNI (se vincula sin duplicar)
  interface PlayerEncontrado {
    id: string;
    firstName: string;
    lastName: string;
    equipos: { name: string; type: string }[];
  }
  const [foundPlayer, setFoundPlayer] = useState<PlayerEncontrado | null>(null);
  const [buscandoDni, setBuscandoDni] = useState(false);

  // Al escribir un DNI en alta: ¿ya existe? (debounce 450 ms)
  useEffect(() => {
    if (editing || !showForm) return;
    const dni = form.document.replace(/\D/g, "");
    if (dni.length < 6) {
      setFoundPlayer(null);
      setBuscandoDni(false);
      return;
    }
    setBuscandoDni(true);
    const t = setTimeout(async () => {
      try {
        const r = await apiFetch<{ found: boolean; player?: PlayerEncontrado }>(
          `/players/by-document?document=${dni}`,
          {},
          token ?? undefined
        );
        setFoundPlayer(r.found ? (r.player ?? null) : null);
        // autocompletar datos si vino el jugador
        if (r.found && r.player) {
          setForm((f) => ({
            ...f,
            firstName: r.player!.firstName,
            lastName: r.player!.lastName,
          }));
        }
      } catch {
        setFoundPlayer(null);
      } finally {
        setBuscandoDni(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [form.document, editing, showForm]);

  function openNuevo() {
    setEditing(null);
    setForm({
      lastName: "", firstName: "", document: "", birthDate: "",
      role: "JUGADOR", position: "", jersey: "", hasInsurance: false,
      vaAlGym: false, gymPrecio: "",
      deadline: "10",
    });
    setCuentaPresupuesto(true);
    setFormError("");
    setShowForm(true);
  }

  function openEditar(p: Player) {
    setEditing(p);
    setForm({
      lastName: p.lastName,
      firstName: p.firstName,
      document: p.document,
      birthDate: p.birthDate ? String(p.birthDate).slice(0, 10) : "",
      role: p.role ?? "JUGADOR",
      position: p.position ?? "",
      jersey: p.jersey != null ? String(p.jersey) : "",
      hasInsurance: Boolean((p as unknown as { hasInsurance?: boolean }).hasInsurance),
      vaAlGym: Boolean((p as unknown as { vaAlGym?: boolean }).vaAlGym),
      gymPrecio: (p as unknown as { gymPrecio?: number | null }).gymPrecio != null ? String((p as unknown as { gymPrecio?: number | null }).gymPrecio) : "",
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
      const updated = await apiFetch<Player[]>(`/teams/${teamId}/players`, {}, token);
      setPlayers(updated);
      mostrarToast(editing ? `Jugador actualizado: ${body.firstName} ${body.lastName}` : `Jugador agregado: ${body.firstName} ${body.lastName}`, "success");
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
            const updated = await apiFetch<Player[]>(`/teams/${teamId}/players`, {}, token);
            setPlayers(updated);
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

  async function removePlayer(p: Player) {
    if (!token) return;
    const ok = window.confirm(`¿Quitar a ${p.firstName} ${p.lastName} del equipo? (el jugador se elimina si no está en otro equipo)`);
    if (!ok) return;
    try {
      await apiFetch(`/players/${p.id}`, { method: "DELETE" }, token);
      setPlayers((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // ---------- Inactivo / Reactivar ----------
  // INACTIVO: deja de contar la cuota y su deuda se congela (no acumula
  // mientras está fuera). El mes de corte se elige en un modal (a veces se
  // tardan en marcar la baja — el corte va al mes en que dejó de jugar).
  // REACTIVAR: si tenía deuda real vuelve DEUDOR y no puede jugar hasta
  // ponerse al día.
  const [inactivoModal, setInactivoModal] = useState<Player | null>(null);
  const [inactivoMes, setInactivoMes] = useState(() => new Date().toISOString().slice(0, 7));

  function abrirInactivo(p: Player) {
    setInactivoMes(new Date().toISOString().slice(0, 7));
    setInactivoModal(p);
  }

  async function setInactivo(p: Player, desde: string) {
    if (!token) return;
    try {
      await apiFetch(
        `/players/${p.id}/status`,
        { method: "PATCH", body: JSON.stringify({ status: "INACTIVO", inactiveSince: desde }) },
        token
      );
      await recargarPlantel();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function reactivar(p: Player) {
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
      await recargarPlantel();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // ---------- Fichas / documentos médicos ----------
  const [docsPlayer, setDocsPlayer] = useState<Player | null>(null);
  const [docsList, setDocsList] = useState<DocItem[]>([]);
  const [docsEstado, setDocsEstado] = useState<FichaEstado | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsMsg, setDocsMsg] = useState("");
  const [docForm, setDocForm] = useState({
    tipo: "FICHA_MEDICA",
    descripcion: "",
    fechaEmision: "",
    file: null as File | null,
  });

  // Categoría del equipo seleccionado (para la regla ergo 2 años / electro 1 año)
  const categoriaActual = me?.teams.find((t) => t.id === teamId)?.category ?? null;

  // Equipos que el usuario puede operar en el cronograma:
  // el admin ve/edita todo; el delegado solo sus equipos (me.teams).
  // Los bloques "actividad libre" (sin equipo) siempre son de admin.
  const esAdmin = me?.role === "ADMIN";
  const equiposPoliEditables = esAdmin ? allTeams : (me?.teams ?? []);

  // ¿El usuario puede editar/borrar/activar un slot o bloque del cronograma?
  function puedeOperarPoli(teamIdSlot: string | null | undefined): boolean {
    if (esAdmin) return true;
    // Delegado: solo bloques de SUS equipos (un bloque sin equipo es de admin)
    if (!teamIdSlot) return false;
    return (me?.teams ?? []).some((t) => t.id === teamIdSlot);
  }

  function vigenciaHint(): string {
    if (docForm.tipo === "ERGONOMETRIA") {
      return "Ergo: vence a los 2 años de la emisión (se calcula automáticamente).";
    }
    if (docForm.tipo === "ELECTROCARDIOGRAMA") {
      return "Electro: vence al año de la emisión (se calcula automáticamente).";
    }
    if (docForm.tipo === "FICHA_MEDICA") {
      return "Ficha médica: vence a los 2 años de la emisión (se calcula automáticamente).";
    }
    return "Documento: sin vencimiento por regla.";
  }

  async function openDocs(p: Player) {
    if (!token) return;
    setDocsPlayer(p);
    setDocsMsg("");
    setDocForm({ tipo: "FICHA_MEDICA", descripcion: "", fechaEmision: "", file: null });
    setDocsLoading(true);
    try {
      const res = await apiFetch<{ documentos: DocItem[]; estado: FichaEstado }>(
        `/players/${p.id}/documents`, {}, token
      );
      setDocsList(res.documentos);
      setDocsEstado(res.estado);
    } catch (e) {
      setDocsMsg((e as Error).message);
    } finally {
      setDocsLoading(false);
    }
  }

  async function subirDoc() {
    if (!token || !docsPlayer || !docForm.file) {
      setDocsMsg("Elegí un archivo para subir.");
      return;
    }
    if (docForm.file.size > 2 * 1024 * 1024) {
      setDocsMsg("El archivo supera los 2 MB.");
      return;
    }
    setDocsLoading(true);
    setDocsMsg("");
    try {
      const buf = await docForm.file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      const b64 = btoa(binary);
      const res = await apiFetch<{ documento: DocItem; estado: FichaEstado }>(
        `/players/${docsPlayer.id}/documents`,
        {
          method: "POST",
          body: JSON.stringify({
            tipo: docForm.tipo,
            descripcion: docForm.descripcion.trim() || null,
            fileName: docForm.file.name,
            mime: docForm.file.type || "application/octet-stream",
            dataBase64: b64,
            fechaEmision: docForm.fechaEmision ? new Date(docForm.fechaEmision).toISOString() : null,
            categoria: categoriaActual,
          }),
        },
        token
      );
      setDocsList((prev) => [res.documento, ...prev]);
      setDocsEstado(res.estado);
      setDocForm({ tipo: "FICHA_MEDICA", descripcion: "", fechaEmision: "", file: null });
      setDocsMsg("Documento subido ✓");
    } catch (e) {
      setDocsMsg((e as Error).message);
    } finally {
      setDocsLoading(false);
    }
  }

  async function borrarDoc(doc: DocItem) {
    if (!token || !docsPlayer) return;
    const ok = window.confirm(`¿Eliminar "${doc.fileName}"?`);
    if (!ok) return;
    try {
      await apiFetch(`/players/${docsPlayer.id}/documents/${doc.id}`, { method: "DELETE" }, token);
      setDocsList((prev) => prev.filter((d) => d.id !== doc.id));
      const res = await apiFetch<{ estado: FichaEstado }>(
        `/players/${docsPlayer.id}/documents`, {}, token
      );
      setDocsEstado(res.estado);
      // refrescar el estado del jugador en la tabla
      try {
        const updated = await apiFetch<Player[]>(`/teams/${teamId}/players`, {}, token);
        setPlayers(updated);
      } catch { /* noop */ }
    } catch (e) {
      setDocsMsg((e as Error).message);
    }
  }

  async function descargarDoc(doc: DocItem) {
    if (!token || !docsPlayer) return;
    try {
      const res = await fetch(`${API}/players/${docsPlayer.id}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("No se pudo descargar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDocsMsg((e as Error).message);
    }
  }

  // ---------- Plantilla Excel + importación masiva ----------
  const [exporting, setExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{
    creados: number;
    actualizados: number;
    vinculados: number;
    errores: Array<{ fila: number; motivo: string }>;
    error?: string;
  } | null>(null);

  async function descargarPlantilla() {
    if (!token || !teamId) return;
    setExporting(true);
    try {
      const res = await fetch(`${API}/teams/${teamId}/template`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo descargar la plantilla");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function importarExcel() {
    if (!token || !teamId || !importFile) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const buf = await importFile.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      const res = await apiFetch<{
        creados: number;
        actualizados: number;
        vinculados: number;
        errores: Array<{ fila: number; motivo: string }>;
      }>(
        `/teams/${teamId}/import`,
        { method: "POST", body: JSON.stringify({ dataBase64: btoa(binary), fileName: importFile.name }) },
        token
      );
      setImportMsg({ ...res, error: undefined });
      // recargar el plantel
      const updated = await apiFetch<Player[]>(`/teams/${teamId}/players`, {}, token);
      setPlayers(updated);
    } catch (e) {
      setImportMsg({ creados: 0, actualizados: 0, vinculados: 0, errores: [], error: (e as Error).message });
    } finally {
      setImporting(false);
      setImportFile(null);
    }
  }

  // Recargar plantel (tras inactivar/reactivar/guardar)
  async function recargarPlantel() {
    if (!token || !teamId) return;
    const updated = await apiFetch<Player[]>(`/teams/${teamId}/players`, {}, token);
    setPlayers(updated);
  }


  // ---------- Presupuesto ----------
  const [presup, setPresup] = useState<PresupuestoData | null>(null);
  const [presupMes, setPresupMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [presupLoading, setPresupLoading] = useState(false);
  const [presupError, setPresupError] = useState("");
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaInput, setQuotaInput] = useState("");
  const [quotaSaving, setQuotaSaving] = useState(false);
  const [gastoModal, setGastoModal] = useState<null | { tipo: "fijo" | "extra"; mes?: string }>(null);
  const [gastoForm, setGastoForm] = useState({ nombre: "", monto: "" });
  const [gastoSaving, setGastoSaving] = useState(false);

  // ---------- Pago de cuota (monto + detalle) ----------
  const [pagoModal, setPagoModal] = useState<{ player: Player; month: string } | null>(null);
  const [pagoSaving, setPagoSaving] = useState(false);

  // ---------- Pago de gimnasio (monto + detalle, discrimina igual que la cuota) ----------
  const [pagoGymModal, setPagoGymModal] = useState<{ player: Player; month: string } | null>(null);
  const [pagoGymSaving, setPagoGymSaving] = useState(false);

  // ---------- Total del club (solo ADMIN) ----------
  const [verTotal, setVerTotal] = useState(false);
  const [totalData, setTotalData] = useState<TotalPresupuesto | null>(null);
  const [totalLoading, setTotalLoading] = useState(false);
  const [totalError, setTotalError] = useState("");

  const mesActual = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const formatPesos = (n: number | null | undefined): string => {
    if (n == null) return "—";
    return "$" + Math.round(n).toLocaleString("es-AR");
  };

  useEffect(() => {
    if (!teamId || !token) return;
    setPresupLoading(true);
    setPresupError("");
    apiFetch<PresupuestoData>(`/teams/${teamId}/presupuesto?mes=${presupMes}`, {}, token)
      .then(setPresup)
      .catch(() => {
        setPresup(null);
        setPresupError("No se pudo cargar el presupuesto");
      })
      .finally(() => setPresupLoading(false));
  }, [teamId, token, presupMes]);

  // Total del club: cargado on-demand (admin o delegado autenticado)
  useEffect(() => {
    if (!verTotal || !token) return;
    setTotalLoading(true);
    setTotalError("");
    apiFetch<TotalPresupuesto>(`/teams/presupuesto/total?mes=${presupMes}`, {}, token)
      .then(setTotalData)
      .catch(() => {
        setTotalData(null);
        setTotalError("No se pudo cargar el total del club");
      })
      .finally(() => setTotalLoading(false));
  }, [verTotal, token, presupMes, me?.role]);

  async function guardarQuota() {
    if (!token || !teamId) return;
    const n = Number(quotaInput.replace(/[^0-9]/g, ""));
    setQuotaSaving(true);
    try {
      await apiFetch(`/teams/${teamId}/quota`, { method: "PUT", body: JSON.stringify({ quota: n > 0 ? n : null }) }, token);
      setQuotaInput("");
      setShowQuotaModal(false);
      const updated = await apiFetch<PresupuestoData>(`/teams/${teamId}/presupuesto?mes=${presupMes}`, {}, token);
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
      const updated = await apiFetch<PresupuestoData>(`/teams/${teamId}/presupuesto?mes=${presupMes}`, {}, token);
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
      const updated = await apiFetch<PresupuestoData>(`/teams/${teamId}/presupuesto?mes=${presupMes}`, {}, token);
      setPresup(updated);
    } catch (e) {
      setPresupError((e as Error).message);
    }
  }

  useEffect(() => {
    const currentToken = getToken();
    if (!currentToken) {
      setToken(null);
      window.location.href = "/ingresar";
      return;
    }

    apiFetch<MeData>("/auth/me", {}, currentToken)
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
    if (!token || me?.role !== "ADMIN") return;
    setDelegadosLoading(true);
    apiFetch<DelegadoAdmin[]>("/auth/delegados", {}, token)
      .then(setDelegados)
      .catch(() => setDelegadosError("No se pudo cargar la lista de delegados"))
      .finally(() => setDelegadosLoading(false));
  }, [token, me?.role]);

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
      const m = await apiFetch<MeData>("/auth/me", {}, token);
      setMe(m);
      setTimeout(() => setShowCredModal(false), 1800);
    } catch (err) {
      setCredMsg({ ok: false, text: (err as Error).message });
    } finally {
      setCredSaving(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    apiFetch<Team[]>("/teams", {}, token)
      .then(setAllTeams)
      .catch(() => setAllTeams([]));
  }, [token]);

  useEffect(() => {
    if (!teamId || !token) return;
    apiFetch<Player[]>(`/teams/${teamId}/players`, {}, token)
      .then(setPlayers)
      .catch(() => {
        setPlayers([]);
        setError("No se pudo cargar el plantel");
      });
  }, [teamId, token]);

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

      const refreshed = await apiFetch<DelegadoAdmin[]>("/auth/delegados", {}, token);
      setDelegados(refreshed);
      setDelegadoForm({ fullName: "", email: "", password: "", role: "DELEGADO", teamIds: [] });
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
    setDelegadoForm({ fullName: "", email: "", password: "", role: "DELEGADO", teamIds: [] });
    setDelegadosError("");
    setShowDelegadoModal(true);
  }

  function startEditDelegado(d: DelegadoAdmin) {
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

  async function toggleDelegadoActive(d: DelegadoAdmin) {
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
  async function reactivarCredenciales(d: DelegadoAdmin) {
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

  async function eliminarDelegado(d: DelegadoAdmin) {
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

  // ===================== POLI (cronograma de entrenamiento) =====================

  function lunesDeSemana(offset: number): Date {
    // Lunes de la semana actual + offset semanas
    const now = new Date();
    const dow = now.getDay() === 0 ? 7 : now.getDay(); // 1=lun...7=dom
    const lun = new Date(now);
    lun.setDate(now.getDate() - (dow - 1) + offset * 7);
    lun.setHours(0, 0, 0, 0);
    return lun;
  }

  function fmtDay(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  async function cargarPoli() {
    if (!token) return;
    setPoliLoading(true);
    setPoliError("");
    try {
      const lun = lunesDeSemana(poliSemanaOffset);
      const dom = new Date(lun);
      dom.setDate(lun.getDate() + 6);
      const [sem, slots] = await Promise.all([
        apiFetch<PoliSemana>(`/poli/week?from=${fmtDay(lun)}&to=${fmtDay(dom)}`, {}, token),
        apiFetch<PoliSlot[]>("/poli/slots", {}, token),
      ]);
      setPoliSemana(sem.semana);
      setPoliHoy(sem.hoy);
      setPoliSlots(slots);
    } catch (err) {
      setPoliError((err as Error).message);
    } finally {
      setPoliLoading(false);
    }
  }

  useEffect(() => {
    if (view === "poli") cargarPoli();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, token, poliSemanaOffset]);

  function openNuevoPoliSlot() {
    setPoliSlotEditingId(null);
    setPoliSlotForm({
      dayOfWeek: 1,
      startTime: "19:00",
      endTime: "20:30",
      place: "Polideportivo",
      teamId: (esAdmin ? allTeams[0] : me?.teams?.[0])?.id ?? "",
      responsable: "",
      note: "",
    });
    setPoliError("");
    setShowPoliSlotModal(true);
  }

  function startEditPoliSlot(s: PoliSlot) {
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
    setShowPoliSlotModal(true);
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
      setShowPoliSlotModal(false);
      cargarPoli();
    } catch (err) {
      setPoliError((err as Error).message);
    } finally {
      setPoliSlotSaving(false);
    }
  }

  async function borrarPoliSlot(s: PoliSlot) {
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

  function abrirExcepcion(fecha: string, bloque?: PoliBloque) {
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

  const POLI_LUGARES_COLOR: Record<string, string> = {
    "Polideportivo": "bg-primary/15 border-primary/40 text-green-300",
    "La Toma": "bg-sky-500/10 border-sky-500/30 text-sky-300",
    "Palermo": "bg-amber-500/10 border-amber-500/30 text-amber-300",
    "Borja": "bg-purple-500/10 border-purple-500/30 text-purple-300",
    "Gimnasio": "bg-orange-500/10 border-orange-500/30 text-orange-300",
  };

  function placeColor(place: string): string {
    const base = POLI_LUGARES_COLOR[place];
    if (base) return base;
    if (/gym|gimnasio/i.test(place)) return POLI_LUGARES_COLOR["Gimnasio"];
    return "bg-surface-2 border-outline text-white/70";
  }

  function moverSemana(delta: number) {
    setPoliSemanaOffset((o) => o + delta);
  }

  async function togglePoliSlot(s: PoliSlot) {
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

  // Abrir el modal de pago de un jugador para un mes. Se usa desde la lista y
  // desde el calendario (celda vacía o ya marcada).
  function abrirPago(p: Player, month: string) {
    setPagoModal({ player: p, month });
  }

  // Guarda/actualiza el pago del mes con su monto real y detalle.
  async function guardarPago(amount: number, note: string) {
    if (!token || !pagoModal) return;
    const { player, month } = pagoModal;
    setPagoSaving(true);
    try {
      const res = await apiFetch<{ estadoCuota: Player["estadoCuota"]; status: string }>(
        `/players/${player.id}/payments/${month}`,
        { method: "POST", body: JSON.stringify({ paid: true, amount, note }) },
        token
      );
      setPlayers((prev) =>
        prev.map((x) =>
          x.id === player.id
            ? {
                ...x,
                payments: [
                  { month, paid: true, amount, note },
                  ...x.payments.filter((y) => y.month !== month),
                ],
                estadoCuota: res.estadoCuota,
                status: res.status,
              }
            : x
        )
      );
      setPagoModal(null);
      mostrarToast(`Pago de ${monthShort(month)} registrado (${formatPesos(amount)}).`, "success");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPagoSaving(false);
    }
  }

  // Quitar el pago (marca el mes como impago → cuenta como deuda).
  async function quitarPago() {
    if (!token || !pagoModal) return;
    const { player, month } = pagoModal;
    const ok = window.confirm(
      `¿Quitar el pago de la cuota ${monthShort(month)} de ${player.firstName} ${player.lastName}? Queda como impago (cuenta como deuda).`
    );
    if (!ok) return;
    setPagoSaving(true);
    try {
      const res = await apiFetch<{ estadoCuota: Player["estadoCuota"]; status: string }>(
        `/players/${player.id}/payments/${month}`,
        { method: "POST", body: JSON.stringify({ paid: false, amount: 0 }) },
        token
      );
      setPlayers((prev) =>
        prev.map((x) =>
          x.id === player.id
            ? {
                ...x,
                payments: [
                  { month, paid: false, amount: 0 },
                  ...x.payments.filter((y) => y.month !== month),
                ],
                estadoCuota: res.estadoCuota,
                status: res.status,
              }
            : x
        )
      );
      setPagoModal(null);
      mostrarToast(`Pago de ${monthShort(month)} quitado.`, "warning");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPagoSaving(false);
    }
  }

  // Poner el mes en NULO: ni pagado ni adeudado. Elimina el registro del mes
  // (ej. mes anterior a la incorporación del jugador: Mateo entró en febrero,
  // el enero "impago" que quedó mal no le corresponde → se saca).
  async function ponerNulo() {
    if (!token || !pagoModal) return;
    const { player, month } = pagoModal;
    const ok = window.confirm(
      `¿Quitar el registro de ${monthShort(month)} de ${player.firstName} ${player.lastName}?\n\nQueda vacío: ni pagado ni adeudado (útil cuando ese mes no le corresponde, ej. todavía no se había incorporado).`
    );
    if (!ok) return;
    setPagoSaving(true);
    try {
      const res = await apiFetch<{ estadoCuota: Player["estadoCuota"]; status: string }>(
        `/players/${player.id}/payments/${month}`,
        { method: "DELETE" },
        token
      );
      setPlayers((prev) =>
        prev.map((x) =>
          x.id === player.id
            ? {
                ...x,
                payments: x.payments.filter((y) => y.month !== month),
                estadoCuota: res.estadoCuota,
                status: res.status,
              }
            : x
        )
      );
      setPagoModal(null);
      mostrarToast(`Registro de ${monthShort(month)} quitado (nulo).`, "info");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPagoSaving(false);
    }
  }

  // ----- Pago de gimnasio (mismo flujo que la cuota, contra /gym) -----
  function abrirPagoGym(p: Player, month: string) {
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
      setPlayers((prev) =>
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
      mostrarToast(`Gym de ${monthShort(month)} registrado (${formatPesos(amount)}).`, "success");
    } catch (e) {
      setError((e as Error).message);
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
      setPlayers((prev) =>
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
      mostrarToast(`Gym de ${monthShort(month)} quitado.`, "warning");
    } catch (e) {
      setError((e as Error).message);
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
      setPlayers((prev) =>
        prev.map((x) =>
          x.id === player.id
            ? { ...x, gymPayments: (x.gymPayments ?? []).filter((y) => y.month !== month) }
            : x
        )
      );
      setPagoGymModal(null);
      mostrarToast(`Registro del gym de ${monthShort(month)} quitado (nulo).`, "info");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPagoGymSaving(false);
    }
  }

  // Estado del gym de un jugador para el mes actual (usa el mismo deadline).
  function estadoLocalGym(p: Player, now = new Date()): "PAGO" | "DEBE" | "PENDIENTE" {
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const deadline = p.deadline && p.deadline >= 1 && p.deadline <= 31 ? p.deadline : 10;
    const pago = (p.gymPayments ?? []).find((x) => x.month === cur);
    if (pago?.paid) return "PAGO";
    return now.getDate() > deadline ? "DEBE" : "PENDIENTE";
  }
  // regla de cuota: cada jugador tiene un día límite (default 10); al pasar
  // ese día sin pagar el mes en curso = deudor, no juega)
  function estadoLocal(p: Player, now = new Date()): NonNullable<Player["estadoCuota"]> {
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const deadline = p.deadline && p.deadline >= 1 && p.deadline <= 31 ? p.deadline : 10;
    const pagadoMesActual = p.payments.some((x) => x.month === cur && x.paid);
    const deudaPrevia = p.payments.filter((x) => !x.paid && x.month < cur).length;
    const vencio = now.getDate() > deadline && !pagadoMesActual;
    const deudor = deudaPrevia > 0 || vencio;
    return {
      deudor,
      alDia: pagadoMesActual && !deudor,
      pendiente: !pagadoMesActual && !vencio && !deudor,
      puedeJugar: !deudor,
      mesesDebe: deudaPrevia + (vencio ? 1 : 0),
    };
  }

  // ============================================================
  // TOASTS
  // ============================================================
  const mostrarToast = (message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    const id = toastCounter + 1;
    setToastCounter(id);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // ============================================================
  // EXPORTACIÓN A EXCEL
  // ============================================================
  const exportarExcel = () => {
    const jugadores = jugadoresBusqueda || [];
    if (jugadores.length === 0) {
      mostrarToast("No hay jugadores para exportar", "warning");
      return;
    }
    try {
      setExportando(true);
      const datos = jugadores.map((p, index) => {
        const ec = p.estadoCuota ?? estadoLocal(p);
        const estado = p.status === "INACTIVO"
          ? "Inactivo"
          : ec.deudor
            ? "Deudor"
            : ec.pendiente
              ? "Pendiente"
              : "Al día";
        return {
          "#": index + 1,
          "Apellido": p.lastName,
          "Nombre": p.firstName,
          "DNI": p.document,
          "Rol": p.role === "JUGADOR" ? "Jugador" : p.role,
          "Posición": p.position || "-",
          "Camiseta": p.jersey || "-",
          "Estado": estado,
          "Fichas": p.fichas?.aptoFichas ? "OK" : "Sin fichas",
          "Deuda (meses)": ec.mesesDebe || 0,
        };
      });
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(datos);
      XLSX.utils.book_append_sheet(wb, ws, "Jugadores");
      const nombreEquipo = me?.teams.find((t) => t.id === teamId)?.name || "equipo";
      const fecha = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `JH_${nombreEquipo}_jugadores_${fecha}.xlsx`);
      mostrarToast(`Exportados ${datos.length} jugadores`, "success");
    } catch (e) {
      mostrarToast("Error al exportar: " + (e as Error).message, "error");
    } finally {
      setExportando(false);
    }
  };

  if (loading) return <div className="p-10">Cargando...</div>;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const months = monthRange();
  const tecnicos = players.filter((p) => p.role !== "JUGADOR");
  // Jugadores que pagan acá (nativos o sin vínculo formativo)
  const plantel = players.filter((p) => p.role === "JUGADOR" && p.pagaAca !== false);
  const jugadoresFiltrados = plantel.filter((p) => {
  if (filtroEstado === "todos") return true;
  const ec = p.estadoCuota ?? estadoLocal(p);
  if (filtroEstado === "al_dia") return ec.alDia;
  if (filtroEstado === "pendiente") return ec.pendiente;
  if (filtroEstado === "deudor") return ec.deudor;
  if (filtroEstado === "inactivo") return p.status === "INACTIVO";
  return true;
});
// Aplicar búsqueda por nombre o DNI sobre los jugadores ya filtrados por estado
const jugadoresBusqueda = jugadoresFiltrados.filter((p) => {
  if (!busqueda.trim()) return true;
  const q = busqueda.toLowerCase().trim();
  return p.firstName.toLowerCase().includes(q) ||
         p.lastName.toLowerCase().includes(q) ||
         p.document.includes(q);
});
  // Jugadores de formativa que aparecen en este equipo pero pagan en su categoría
  const plantelSinCuota = players.filter((p) => p.role === "JUGADOR" && p.pagaAca === false);

  return (
    <Layout>
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Encabezado del panel: tarjeta con saludo + botón salir */}
      <div className="rounded-lg border border-outline bg-surface-1 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex w-12 h-12 rounded-lg bg-primary/15 border border-primary/30 items-center justify-center shrink-0">
            <img src="/escudo-jh.png" alt="" className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Panel de delegado</h1>
            <p className="text-white/60 text-sm mt-0.5">
              Hola, <span className="text-white/85 font-semibold">{me?.fullName}</span> — {me?.role === "ADMIN" ? "Administrador" : "Delegado"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {me?.role !== "ADMIN" && me?.canChangeCredentials && (
            <button
              onClick={() => { setCredForm({ email: me?.email ?? "", password: "", currentPassword: "" }); setCredMsg(null); setShowCredModal(true); }}
              className="text-sm text-white/70 hover:text-primary-light border border-outline px-3 py-1.5 rounded-lg transition-all duration-200 hover:border-primary/50 hover:bg-surface-2 active:scale-95"
            >
              Cambiar credenciales
            </button>
          )}
          <button
            onClick={() => { setToken(null); window.location.href = "/"; }}
            className="text-sm text-white/60 hover:text-red-400 border border-outline px-3 py-1.5 rounded-lg transition-all duration-200 hover:border-red-400/50 hover:bg-surface-2 active:scale-95"
          >
            Salir
          </button>
        </div>
      </div>

      {/* selector de equipo + acciones */}
      {me && me.teams.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="text-sm text-white/70">Est�s viendo: </label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface-1 border border-outline transition-colors duration-200 focus:outline-none focus:border-primary"
          >
            {me.teams.map((t) => (
              <option key={t.id} value={t.id} className="bg-surface-1">
                {t.name}
              </option>
            ))}
          </select>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSeguro(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-surface-1 border border-outline text-white/80 transition-all duration-200 hover:bg-surface-2 active:scale-95"
              title="Exportar la lista de asegurados para el seguro"
            >
              <Icon name="doc" className="w-3.5 h-3.5" />
              Seguro
            </button>
            <button
              onClick={() => setShowGym(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-surface-1 border border-outline text-white/80 transition-all duration-200 hover:bg-surface-2 active:scale-95"
              title="Lista del gimnasio, avisos y cuotas de gym por mes"
            >
              <Icon name="doc" className="w-3.5 h-3.5" />
              Gym
            </button>
            <button
              onClick={openNuevo}
              className="px-4 py-2 rounded-lg text-sm bg-primary text-white font-semibold transition-all duration-200 hover:bg-primary-light active:scale-95"
              title="Agregar jugador o cuerpo t�cnico"
            >
              + Agregar
            </button>
            <div className="flex rounded-lg border border-outline overflow-hidden">
              <button
                onClick={descargarPlantilla}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-surface-1 text-white/80 transition-all duration-200 hover:bg-surface-2 active:scale-95 disabled:opacity-50"
                title="Descargar plantilla Excel para cargar el plantel"
              >
                <Icon name="download" className="w-3.5 h-3.5" />
                {exporting ? "Generando..." : "Plantilla"}
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-surface-1 text-white/80 transition-all duration-200 hover:bg-surface-2 active:scale-95"
                title="Importar plantel desde Excel"
              >
                <Icon name="upload" className="w-3.5 h-3.5" />
                Importar
              </button>
              <button
                onClick={exportarExcel}
                disabled={exportando}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-surface-1 text-white/80 transition-all duration-200 hover:bg-surface-2 active:scale-95 disabled:opacity-50"
                title="Exportar lista de jugadores a Excel"
              >
                {exportando ? "Generando..." : "?? Exportar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* navegaci�n de vistas */}
      {me && (
        <div className="mt-4 flex rounded-lg border border-outline overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setView("lista")}
            className={cn('px-4 py-2 text-sm transition-all duration-200 active:scale-95 shrink-0 md:flex-1', view === "lista" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2")}
          >
            Lista
          </button>
          <button
            onClick={() => setView("calendario")}
            className={cn('px-4 py-2 text-sm transition-all duration-200 active:scale-95 shrink-0 md:flex-1', view === "calendario" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2")}
          >
            Cuotas
          </button>
          <button
            onClick={() => setView("presupuesto")}
            className={cn('px-4 py-2 text-sm transition-all duration-200 active:scale-95 shrink-0 md:flex-1', view === "presupuesto" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2")}
          >
            Presupuesto
          </button>
          {me?.role === "ADMIN" && (
            <button
              onClick={() => setView("delegados")}
              className={cn('px-4 py-2 text-sm transition-all duration-200 active:scale-95 shrink-0 md:flex-1', view === "delegados" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2")}
            >
              Delegados
            </button>
          )}
          <button
            onClick={() => setView("poli")}
            className={cn('px-4 py-2 text-sm transition-all duration-200 active:scale-95 shrink-0 md:flex-1', view === "poli" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2")}
          >
            Cronograma
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-red-400">{error}</p>}

      {/* Aviso: jugadores con documentación que bloquea */}
      {view === "lista" && plantel.some((p) => p.fichas && !p.fichas.aptoFichas) && (
  <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p className="text-sm font-semibold text-amber-300">
        ⚠ Algunos jugadores tienen documentación vencida o sin cargar — no pueden jugar hasta regularizar
      </p>
      <p className="text-xs text-amber-200/70 mt-1">
        {plantel
          .filter((p) => p.fichas && !p.fichas.aptoFichas)
          .map((p) => `${p.firstName} ${p.lastName} (${p.fichas!.resumen})`)
          .join(" · ")}
      </p>
    </div>
    <button
      onClick={() => {
        const deudores = plantel.filter((p) => p.fichas && !p.fichas.aptoFichas);
        if (deudores.length > 0) {
          const first = document.getElementById(`player-${deudores[0].id}`);
          if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }}
      className="px-4 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors text-sm font-medium whitespace-nowrap"
    >
      Ver jugadores
    </button>
  </div>
)}

      {/* Aviso: lista de asegurados desactualizada (altas/bajas pendientes) */}
      {seguroAvisos && seguroAvisos.total > 0 && (
  <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p className="text-sm font-semibold text-blue-300">
        📋 Cambios pendientes en la lista de asegurados
      </p>
      <p className="text-xs text-blue-200/70 mt-1">
        {seguroAvisos.altas > 0 && `${seguroAvisos.altas} alta${seguroAvisos.altas === 1 ? "" : "s"}`}
        {seguroAvisos.altas > 0 && seguroAvisos.bajas > 0 && " y "}
        {seguroAvisos.bajas > 0 && `${seguroAvisos.bajas} baja${seguroAvisos.bajas === 1 ? "" : "s"}`}
        {" "}— exportá la lista completa para actualizar el seguro.
      </p>
    </div>
    <button
      onClick={() => setShowSeguro(true)}
      className="px-4 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition-colors text-sm font-medium whitespace-nowrap"
    >
      Exportar lista
    </button>
  </div>
)}

      {/* Aviso: lista del gimnasio desactualizada (altas/bajas pendientes) */}
      {gymAvisos && gymAvisos.total > 0 && (
  <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p className="text-sm font-semibold text-green-300">
        💪 Cambios pendientes en la lista del gimnasio
      </p>
      <p className="text-xs text-green-200/70 mt-1">
        {gymAvisos.altas > 0 && `${gymAvisos.altas} alta${gymAvisos.altas === 1 ? "" : "s"}`}
        {gymAvisos.altas > 0 && gymAvisos.bajas > 0 && " y "}
        {gymAvisos.bajas > 0 && `${gymAvisos.bajas} baja${gymAvisos.bajas === 1 ? "" : "s"}`}
        {" "}— exportá la lista completa del gym para actualizarla.
      </p>
    </div>
    <button
      onClick={() => setShowGym(true)}
      className="px-4 py-1.5 rounded-lg bg-green-500/20 text-green-300 border border-green-500/40 hover:bg-green-500/30 transition-colors text-sm font-medium whitespace-nowrap"
    >
      Exportar lista
    </button>
  </div>
)}

      {/* ===================== VISTA LISTA ===================== */}
      {view === "lista" && (
        <PlayerListView
          jugadoresBusqueda={jugadoresBusqueda}
          jugadoresFiltrados={jugadoresFiltrados}
          plantel={plantel}
          plantelSinCuota={plantelSinCuota}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          filtroEstado={filtroEstado}
          setFiltroEstado={setFiltroEstado}
          currentMonth={currentMonth}
          categoriaActual={categoriaActual}
          estadoLocal={estadoLocal}
          abrirPago={abrirPago}
          abrirPagoGym={abrirPagoGym}
          estadoLocalGym={estadoLocalGym}
          abrirInactivo={abrirInactivo}
          reactivar={reactivar}
          openDocs={openDocs}
          openEditar={openEditar}
          removePlayer={removePlayer}
        />
      )}

      {/* ===================== VISTA CALENDARIO ===================== */}
      {view === "calendario" && (
        <CalendarioView
          plantel={plantel}
          months={months}
          currentMonth={currentMonth}
          abrirPago={abrirPago}
          estadoLocal={estadoLocal}
        />
      )}

      {/* ===================== VISTA DELEGADOS ===================== */}
      {view === "delegados" && me?.role === "ADMIN" && (
        <DelegadosView
          delegados={delegados}
          delegadosLoading={delegadosLoading}
          delegadosError={delegadosError}
          delegadoMsg={delegadoMsg}
          eliminarTodosDelegados={eliminarTodosDelegados}
          openNuevoDelegado={openNuevoDelegado}
          startEditDelegado={startEditDelegado}
          toggleDelegadoActive={toggleDelegadoActive}
          reactivarCredenciales={reactivarCredenciales}
          eliminarDelegado={eliminarDelegado}
        />
      )}

      {/* ===================== VISTA CRONOGRAMA DE ENTRENAMIENTO ===================== */}
      {view === "poli" && (
        <PoliView
          poliMsg={poliMsg}
          poliError={poliError}
          poliLoading={poliLoading}
          poliSemana={poliSemana}
          poliHoy={poliHoy}
          poliSlots={poliSlots}
          poliSemanaOffset={poliSemanaOffset}
          openNuevoPoliSlot={openNuevoPoliSlot}
          moverSemana={moverSemana}
          abrirExcepcion={abrirExcepcion}
          placeColor={placeColor}
          puedeOperarPoli={puedeOperarPoli}
          togglePoliSlot={togglePoliSlot}
          startEditPoliSlot={startEditPoliSlot}
          borrarPoliSlot={borrarPoliSlot}
        />
      )}

      {/* ===================== VISTA PRESUPUESTO ===================== */}
      {view === "presupuesto" && (
        <PresupuestoView
          presup={presup}
          presupMes={presupMes}
          setPresupMes={setPresupMes}
          mesActual={mesActual}
          presupLoading={presupLoading}
          presupError={presupError}
          verTotal={verTotal}
          setVerTotal={setVerTotal}
          formatPesos={formatPesos}
          setQuotaInput={setQuotaInput}
          setShowQuotaModal={setShowQuotaModal}
          openGastoModal={openGastoModal}
          borrarGasto={borrarGasto}
          totalData={totalData}
          totalLoading={totalLoading}
          totalError={totalError}
        />
      )}

      {/* ===================== CUERPO TÉCNICO (separado, sin pagos) ===================== */}
      {tecnicos.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-white/80 mb-3">Cuerpo técnico</h2>
<div className="overflow-x-auto rounded-lg border border-outline">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="panel-th">Nombre</th>
                  <th className="panel-th">Rol</th>
                  <th className="panel-th text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tecnicos.map((p) => (
                  <tr key={p.id} className="panel-tr">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="avatar">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</span>
                        <p className="font-semibold truncate">{p.firstName} {p.lastName}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-md text-xs bg-primary/20 text-primary-light font-semibold">
                        {p.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="row-actions">
                        <button
                          onClick={() => openDocs(p)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 transition-colors active:scale-90"
                          title="Fichas y estudios"
                        >
                          <Icon name="doc" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditar(p)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 transition-colors active:scale-90"
                          title="Editar"
                        >
                          <Icon name="edit" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removePlayer(p)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors active:scale-90"
                          title="Quitar del equipo"
                        >
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-white/40">
        <Link to="/" className="underline">Ver sitio público</Link>
      </p>

      {/* ===================== MODAL ALTA / EDICIÓN DE JUGADOR ===================== */}
      <PlayerModal
        showForm={showForm}
        setShowForm={setShowForm}
        editing={editing}
        form={form}
        setForm={setForm}
        saving={saving}
        formError={formError}
        foundPlayer={foundPlayer}
        buscandoDni={buscandoDni}
        cuentaPresupuesto={cuentaPresupuesto}
        setCuentaPresupuesto={setCuentaPresupuesto}
        savePlayer={savePlayer}
      />
      {/* ===================== MODAL FICHAS / DOCUMENTOS ===================== */}
      <FichasModal
        player={docsPlayer}
        setPlayer={setDocsPlayer}
        estado={docsEstado}
        form={docForm}
        setForm={setDocForm}
        list={docsList}
        loading={docsLoading}
        msg={docsMsg}
        vigenciaHint={vigenciaHint}
        subirDoc={subirDoc}
        descargarDoc={descargarDoc}
        borrarDoc={borrarDoc}
      />
    {/* ===================== MODAL DELEGADO ===================== */}
      <CredencialesModal
        show={showCredModal}
        setShow={setShowCredModal}
        credForm={credForm}
        setCredForm={setCredForm}
        credSaving={credSaving}
        credMsg={credMsg}
        guardarCredenciales={guardarCredenciales}
      />

      <DelegadoModal
        show={showDelegadoModal}
        setShow={setShowDelegadoModal}
        editingId={delegadoEditingId}
        form={delegadoForm}
        setForm={setDelegadoForm}
        allTeams={allTeams}
        error={delegadosError}
        saving={delegadoSaving}
        save={saveDelegado}
      />

      {/* ===================== MODAL BLOQUE SEMANAL (POLI) ===================== */}
      <PoliSlotModal
        show={showPoliSlotModal}
        setShow={setShowPoliSlotModal}
        editingId={poliSlotEditingId}
        form={poliSlotForm}
        setForm={setPoliSlotForm}
        esAdmin={esAdmin}
        equiposPoliEditables={equiposPoliEditables}
        error={poliError}
        saving={poliSlotSaving}
        save={savePoliSlot}
      />

      {/* ===================== MODAL EXCEPCIÓN PUNTUAL (POLI) ===================== */}
      <PoliExModal
        modal={showPoliExModal}
        setModal={setShowPoliExModal}
        form={poliExForm}
        setForm={setPoliExForm}
        esAdmin={esAdmin}
        equiposPoliEditables={equiposPoliEditables}
        error={poliError}
        saving={poliExSaving}
        save={saveExcepcion}
      />

      {/* ===================== MODAL CUOTA ===================== */}
      <QuotaModal
        show={showQuotaModal}
        setShow={setShowQuotaModal}
        categoria={presup?.categoria}
        quotaInput={quotaInput}
        setQuotaInput={setQuotaInput}
        saving={quotaSaving}
        save={guardarQuota}
      />

      {/* ===================== MODAL GASTO ===================== */}
      <GastoModal
        modal={gastoModal}
        setModal={setGastoModal}
        form={gastoForm}
        setForm={setGastoForm}
        saving={gastoSaving}
        mesActual={mesActual}
        save={guardarGasto}
      />

      {/* ===================== MODAL INACTIVO (elegir mes de corte) ===================== */}
      <InactivoModal
        player={inactivoModal}
        setPlayer={setInactivoModal}
        mes={inactivoMes}
        setMes={setInactivoMes}
        confirmar={setInactivo}
      />

      {/* ===================== MODAL IMPORTAR EXCEL ===================== */}
      <ImportModal
        show={showImport}
        close={() => { setShowImport(false); setImportMsg(null); setImportFile(null); }}
        importFile={importFile}
        setImportFile={setImportFile}
        importMsg={importMsg}
        setImportMsg={setImportMsg}
        importing={importing}
        importarExcel={importarExcel}
        descargarPlantilla={descargarPlantilla}
      />

      {/* ===================== MODAL SEGURO (lista de asegurados) ===================== */}
      <SeguroModal
        show={showSeguro}
        setShow={setShowSeguro}
        esAdmin={esAdmin}
        teams={esAdmin ? allTeams : (me?.teams ?? [])}
        teamId={teamId}
        token={token}
        onExportado={cargarAvisosSeguro}
        onMsg={mostrarToast}
      />

      {/* ===================== MODAL GIMNASIO (lista + avisos + pagos) ===================== */}
      <GymModal
        show={showGym}
        setShow={setShowGym}
        esAdmin={esAdmin}
        teams={esAdmin ? allTeams : (me?.teams ?? [])}
        teamId={teamId}
        token={token}
        precioGlobal={gymPrecioGlobal}
        setPrecioGlobal={setGymPrecioGlobal}
        onExportado={cargarAvisosGym}
        onMsg={mostrarToast}
      />

      {/* ===================== MODAL PAGO DE CUOTA (monto + detalle) ===================== */}
      <PagoModal
        modal={pagoModal}
        setModal={setPagoModal}
        cuotaSugerida={presup?.cuota ?? null}
        saving={pagoSaving}
        guardarPago={guardarPago}
        quitarPago={quitarPago}
        ponerNulo={ponerNulo}
      />

      {/* ===================== MODAL PAGO DE GIMNASIO (monto + detalle) ===================== */}
      <PagoGymModal
        modal={pagoGymModal}
        setModal={setPagoGymModal}
        precioGlobal={gymPrecioGlobal}
        saving={pagoGymSaving}
        guardarPago={guardarPagoGym}
        quitarPago={quitarPagoGym}
        ponerNulo={ponerNuloGym}
      />
    </div>

      {/* ===== TOASTS ===== */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => {
          const colors = {
            success: "border-green-500/50 bg-green-500/10 text-green-400",
            error: "border-red-500/50 bg-red-500/10 text-red-400",
            warning: "border-amber-500/50 bg-amber-500/10 text-amber-400",
            info: "border-blue-500/50 bg-blue-500/10 text-blue-400",
          };
          return (
            <div
              key={toast.id}
              className={cn('rounded-lg border px-4 py-3 text-sm animate-fade-up', colors[toast.type])}
              style={{ animationDuration: "0.3s" }}
            >
              {toast.message}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
