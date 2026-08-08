import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, API, getToken, setToken } from "../lib/api";

interface Team {
  id: string;
  name: string;
  gender: string;
  type: string;
  category?: string | null;
  tier?: string | null;
}

// ---------- Fichas médicas / estudios ----------
type EstadoFicha = "VIGENTE" | "PROXIMO_A_VENCER" | "VENCIDO" | "SIN_CARGAR";

interface EstadoUnTipo {
  tipo: string;
  estado: EstadoFicha;
  vence?: string | null;
  hayDoc: boolean;
}

interface FichaEstado {
  porTipo: Record<string, EstadoUnTipo>;
  aptoFichas: boolean;
  faltantes: string[];
  bloqueantes: string[];
  resumen: string;
}

interface DocItem {
  id: string;
  tipo: string;
  descripcion?: string | null;
  fileName: string;
  mime: string;
  size: number;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  subidoPorId?: string | null;
  createdAt: string;
}

interface Player {
  id: string;
  lastName: string;
  firstName: string;
  document: string;
  birthDate?: string | null;
  status: string;
  role: string;
  position?: string | null;
  jersey?: number | null;
  hasInsurance?: boolean;
  payments: Array<{ month: string; paid: boolean; amount: number }>;
  estadoCuota?: {
    deudor: boolean;
    alDia: boolean;
    pendiente: boolean;
    puedeJugar: boolean;
    mesesDebe: number;
  };
  fichas?: FichaEstado;
  apto?: { puedeJugar: boolean; razones: string[] };
}

interface MeData {
  id: string;
  fullName: string;
  email: string;
  role: string;
  teams: Team[];
}

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Rango de meses desde enero del año actual hasta enero del próximo (13 columnas)
function monthRange(): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), i, 1); // Ene(0) -> Ene(12)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function monthShort(m: string) {
  const [, mo] = m.split("-");
  return MONTHS[Number(mo) - 1];
}

function labelTipo(t: string): string {
  switch (t) {
    case "FICHA_MEDICA": return "Ficha médica";
    case "ELECTROCARDIOGRAMA": return "Electro";
    case "ERGONOMETRIA": return "Ergo";
    case "OTRO": return "Doc";
    default: return t;
  }
}

// ¿La categoría es de mayores (C20+, PRIMERA, 1ra, ELITE...)? — misma regla que el server
function esCategoriaMayor(cat?: string | null): boolean {
  return /^C2[0-9]|^C9[0-9]|^PRIMERA|^1ra|^1er|ELITE|SENIOR|LIBRE|^MASC/i.test(cat ?? "");
}

// Tipos que bloquean según la categoría: mayores → ergo, menores → electro
function tiposBloqueantes(cat?: string | null): string[] {
  return esCategoriaMayor(cat) ? ["ERGONOMETRIA"] : ["ELECTROCARDIOGRAMA"];
}

// Badge compacto del estado de un tipo de documento
function BadgeFicha({ st }: { st: EstadoUnTipo | undefined }) {
  if (!st) return <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/40">—</span>;
  switch (st.estado) {
    case "VIGENTE":
      return <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/20 text-green-400">OK</span>;
    case "PROXIMO_A_VENCER":
      return <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300">pronto vence</span>;
    case "VENCIDO":
      return <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400">vencido</span>;
    case "SIN_CARGAR":
      return <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/40">sin cargar</span>;
  }
}

export default function Dashboard() {
  const token = getToken();
  const [me, setMe] = useState<MeData | null>(null);
  const [teamId, setTeamId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"lista" | "calendario">("lista");

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
  });

  function openNuevo() {
    setEditing(null);
    setForm({
      lastName: "", firstName: "", document: "", birthDate: "",
      role: "JUGADOR", position: "", jersey: "", hasInsurance: false,
    });
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
    });
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
    } catch (e) {
      setFormError((e as Error).message);
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

  function vigenciaHint(): string {
    const esMayor = esCategoriaMayor(categoriaActual);
    if (docForm.tipo === "ERGONOMETRIA") {
      return esMayor
        ? "Ergo (C20 en adelante): vence a los 2 años de la emisión. Obligatorio en esta categoría."
        : "Ergo no se exige en menores (C17 para abajo) — solo electro.";
    }
    if (docForm.tipo === "ELECTROCARDIOGRAMA") {
      return esMayor
        ? "Electro no se exige en mayores (C20 en adelante) — solo ergo."
        : "Electro (C17 para abajo): vence al año de la emisión. Obligatorio en esta categoría.";
    }
    return "Ficha médica y otros: sin vencimiento por regla (referencia).";
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


  useEffect(() => {
    if (!token) {
      window.location.href = "/ingresar";
      return;
    }
    apiFetch<MeData>("/auth/me", {}, token)
      .then((m) => {
        setMe(m);
        setTeamId(m.role === "ADMIN" && m.teams.length === 0 ? "" : m.teams[0]?.id ?? "");
      })
      .catch(() => {
        setToken(null);
        window.location.href = "/ingresar";
      })
      .finally(() => setLoading(false));
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

  async function toggleCuota(p: Player, month: string, paid: boolean) {
    if (!token) return;
    // Protección anti-accidente: quitar un pago ya registrado pide confirmación
    if (!paid) {
      const yaPago = p.payments.some((x) => x.month === month && x.paid);
      if (yaPago) {
        const ok = window.confirm(
          `¿Quitar el pago de la cuota ${monthShort(month)} de ${p.firstName} ${p.lastName}?`
        );
        if (!ok) return;
      }
    }
    try {
      const res = await apiFetch<{ estadoCuota: Player["estadoCuota"]; status: string }>(
        `/players/${p.id}/payments/${month}`,
        { method: "POST", body: JSON.stringify({ paid, amount: 0 }) },
        token
      );
      // refresh local con lo que devolvió el server (estado recalculado según día y mes)
      setPlayers((prev) =>
        prev.map((x) =>
          x.id === p.id
            ? {
                ...x,
                payments: [
                  { month, paid, amount: 0 },
                  ...x.payments.filter((y) => y.month !== month),
                ],
                estadoCuota: res.estadoCuota,
                status: res.status,
              }
            : x
        )
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Recalcular estado de cuota en cliente (misma regla que el server:
  // pago del 1 al 10; del día 11 sin pago del mes en curso = deudor, no juega)
  function estadoLocal(p: Player, now = new Date()): NonNullable<Player["estadoCuota"]> {
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const pagadoMesActual = p.payments.some((x) => x.month === cur && x.paid);
    const deudaPrevia = p.payments.filter((x) => !x.paid && x.month < cur).length;
    const vencio = now.getDate() > 10 && !pagadoMesActual;
    const deudor = deudaPrevia > 0 || vencio;
    return {
      deudor,
      alDia: pagadoMesActual && !deudor,
      pendiente: !pagadoMesActual && !vencio && !deudor,
      puedeJugar: !deudor,
      mesesDebe: deudaPrevia + (vencio ? 1 : 0),
    };
  }

  if (loading) return <div className="p-10">Cargando...</div>;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const months = monthRange();
  const tecnicos = players.filter((p) => p.role !== "JUGADOR");
  const plantel = players.filter((p) => p.role === "JUGADOR");

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Panel de delegado</h1>
          <p className="text-white/60 text-sm">Hola, {me?.fullName} — {me?.role === "ADMIN" ? "Administrador" : "Delegado"}</p>
        </div>
        <button
          onClick={() => { setToken(null); window.location.href = "/"; }}
          className="text-sm text-white/60 hover:text-red-400 border border-white/10 px-3 py-1.5 rounded-lg"
        >
          Salir
        </button>
      </div>

      {/* selector de equipo */}
      {me && me.teams.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="text-sm text-white/70">Estás viendo: </label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20"
          >
            {me.teams.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#1c1c1c]">
                {t.name}
              </option>
            ))}
          </select>

          {/* toggle de vista */}
          <div className="ml-auto flex rounded-lg border border-white/15 overflow-hidden">
            <button
              onClick={() => setView("lista")}
              className={`px-4 py-1.5 text-sm ${view === "lista" ? "bg-primary text-white" : "text-white/60 hover:text-white"}`}
            >
              Lista
            </button>
            <button
              onClick={() => setView("calendario")}
              className={`px-4 py-1.5 text-sm ${view === "calendario" ? "bg-primary text-white" : "text-white/60 hover:text-white"}`}
            >
              Calendario de cuotas
            </button>
            <button
              onClick={openNuevo}
              className="px-4 py-1.5 text-sm bg-primary-light text-primary-dark font-semibold hover:bg-white transition"
              title="Agregar jugador o cuerpo técnico"
            >
              + Agregar
            </button>
            <div className="flex rounded-lg border border-white/15 overflow-hidden">
              <button
                onClick={descargarPlantilla}
                disabled={exporting}
                className="px-3 py-1.5 text-xs font-semibold bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-50"
                title="Descargar plantilla Excel para cargar el plantel"
              >
                {exporting ? "Plantilla..." : "Plantilla"}
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-white/10 text-white/80 hover:bg-white/20"
                title="Importar plantel desde Excel"
              >
                Importar Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-red-400">{error}</p>}

      {/* Aviso: jugadores con documentación que bloquea */}
      {view === "lista" && plantel.some((p) => p.fichas && !p.fichas.aptoFichas) && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
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
      )}

      {/* ===================== VISTA LISTA ===================== */}
      {view === "lista" && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-white/60">
              <tr>
                <th className="p-3">Jugador</th>
                <th className="p-3">Rol</th>
                <th className="p-3">DNI</th>
                <th className="p-3">Estado de cuota</th>
                <th className="p-3">Fichas</th>
                <th className="p-3">
                  {monthShort(currentMonth)} {currentMonth.slice(0, 4)} — pagó
                  <span className="block text-[10px] opacity-60">cuota del mes en curso</span>
                </th>
                <th className="p-3">Deuda</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {plantel.map((p) => {
                const thisMonth = p.payments.find((x) => x.month === currentMonth);
                const ec = p.estadoCuota ?? estadoLocal(p);
                return (
                  <tr key={p.id} className={`border-t border-white/5 hover:bg-white/5 ${ec.deudor ? "bg-red-500/5" : ""}`}>
                    <td className="p-3">
                      <span className="font-semibold">{p.firstName} {p.lastName}</span>
                      {p.position && <span className="text-white/40 text-xs ml-1">({p.position})</span>}
                      {p.jersey && <span className="text-white/40 text-xs ml-1">#{p.jersey}</span>}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs bg-white/10`}>
                        {p.role}
                      </span>
                    </td>
                    <td className="p-3 text-white/60">{p.document}</td>
                    <td className="p-3">
                      {ec.deudor ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 font-semibold">
                          DEUDOR — no puede jugar ✕
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-xs ${ec.pendiente ? "bg-amber-500/20 text-amber-300" : "bg-green-500/20 text-green-400"}`}>
                          {ec.pendiente ? "Pendiente (hasta el 10)" : "Al día — puede jugar ✓"}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="flex flex-col gap-0.5" title={p.fichas?.resumen ?? "Sin datos de fichas"}>
                        <span className="flex items-center gap-1.5 flex-wrap">
                          {(p.fichas?.bloqueantes ?? tiposBloqueantes(categoriaActual)).map((t) => (
                            <span key={t} className="flex items-center gap-1.5">
                              <span className="text-[10px] text-white/40">{labelTipo(t)}</span>
                              <BadgeFicha st={p.fichas?.porTipo[t]} />
                            </span>
                          ))}
                        </span>
                        <span className="text-[10px] text-white/40">
                          {p.fichas?.aptoFichas ? "Fichas al día" : "Bloquea jugar ✕"}
                        </span>
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleCuota(p, currentMonth, !thisMonth?.paid)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${thisMonth?.paid ? "bg-green-500/30 text-green-300" : "bg-white/10 hover:bg-green-500/30"}`}
                      >
                        {thisMonth?.paid ? "Pagado ✓" : "Marcar pago"}
                      </button>
                    </td>
                    <td className="p-3 text-xs text-white/60">
                      {ec.mesesDebe > 0 ? `${ec.mesesDebe} ${ec.mesesDebe === 1 ? "mes" : "meses"} sin pagar` : "—"}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openDocs(p)}
                        className="px-2 py-1 rounded text-xs text-white/60 hover:text-white hover:bg-white/10"
                        title="Fichas y estudios del jugador"
                      >
                        Docs
                      </button>
                      <button
                        onClick={() => openEditar(p)}
                        className="px-2 py-1 rounded text-xs text-white/60 hover:text-white hover:bg-white/10"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => removePlayer(p)}
                        className="px-2 py-1 rounded text-xs text-white/60 hover:text-red-400 hover:bg-red-500/10"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {plantel.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-white/40">Sin jugadores en este equipo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================== VISTA CALENDARIO ===================== */}
      {view === "calendario" && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-white/60">
              <tr>
                <th className="p-3 sticky left-0 bg-[#141414] z-10">Jugador</th>
                {months.map((m) => (
                  <th key={m} className={`p-2 text-center ${m === currentMonth ? "bg-primary/20 text-primary-light" : ""}`}>
                    {monthShort(m)}
                    <span className="block text-[10px] opacity-60">{m.slice(2, 4)}</span>
                  </th>
                ))}
                <th className="p-3">Debe</th>
              </tr>
            </thead>
            <tbody>
              {plantel.map((p) => {
                const ec = p.estadoCuota ?? estadoLocal(p);
                return (
                  <tr key={p.id} className={`border-t border-white/5 hover:bg-white/5 ${ec.deudor ? "bg-red-500/5" : ""}`}>
                    <td className="p-3 sticky left-0 bg-[#1d1d1d] z-10">
                      <span className="font-semibold">{p.firstName} {p.lastName}</span>
                      {ec.deudor && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-red-500/25 text-red-300 font-semibold">
                          ✕ no juega
                        </span>
                      )}
                    </td>
                    {months.map((m) => {
                      const pay = p.payments.find((x) => x.month === m);
                      const esFuturo = m > currentMonth;
                      const clickeable = !esFuturo;
                      const paid = pay?.paid ?? false;
                      const marcado = pay !== undefined;
                      return (
                        <td key={m} className={`p-1 text-center ${esFuturo ? "opacity-30" : ""}`}>
                          <button
                            disabled={!clickeable}
                            onClick={() => toggleCuota(p, m, !paid)}
                            className={`w-full h-7 rounded-md text-xs font-semibold transition-colors ${
                              esFuturo
                                ? "bg-white/5 text-white/30 cursor-default"
                                : paid
                                  ? "bg-green-500/30 text-green-300 hover:bg-green-500/50"
                                  : marcado
                                    ? "bg-red-500/25 text-red-300 hover:bg-green-500/40"
                                    : "bg-white/5 text-white/40 hover:bg-white/10"
                            }`}
                          >
                            {esFuturo ? "·" : paid ? "✓" : marcado ? "✗" : "·"}
                          </button>
                        </td>
                      );
                    })}
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${ec.mesesDebe > 0 ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                        {ec.mesesDebe > 0 ? `${ec.mesesDebe} ${ec.mesesDebe === 1 ? "mes" : "meses"}` : "OK"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {plantel.length === 0 && (
                <tr><td colSpan={months.length + 2} className="p-6 text-center text-white/40">Sin jugadores en este equipo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================== CUERPO TÉCNICO (separado, sin pagos) ===================== */}
      {tecnicos.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-white/80 mb-3">Cuerpo técnico</h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-white/60">
                <tr>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3">DNI</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tecnicos.map((p) => (
                  <tr key={p.id} className="border-t border-white/5">
                    <td className="p-3 font-semibold">{p.firstName} {p.lastName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary-light">{p.role}</span>
                    </td>
                    <td className="p-3 text-white/60">{p.document}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openDocs(p)}
                        className="px-2 py-1 rounded text-xs text-white/60 hover:text-white hover:bg-white/10"
                      >
                        Docs
                      </button>
                      <button
                        onClick={() => openEditar(p)}
                        className="px-2 py-1 rounded text-xs text-white/60 hover:text-white hover:bg-white/10"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => removePlayer(p)}
                        className="px-2 py-1 rounded text-xs text-white/60 hover:text-red-400 hover:bg-red-500/10"
                      >
                        Quitar
                      </button>
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
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#1d1d1d] p-6">
            <h2 className="font-display text-lg font-bold">
              {editing ? `Editar: ${editing.firstName} ${editing.lastName}` : "Nuevo jugador / técnico"}
            </h2>
            <p className="text-xs text-white/50 mt-1">
              Cargar por DNI: si el jugador ya existe en otro equipo, solo se vincula acá.
            </p>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-white/60">Apellido *</span>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm"
                    placeholder="Pérez"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-white/60">Nombre *</span>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm"
                    placeholder="Juan"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-white/60">DNI *</span>
                  <input
                    value={form.document}
                    onChange={(e) => setForm({ ...form, document: e.target.value.replace(/\D/g, "") })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm"
                    placeholder="12345678"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-white/60">Fecha de nacimiento</span>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm [color-scheme:dark]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-white/60">Rol</span>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm"
                  >
                    <option value="JUGADOR" className="bg-[#1d1d1d]">Jugador</option>
                    <option value="DT" className="bg-[#1d1d1d]">DT</option>
                    <option value="AT" className="bg-[#1d1d1d]">AT</option>
                    <option value="PF" className="bg-[#1d1d1d]">PF</option>
                    <option value="DEL" className="bg-[#1d1d1d]">Delegado</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-white/60">Posición</span>
                  <input
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm"
                    placeholder="Ala, Cierre..."
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-white/60">N° camiseta</span>
                  <input
                    value={form.jersey}
                    onChange={(e) => setForm({ ...form, jersey: e.target.value.replace(/\D/g, "") })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm"
                    placeholder="10"
                  />
                </label>
                <label className="flex items-end gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={form.hasInsurance}
                    onChange={(e) => setForm({ ...form, hasInsurance: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-xs text-white/60">Tiene seguro/ficha hoy</span>
                </label>
              </div>

              {formError && <p className="text-red-400 text-sm">{formError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-white/15 text-sm hover:bg-white/5"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={savePlayer}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
                >
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===================== MODAL FICHAS / DOCUMENTOS ===================== */}
      {docsPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#1d1d1d] p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold">
                  Fichas: {docsPlayer.firstName} {docsPlayer.lastName}
                </h2>
                <p className="text-xs text-white/50 mt-1">
                  Ergo y electro bloquean el apto para jugar. La fecha de vencimiento es la que figura en el papel.
                </p>
              </div>
              <button
                onClick={() => setDocsPlayer(null)}
                className="text-white/50 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Estado general */}
            {docsEstado && (
              <div className={`mt-4 px-3 py-2 rounded-lg text-sm border ${docsEstado.aptoFichas ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
                {docsEstado.aptoFichas
                  ? "Apto por documentación ✓"
                  : "Documentación incompleta — no puede jugar ✕"}
                <span className="block text-xs opacity-80 mt-0.5">{docsEstado.resumen}</span>
              </div>
            )}

            {/* Formulario de subida */}
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <p className="text-sm font-semibold text-white/80">Subir documento</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-white/60">Tipo *</span>
                  <select
                    value={docForm.tipo}
                    onChange={(e) => setDocForm({ ...docForm, tipo: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm"
                  >
                    <option value="FICHA_MEDICA" className="bg-[#1d1d1d]">Ficha médica</option>
                    <option value="ELECTROCARDIOGRAMA" className="bg-[#1d1d1d]">Electrocardiograma</option>
                    <option value="ERGONOMETRIA" className="bg-[#1d1d1d]">Ergometría</option>
                    <option value="OTRO" className="bg-[#1d1d1d]">Otro</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-white/60">Fecha de emisión (del papel)</span>
                  <input
                    type="date"
                    value={docForm.fechaEmision}
                    onChange={(e) => setDocForm({ ...docForm, fechaEmision: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm [color-scheme:dark]"
                  />
                </label>
                <label className="block col-span-2">
                  <span className="text-xs text-white/40">{vigenciaHint()}</span>
                </label>
                <label className="block col-span-2">
                  <span className="text-xs text-white/60">Descripción (opcional)</span>
                  <input
                    value={docForm.descripcion}
                    onChange={(e) => setDocForm({ ...docForm, descripcion: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm"
                    placeholder="Renovación 2do semestre 2026"
                  />
                </label>
                <label className="block col-span-2">
                  <span className="text-xs text-white/60">Archivo (PDF o imagen, máx 2 MB) *</span>                  <input
                    type="file"
                    accept=".pdf,image/*,.jpg,.jpeg,.png"
                    onChange={(e) => setDocForm({ ...docForm, file: e.target.files?.[0] ?? null })}
                    className="mt-1 w-full text-sm text-white/70 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-sm file:font-semibold file:cursor-pointer"
                  />
                </label>
              </div>
              {docsMsg && <p className="text-sm text-white/60">{docsMsg}</p>}
              <button
                onClick={subirDoc}
                disabled={docsLoading}
                className="w-full px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
              >
                {docsLoading ? "Subiendo..." : "Subir documento"}
              </button>
            </div>

            {/* Lista de documentos cargados */}
            <div className="mt-5">
              <p className="text-sm font-semibold text-white/80 mb-2">Documentos cargados</p>
              {docsList.length === 0 && (
                <p className="text-sm text-white/40">Todavía no hay documentos cargados.</p>
              )}
              <ul className="space-y-2">
                {docsList.map((d) => {
                  const vence = d.fechaVencimiento ? new Date(d.fechaVencimiento) : null;
                  const vencido = vence && vence.getTime() < Date.now();
                  return (
                    <li key={d.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">
                          <span className="text-white/40 text-xs">{labelTipo(d.tipo)} · </span>
                          {d.fileName}
                        </p>
                        <p className="text-xs text-white/40">
                          {d.descripcion || ""}
                          {d.fechaEmision && (
                            <span className="text-white/40">
                              {" "}· emitido {new Date(d.fechaEmision).toLocaleDateString("es-AR")}
                            </span>
                          )}
                          {vence && (
                            <span className={vencido ? "text-red-400" : "text-white/50"}>
                              {" "}· vence {vence.toLocaleDateString("es-AR")}
                            </span>
                          )}
                          {!vence && " · sin fecha de vencimiento"}
                        </p>
                      </div>
                      <button
                        onClick={() => descargarDoc(d)}
                        className="px-2 py-1 rounded text-xs text-white/60 hover:text-white hover:bg-white/10"
                      >
                        Descargar
                      </button>
                      <button
                        onClick={() => borrarDoc(d)}
                        className="px-2 py-1 rounded text-xs text-white/60 hover:text-red-400 hover:bg-red-500/10"
                      >
                        Eliminar
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    {/* ===================== MODAL IMPORTAR EXCEL ===================== */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#1d1d1d] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold">Importar plantel desde Excel</h2>
                <p className="text-xs text-white/50 mt-1">
                  Descargá la <button className="underline text-primary-light" onClick={descargarPlantilla}>plantilla</button>,
                  completala y subila acá. El DNI es la clave: los jugadores ya existentes se actualizan y vinculan.
                </p>
              </div>
              <button
                onClick={() => { setShowImport(false); setImportMsg(null); setImportFile(null); }}
                className="text-white/50 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            {!importMsg && (
              <div className="mt-5 space-y-3">
                <label className="block">
                  <span className="text-xs text-white/60">Archivo .xlsx (máx 5 MB) *</span>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                    className="mt-1 w-full text-sm text-white/70 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-sm file:font-semibold file:cursor-pointer"
                  />
                </label>
                <button
                  onClick={importarExcel}
                  disabled={importing || !importFile}
                  className="w-full px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
                >
                  {importing ? "Importando..." : "Importar"}
                </button>
              </div>
            )}

            {importMsg && (
              <div className="mt-5 space-y-3">
                {importMsg.error ? (
                  <p className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                    {importMsg.error}
                  </p>
                ) : (
                  <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
                    {importMsg.creados} creados · {importMsg.actualizados} actualizados · {importMsg.vinculados} vinculados
                  </div>
                )}
                {importMsg.errores.length > 0 && (
                  <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm max-h-40 overflow-y-auto">
                    <p className="font-semibold mb-1">Filas con errores ({importMsg.errores.length}):</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {importMsg.errores.map((e, i) => (
                        <li key={i}>fila {e.fila}: {e.motivo}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => { setShowImport(false); setImportMsg(null); setImportFile(null); }}
                  className="w-full px-4 py-2 rounded-xl border border-white/15 text-sm hover:bg-white/5"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}