import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, API, getToken, setToken } from "../lib/api";
import Layout from "../components/Layout";

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
  inactiveSince?: string | null; // hasta dónde jugó (ISO) — inactivo
  role: string;
  position?: string | null;
  jersey?: number | null;
  cuentaPresupuesto?: boolean;
  // Regla nativo/formativa: el jugador paga la cuota en este equipo (true)
  // o en su categoría formativa (false — aparece pero sin opciones de pago)
  esFormativos?: boolean;
  pagaAca?: boolean;
  categoriaPago?: string[];
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
  canChangeCredentials?: boolean;
  teams: Team[];
}

interface DelegadoAdmin {
  id: string;
  fullName: string;
  email: string;
  role: string;
  active: boolean;
  canChangeCredentials?: boolean;
  teamAccess: Array<{ team: Team }>;
}

// ---------- Poli (cronograma de entrenamiento) ----------
interface PoliSlot {
  id: string;
  dayOfWeek: number; // 1=lun ... 7=dom
  startTime: string;
  endTime: string;
  place: string;
  teamId: string | null;
  responsable: string | null;
  note: string | null;
  active: boolean;
  team: { id: string; name: string } | null;
}

interface PoliBloque {
  id: string;
  tipo: "PLANTILLA" | "EXTRA";
  startTime: string;
  endTime: string;
  place: string;
  team: { id: string; name: string } | null;
  responsable?: string | null;
  note?: string | null;
  excepcion?: {
    id: string;
    canceled: boolean;
    place?: string;
    startTime?: string;
    endTime?: string;
    note?: string;
    slotId: string | null;
  } | null;
}

interface PoliPartido {
  id: string;
  time: string;
  rival: string;
  isHome: boolean;
  venue: string;
  team: { id: string; name: string };
}

interface PoliDia {
  fecha: string;
  dia: string;
  bloques: PoliBloque[];
  partidos: PoliPartido[];
}

interface PoliSemana {
  from: string;
  to: string;
  semana: PoliDia[];
  hoy?: string;
}

// ---------- Presupuesto ----------
interface GastoItem {
  id: string;
  nombre: string;
  monto: number;
  mes?: string | null;
}

interface PresupuestoData {
  teamId: string;
  categoria: string;
  mes: string;
  jugadores: number;
  cuota: number | null;
  jugadoresExcluidos: number;
  gastosFijos: GastoItem[];
  gastosExtra: GastoItem[];
  resultado: {
    ingreso: number;
    gastos: number;
    balance: number;
    cuotaMinima: number | null;
    cuotaRecomendada: number | null;
    recomendacionSana: boolean;
  };
}

// Total del club (ADMIN): un renglón por equipo + totales
interface TotalEquipo {
  teamId: string;
  categoria: string;
  tipo: string;
  jugadores: number;
  cuota: number;
  ingreso: number;
  gastosFijos: number;
  gastosExtra: number;
  gastos: number;
  balance: number;
  deuda: number;
}

interface TotalPresupuesto {
  mes: string;
  porEquipo: TotalEquipo[];
  totales: {
    jugadores: number;
    ingreso: number;
    gastos: number;
    deuda: number;
    balance: number;
  };
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
  if (!st) return <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-surface-2 text-white/45">—</span>;
  switch (st.estado) {
    case "VIGENTE":
      return <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-green-500/20 text-green-400">OK</span>;
    case "PROXIMO_A_VENCER":
      return <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-500/20 text-amber-300">pronto vence</span>;
    case "VENCIDO":
      return <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-red-500/20 text-red-400">vencido</span>;
    case "SIN_CARGAR":
      return <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-surface-2 text-white/45">sin cargar</span>;
  }
}

// ---------- Iconos SVG del panel (stroke, monocromo, iguales en cualquier SO) ----------
const ICONS = {
  doc: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </>
  ),
  edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </>
  ),
  pause: (
    <>
      <rect x="7" y="4" width="3.5" height="16" rx="1" />
      <rect x="13.5" y="4" width="3.5" height="16" rx="1" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5-11-6.5Z" />,
  check: <path d="M4.5 12.5l5 5L19.5 7" />,
  nulo: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6.5 6.5l11 11" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 20h16" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
} as const;

function Icon({ name, className = "w-4 h-4" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

export default function Dashboard() {
  const token = getToken();
  const [me, setMe] = useState<MeData | null>(null);
  const [teamId, setTeamId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"lista" | "calendario" | "presupuesto" | "delegados" | "poli">("lista");
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [delegados, setDelegados] = useState<DelegadoAdmin[]>([]);
  const [delegadosLoading, setDelegadosLoading] = useState(false);
  const [delegadosError, setDelegadosError] = useState("");
  const [delegadoForm, setDelegadoForm] = useState({
    fullName: "",
    email: "",
    password: "",
    teamIds: [] as string[],
  });
  const [delegadoEditingId, setDelegadoEditingId] = useState<string | null>(null);
  const [delegadoSaving, setDelegadoSaving] = useState(false);
  const [showDelegadoModal, setShowDelegadoModal] = useState(false);
  const [delegadoMsg, setDelegadoMsg] = useState("");

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
        teamIds: delegadoForm.teamIds,
      };

      if (delegadoEditingId) {
        await apiFetch(`/auth/delegados/${delegadoEditingId}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
      } else {
        await apiFetch("/auth/delegados", { method: "POST", body: JSON.stringify(payload) }, token);
      }

      const refreshed = await apiFetch<DelegadoAdmin[]>("/auth/delegados", {}, token);
      setDelegados(refreshed);
      setDelegadoForm({ fullName: "", email: "", password: "", teamIds: [] });
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
    setDelegadoForm({ fullName: "", email: "", password: "", teamIds: [] });
    setDelegadosError("");
    setShowDelegadoModal(true);
  }

  function startEditDelegado(d: DelegadoAdmin) {
    setDelegadoEditingId(d.id);
    setDelegadoForm({
      fullName: d.fullName,
      email: d.email,
      password: "",
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
      teamId: allTeams[0]?.id ?? "",
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
    try {
      await apiFetch(`/poli/slots/${s.id}`, { method: "DELETE" }, token);
      setPoliMsg("Bloque eliminado.");
      setTimeout(() => setPoliMsg(""), 3000);
      cargarPoli();
    } catch (err) {
      setPoliError((err as Error).message);
    }
  }

  function abrirExcepcion(fecha: string, bloque?: PoliBloque) {
    setPoliExForm({
      place: bloque?.place ?? "",
      startTime: bloque?.startTime ?? "",
      endTime: bloque?.endTime ?? "",
      canceled: false,
      note: "",
      teamId: bloque?.team?.id ?? "",
    });
    setPoliError("");
    setShowPoliExModal({ fecha, bloque });
  }

  async function saveExcepcion(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !showPoliExModal) return;
    setPoliExSaving(true);
    setPoliError("");
    try {
      const bloque = showPoliExModal.bloque;
      const esExtra = !bloque; // "+ Extra": entrenamiento puntual nuevo
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
      await apiFetch("/poli/exceptions", { method: "POST", body: JSON.stringify(payload) }, token);
      setPoliMsg(poliExForm.canceled ? "Entrenamiento cancelado para ese día." : "Cambio aplicado para ese día.");
      setTimeout(() => setPoliMsg(""), 3000);
      setShowPoliExModal(null);
      cargarPoli();
    } catch (err) {
      setPoliError((err as Error).message);
    } finally {
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
    try {
      await apiFetch(`/poli/slots/${s.id}`, { method: "PATCH", body: JSON.stringify({ active: !s.active }) }, token);
      setPoliMsg(s.active ? "Bloque suspendido." : "Bloque reactivado.");
      setTimeout(() => setPoliMsg(""), 3000);
      cargarPoli();
    } catch (err) {
      setPoliError((err as Error).message);
    }
  }

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

  // Poner un mes en NULO: ni pagado ni adeudado. Elimina el registro del mes
  // (ej. mes anterior a la incorporación del jugador: Mateo entró en febrero,
  // el enero "impago" que quedó mal no le corresponde → se saca).
  async function quitarRegistro(p: Player, month: string) {
    if (!token) return;
    const ok = window.confirm(
      `¿Quitar el registro de ${monthShort(month)} de ${p.firstName} ${p.lastName}?\n\nQueda vacío: ni pagado ni adeudado (útil cuando ese mes no le corresponde, ej. todavía no se había incorporado).`
    );
    if (!ok) return;
    try {
      const res = await apiFetch<{ estadoCuota: Player["estadoCuota"]; status: string }>(
        `/players/${p.id}/payments/${month}`,
        { method: "DELETE" },
        token
      );
      setPlayers((prev) =>
        prev.map((x) =>
          x.id === p.id
            ? {
                ...x,
                payments: x.payments.filter((y) => y.month !== month),
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

  // Menú de 3 estados para una celda con registro (calendario): al tocar un
  // mes ya marcado (pagado o impago) se puede cambiar a pagado, impago o a
  // NULL (quitar el registro — para meses que no le corresponden).
  async function ponerEstado(p: Player, month: string) {
    if (!token) return;
    const actual = p.payments.find((x) => x.month === month);
    const opcion = window.prompt(
      `Estado de ${monthShort(month)} para ${p.firstName} ${p.lastName}:\n\n` +
        `1 = Pagado\n2 = Impago (cuenta como deuda)\n3 = Nulo (ni pagado ni adeudado — sin registro)\n\n` +
        `Respondé 1, 2 o 3. Cancelá para no tocar nada.`,
      actual ? (actual.paid ? "1" : "2") : "1"
    );
    if (opcion === null) return;
    const v = opcion.trim();
    if (v === "1") await toggleCuota(p, month, true);
    else if (v === "2") await toggleCuota(p, month, false);
    else if (v === "3") await quitarRegistro(p, month);
  }
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
  // Jugadores que pagan acá (nativos o sin vínculo formativo)
  const plantel = players.filter((p) => p.role === "JUGADOR" && p.pagaAca !== false);
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

      {/* selector de equipo */}
      {me && me.teams.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="text-sm text-white/70">Estás viendo: </label>
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

{/* toggle de vista + acciones */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-outline overflow-hidden">
              <button
                onClick={() => setView("lista")}
                className={`px-4 py-1.5 text-sm transition-all duration-200 active:scale-95 ${view === "lista" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2"}`}
              >
                Lista
              </button>
              <button
                onClick={() => setView("calendario")}
                className={`px-4 py-1.5 text-sm transition-all duration-200 active:scale-95 ${view === "calendario" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2"}`}
              >
                Calendario de cuotas
              </button>
              <button
                onClick={() => setView("presupuesto")}
                className={`px-4 py-1.5 text-sm transition-all duration-200 active:scale-95 ${view === "presupuesto" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2"}`}
              >
                Presupuesto
              </button>
              {me?.role === "ADMIN" && (
                <button
                  onClick={() => setView("delegados")}
                  className={`px-4 py-1.5 text-sm transition-all duration-200 active:scale-95 ${view === "delegados" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2"}`}
                >
                  Delegados
                </button>
              )}
              <button
                onClick={() => setView("poli")}
                className={`px-4 py-1.5 text-sm transition-all duration-200 active:scale-95 ${view === "poli" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2"}`}
              >
                Cronograma
              </button>
            </div>
            <button
              onClick={openNuevo}
              className="px-4 py-1.5 rounded-lg text-sm bg-primary text-white font-semibold transition-all duration-200 hover:bg-primary-light active:scale-95"
              title="Agregar jugador o cuerpo técnico"
            >
              + Agregar
            </button>
            <div className="flex rounded-lg border border-outline overflow-hidden">
              <button
                onClick={descargarPlantilla}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-surface-1 text-white/80 transition-all duration-200 hover:bg-surface-2 active:scale-95 disabled:opacity-50"
                title="Descargar plantilla Excel para cargar el plantel"
              >
                <Icon name="download" className="w-3.5 h-3.5" />
                {exporting ? "Generando..." : "Plantilla"}
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-surface-1 text-white/80 transition-all duration-200 hover:bg-surface-2 active:scale-95"
                title="Importar plantel desde Excel"
              >
                <Icon name="upload" className="w-3.5 h-3.5" />
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
        <>
          {/* Resumen del equipo: contadores de estado */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card p-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-lg">👥</span>
              <div>
                <p className="font-display font-bold text-xl leading-none">
                  {plantel.filter((p) => p.status !== "INACTIVO").length +
                    plantelSinCuota.filter((p) => p.status !== "INACTIVO").length}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">Jugadores</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-green-500/15 border border-green-500/25 flex items-center justify-center text-lg">✓</span>
              <div>
                <p className="font-display font-bold text-xl leading-none text-green-400">
                  {plantel.filter((p) => p.status !== "INACTIVO" && (p.estadoCuota ?? estadoLocal(p)).alDia).length}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">Al día</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-lg">⏳</span>
              <div>
                <p className="font-display font-bold text-xl leading-none text-amber-300">
                  {plantel.filter((p) => p.status !== "INACTIVO" && (p.estadoCuota ?? estadoLocal(p)).pendiente).length}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">Pendientes (1-10)</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center text-lg">✕</span>
              <div>
                <p className="font-display font-bold text-xl leading-none text-red-400">
                  {plantel.filter((p) => p.status !== "INACTIVO" && (p.estadoCuota ?? estadoLocal(p)).deudor).length}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">Con deuda</p>
              </div>
            </div>
          </div>

          {/* ===== JUGADORES EN MÓVIL: tarjetas (tabla solo en md+) ===== */}
          <div className="md:hidden mt-4 space-y-2">
            {[
              ...plantel.filter((x) => x.status !== "INACTIVO"),
              ...plantel.filter((x) => x.status === "INACTIVO"),
            ].map((p) => {
              const thisMonth = p.payments.find((x) => x.month === currentMonth);
              const ec = p.estadoCuota ?? estadoLocal(p);
              return (
                <div key={p.id} className={`card p-3 ${p.status === "INACTIVO" ? "opacity-70" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="avatar w-8 h-8 text-xs">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="text-[11px] text-white/40 truncate">
                        {p.role === "JUGADOR" ? "Jugador" : p.role}
                        {p.position && ` · ${p.position}`}
                        {p.jersey != null && <span className="font-mono"> · #{p.jersey}</span>}
                      </p>
                    </div>
                    {p.status === "INACTIVO" ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-md text-[11px] bg-surface-2 text-white/50 font-semibold">
                        Inactivo
                      </span>
                    ) : ec.deudor ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-md text-[11px] bg-red-500/20 text-red-400 font-semibold">
                        Deudor
                      </span>
                    ) : (
                      <span className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold ${ec.pendiente ? "bg-amber-500/20 text-amber-300" : "bg-green-500/20 text-green-400"}`}>
                        {ec.pendiente ? "Pendiente" : "Al día"}
                      </span>
                    )}
                  </div>

                  {p.status !== "INACTIVO" && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        onClick={() => toggleCuota(p, currentMonth, !thisMonth?.paid)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95 ${
                          thisMonth?.paid
                            ? "bg-green-500/25 text-green-300"
                            : "bg-surface-2 text-white/80 hover:bg-green-500/25 hover:text-green-300"
                        }`}
                      >
                        <Icon name="check" className="w-4 h-4" />
                        {thisMonth?.paid ? "Pagado" : "Pagar cuota"}
                      </button>
                      {thisMonth && (
                        <button
                          onClick={() => ponerEstado(p, currentMonth)}
                          className="w-11 h-10 inline-flex items-center justify-center rounded-lg bg-surface-2 text-white/50 active:scale-95"
                          title="Cambiar estado: pagado / impago / nulo"
                        >
                          <Icon name="nulo" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      {p.status !== "INACTIVO" && (
                        ec.mesesDebe > 0 ? (
                          <span className="text-red-300 font-semibold">debe {ec.mesesDebe} {ec.mesesDebe === 1 ? "mes" : "meses"}</span>
                        ) : (
                          <span className="text-green-400/80">sin deuda</span>
                        )
                      )}
                      <span className={p.fichas?.aptoFichas ? "text-white/40" : "text-orange-300"}>
                        {p.fichas?.aptoFichas ? "fichas OK" : "sin fichas ✕"}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => abrirInactivo(p)}
                        className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 active:scale-90"
                        title={p.status === "INACTIVO" ? "Ajustar mes de corte" : "Pasar a inactivo"}
                      >
                        <Icon name="pause" className="w-4 h-4" />
                      </button>
                      {p.status === "INACTIVO" && (
                        <button
                          onClick={() => reactivar(p)}
                          className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 active:scale-90"
                          title="Reactivar jugador"
                        >
                          <Icon name="play" className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openDocs(p)}
                        className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 active:scale-90"
                        title="Fichas y estudios"
                      >
                        <Icon name="doc" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditar(p)}
                        className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 active:scale-90"
                        title="Editar"
                      >
                        <Icon name="edit" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removePlayer(p)}
                        className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 active:scale-90"
                        title="Quitar del equipo"
                      >
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {plantel.length === 0 && (
              <p className="p-6 text-center text-white/40 text-sm border border-dashed border-outline rounded-lg">
                Sin jugadores en este equipo. Usá "+ Agregar" o importá desde Excel.
              </p>
            )}
          </div>

          {/* Tabla de jugadores (desktop) */}
          <div className="hidden md:block mt-4 overflow-x-auto rounded-lg border border-outline">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="panel-th">Jugador</th>
                  <th className="panel-th">Estado de cuota</th>
                  <th className="panel-th">Pago {monthShort(currentMonth)}</th>
                  <th className="panel-th">Fichas</th>
                  <th className="panel-th">Deuda</th>
                  <th className="panel-th text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {[
                    ...plantel.filter((x) => x.status !== "INACTIVO"),
                    ...plantel.filter((x) => x.status === "INACTIVO"),
                  ].map((p) => {
                  const thisMonth = p.payments.find((x) => x.month === currentMonth);
                  const ec = p.estadoCuota ?? estadoLocal(p);
                  return (
                    <tr key={p.id} className={`panel-tr ${p.status === "INACTIVO" ? "opacity-60" : ec.deudor ? "bg-red-500/[0.04]" : ""}`}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="avatar">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</span>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">
                              {p.firstName} {p.lastName}
                            </p>
                            <p className="text-[11px] text-white/40 truncate">
                              {p.role === "JUGADOR" ? "Jugador" : p.role}
                              {p.position && ` · ${p.position}`}
                              {p.jersey != null && <span className="font-mono"> · #{p.jersey}</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {p.status === "INACTIVO" ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] bg-surface-2 text-white/50 font-semibold">
                              Inactivo{p.inactiveSince ? ` · ${monthShort(p.inactiveSince.slice(0, 7))} ${p.inactiveSince.slice(0, 4)}` : ""}
                            </span>
                          ) : ec.deudor ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] bg-red-500/20 text-red-400 font-semibold">
                              Deudor
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${ec.pendiente ? "bg-amber-500/20 text-amber-300" : "bg-green-500/20 text-green-400"}`}>
                              {ec.pendiente ? "Pendiente" : "Al día"}
                            </span>
                          )}
                          {p.fichas && !p.fichas.aptoFichas && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] bg-orange-500/20 text-orange-300 font-semibold">
                              Sin fichas
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {p.status === "INACTIVO" ? (
                          <span className="text-[11px] text-white/30">sin cuota</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => toggleCuota(p, currentMonth, !thisMonth?.paid)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95 ${
                                thisMonth?.paid
                                  ? "bg-green-500/25 text-green-300 hover:bg-green-500/35"
                                  : "bg-surface-2 text-white/70 hover:bg-green-500/25 hover:text-green-300"
                              }`}
                            >
                              <Icon name="check" className="w-3.5 h-3.5" />
                              {thisMonth?.paid ? "Pagado" : "Pagar"}
                            </button>
                            {thisMonth && (
                              <button
                                onClick={() => ponerEstado(p, currentMonth)}
                                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-surface-2 transition-colors"
                                title="Cambiar estado: pagado / impago / nulo (quitar registro)"
                              >
                                <Icon name="nulo" className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex flex-col gap-0.5" title={p.fichas?.resumen ?? "Sin datos de fichas"}>
                          <span className="flex items-center gap-1.5 flex-wrap">
                            {(p.fichas?.bloqueantes ?? tiposBloqueantes(categoriaActual)).map((t) => (
                              <span key={t} className="flex items-center gap-1">
                                <span className="text-[10px] text-white/40">{labelTipo(t)}</span>
                                <BadgeFicha st={p.fichas?.porTipo[t]} />
                              </span>
                            ))}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/60 tabular-nums">
                        {ec.mesesDebe > 0 ? (
                          <span className="text-red-300 font-semibold">
                            {ec.mesesDebe} {ec.mesesDebe === 1 ? "mes" : "meses"}
                          </span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="row-actions">
                          <button
                            onClick={() => abrirInactivo(p)}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 transition-colors active:scale-90"
                            title={p.status === "INACTIVO" ? "Ajustar mes de corte" : "Pasar a inactivo"}
                          >
                            <Icon name="pause" className="w-4 h-4" />
                          </button>
                          {p.status === "INACTIVO" && (
                            <button
                              onClick={() => reactivar(p)}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 transition-colors active:scale-90"
                              title="Reactivar jugador"
                            >
                              <Icon name="play" className="w-4 h-4" />
                            </button>
                          )}
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
                  );
                })}
                {plantel.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-white/40">
                      Sin jugadores en este equipo. Usá "+ Agregar" o importá desde Excel.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ====== JUGADORES DE FORMATIVA (pagan en su categoría, sin cuota acá) ====== */}
      {view === "lista" && plantelSinCuota.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-white/80 mb-2 flex items-center gap-2">
            <span className="inline-block w-1.5 h-5 bg-amber-500/80 rounded" />
            Pagan en su categoría formativa
            <span className="text-xs font-mono text-white/40">({plantelSinCuota.length})</span>
          </h2>
          <p className="text-xs text-white/50 mb-3">
            Aparecen en este plantel pero la cuota la pagan en su categoría: no cuentan para el presupuesto ni registran pagos acá.
          </p>
          <div className="overflow-x-auto rounded-lg border border-outline">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="panel-th">Jugador</th>
                  <th className="panel-th">Paga en</th>
                  <th className="panel-th">Fichas</th>
                  <th className="panel-th text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plantelSinCuota.map((p) => (
                  <tr key={p.id} className="panel-tr">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="avatar">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</span>
                        <div className="min-w-0">
                          <p className="font-semibold truncate flex items-center gap-2">
                            {p.firstName} {p.lastName}
                            <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] bg-amber-500/15 text-amber-300 font-mono uppercase tracking-wide">
                              formativa
                            </span>
                          </p>
                          <p className="text-[11px] text-white/40 truncate">{p.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-md text-xs bg-primary/15 text-primary-light font-mono">
                        {p.categoriaPago?.length ? p.categoriaPago.join(" · ") : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
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
                    <td className="px-3 py-2.5">
                      <div className="row-actions">
                        <button
                          onClick={() => openDocs(p)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 transition-colors active:scale-90"
                          title="Fichas y estudios del jugador"
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

      {/* ===================== VISTA CALENDARIO ===================== */}
      {view === "calendario" && (
        <div className="mt-6">
          {/* Header + leyenda */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Calendario de cuotas</h2>
              <p className="text-xs text-white/50 mt-1">
                Tocá una celda para marcar o desmarcar el pago. Solo se editan los meses hasta{" "}
                {monthShort(currentMonth)}.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-white/50">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-md bg-green-500/30 border border-green-500/40" /> Pagó
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-md bg-red-500/25 border border-red-500/40" /> Debe
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-md bg-surface-2 border border-outline" /> Sin cargar
              </span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-outline">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="panel-th sticky left-0 z-20 min-w-[220px]">Jugador</th>
                  {months.map((m) => (
                    <th
                      key={m}
                      className={`panel-th text-center min-w-[60px] ${m === currentMonth ? "text-primary-light" : ""}`}
                    >
                      {m === currentMonth && (
                        <span className="block text-[9px] text-primary-light mb-0.5 tracking-widest">
                          AHORA
                        </span>
                      )}
                      {monthShort(m)}
                      <span className="block text-[9px] opacity-60">{m.slice(2, 4)}</span>
                    </th>
                  ))}
                  <th className="panel-th text-center min-w-[80px]">Debe</th>
                </tr>
              </thead>
              <tbody>
                {[
                    ...plantel.filter((x) => x.status !== "INACTIVO"),
                    ...plantel.filter((x) => x.status === "INACTIVO"),
                  ].map((p) => {
                  const ec = p.estadoCuota ?? estadoLocal(p);
                  return (
                    <tr key={p.id} className={`panel-tr ${p.status === "INACTIVO" ? "opacity-60" : ec.deudor ? "bg-red-500/[0.04]" : ""}`}>
                      <td className="px-3 py-2 sticky left-0 z-10 bg-surface-1">
                        <div className="flex items-center gap-2.5">
                          <span className="avatar w-7 h-7 text-xs">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm leading-tight truncate">
                              {p.firstName} {p.lastName}
                            </p>
                            {p.status === "INACTIVO" ? (
                              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                                inactivo · hasta {p.inactiveSince ? `${monthShort(p.inactiveSince.slice(0, 7))} ${p.inactiveSince.slice(0, 4)}` : "hoy"}
                              </p>
                            ) : ec.deudor && (
                              <p className="text-[10px] text-red-400 font-mono uppercase tracking-wider">
                                ✕ no juega
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {months.map((m) => {
                        const pay = p.payments.find((x) => x.month === m);
                        const esFuturo = m > currentMonth;
                        const paid = pay?.paid ?? false;
                        const marcado = pay !== undefined;
                        return (
                          <td key={m} className={`p-1 text-center ${esFuturo ? "opacity-25" : ""}`}>
                            <button
                              disabled={esFuturo}
                              onClick={() => (marcado ? ponerEstado(p, m) : toggleCuota(p, m, true))}
                              title={
                                esFuturo
                                  ? "Mes futuro"
                                  : marcado
                                    ? `Cambiar estado de ${monthShort(m)} (pagado / impago / nulo)`
                                    : `Marcar pago de ${monthShort(m)}`
                              }
                              className={`w-full h-8 inline-flex items-center justify-center rounded-md text-xs font-bold transition-all duration-150 active:scale-95 ${
                                esFuturo
                                  ? "bg-surface-1/50 text-white/20 cursor-default"
                                  : paid
                                    ? "bg-green-500/25 text-green-300 border border-green-500/30 hover:bg-green-500/40"
                                    : marcado
                                      ? "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                                      : "bg-surface-1 text-white/35 border border-transparent hover:bg-surface-2 hover:text-white/60"
                              }`}
                            >
                              {esFuturo ? "·" : paid ? <Icon name="check" className="w-3.5 h-3.5" /> : marcado ? <Icon name="nulo" className="w-3.5 h-3.5" /> : "·"}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-xs font-mono ${
                            ec.mesesDebe > 0
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : "bg-green-500/15 text-green-400 border border-green-500/25"
                          }`}
                        >
                          {ec.mesesDebe > 0 ? `${ec.mesesDebe} ${ec.mesesDebe === 1 ? "mes" : "meses"}` : "OK"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {plantel.length === 0 && (
                  <tr>
                    <td colSpan={months.length + 2} className="p-6 text-center text-white/40">
                      Sin jugadores en este equipo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== VISTA DELEGADOS ===================== */}
      {view === "delegados" && me?.role === "ADMIN" && (
        <div className="mt-8 rounded-lg border border-outline bg-surface-1 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Delegados</h2>
              <p className="text-sm text-white/60 mt-1">
                Cada delegado entra al panel con su email y contraseña, y ve solo los equipos que le asignás.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {delegados.length > 0 && (
                <button
                  onClick={eliminarTodosDelegados}
                  className="btn bg-transparent text-red-400/70 border border-red-400/30 hover:bg-red-400/10 hover:text-red-400 active:scale-95"
                >
                  Eliminar todos
                </button>
              )}
              <button
                onClick={openNuevoDelegado}
                className="btn bg-primary text-white hover:bg-primary-light active:scale-95"
              >
                + Nuevo delegado
              </button>
            </div>
          </div>

          {delegadoMsg && (
            <p className="mt-4 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-400">
              {delegadoMsg}
            </p>
          )}

          {delegadosError && <p className="mt-4 text-sm text-red-400">{delegadosError}</p>}

          {delegadosLoading ? (
            <p className="mt-6 text-white/60">Cargando delegados...</p>
          ) : delegados.length === 0 ? (
            <p className="mt-6 text-sm text-white/40">
              Todavía no hay delegados. Tocá "Nuevo delegado" para crear la primera cuenta.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/50">
                    <th className="py-2">Nombre</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Equipos</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2">Credenciales</th>
                    <th className="py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {delegados.map((d) => (
                    <tr key={d.id} className={`border-t border-outline/60 ${d.active ? "" : "opacity-50"}`}>
                      <td className="py-3">{d.fullName}</td>
                      <td className="py-3">{d.email}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {d.teamAccess.length === 0 && <span className="text-white/40 text-xs">Sin equipos</span>}
                          {d.teamAccess.map((a) => (
                            <span key={a.team.id} className="px-2 py-0.5 rounded-full bg-surface-2 border border-outline text-xs">
                              {a.team.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            d.active
                              ? "bg-green-500/10 text-green-400 border border-green-500/30"
                              : "bg-white/5 text-white/50 border border-outline"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${d.active ? "bg-green-400" : "bg-white/40"}`} />
                          {d.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-3">
                        {d.canChangeCredentials ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary-light border border-primary/25 text-xs">
                            Puede autocambiarse
                          </span>
                        ) : (
                          <button
                            onClick={() => reactivarCredenciales(d)}
                            className="px-2.5 py-1 rounded-lg text-xs bg-transparent text-primary-light/80 border border-primary/25 hover:bg-primary/10 transition-colors"
                            title="Volver a permitirle cambiar su email/contraseña una vez"
                          >
                            Reactivar cambio
                          </button>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEditDelegado(d)}
                            className="px-2.5 py-1 rounded-lg text-xs bg-surface-2 border border-outline hover:bg-surface-1 text-white/80 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => toggleDelegadoActive(d)}
                            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                              d.active
                                ? "bg-transparent text-red-400/70 border-red-400/30 hover:bg-red-400/10 hover:text-red-400"
                                : "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20"
                            }`}
                          >
                            {d.active ? "Desactivar" : "Reactivar"}
                          </button>
                          <button
                            onClick={() => eliminarDelegado(d)}
                            className="px-2.5 py-1 rounded-lg text-xs bg-transparent text-red-400/40 border border-transparent hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/30 transition-colors"
                            title="Eliminar cuenta (no se puede deshacer)"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs text-white/40">
            La cuenta admin (todos los equipos) no aparece acá. Para cambiarla, usá el panel de credenciales.
          </p>
        </div>
      )}

      {/* ===================== VISTA CRONOGRAMA DE ENTRENAMIENTO ===================== */}
      {view === "poli" && (
        <div className="mt-8 rounded-lg border border-outline bg-surface-1 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Cronograma de entrenamiento</h2>
              <p className="text-sm text-white/60 mt-1">
                Horarios y lugares donde entrena cada categoría. La plantilla se repite todas las semanas; podés cambiar un día puntual con "Cambiar este día".
              </p>
            </div>
            <button
              onClick={openNuevoPoliSlot}
              className="btn bg-primary text-white hover:bg-primary-light active:scale-95"
            >
              + Nuevo bloque
            </button>
          </div>

          {poliMsg && (
            <p className="mt-4 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-400">
              {poliMsg}
            </p>
          )}
          {poliError && <p className="mt-4 text-sm text-red-400">{poliError}</p>}

          {/* Navegación de semana */}
          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              onClick={() => moverSemana(-1)}
              className="px-3 py-1.5 rounded-lg text-sm bg-surface-2 border border-outline hover:bg-surface-1 text-white/80 transition-colors"
            >
              ← Semana anterior
            </button>
            <p className="text-sm text-white/60 font-mono">
              {poliSemanaOffset === 0 ? "Esta semana" : poliSemanaOffset > 0 ? `En ${poliSemanaOffset} semana${poliSemanaOffset === 1 ? "" : "s"}` : `Hace ${-poliSemanaOffset} semana${-poliSemanaOffset === 1 ? "" : "s"}`}
            </p>
            <button
              onClick={() => moverSemana(1)}
              disabled={poliSemanaOffset >= 3}
              className="px-3 py-1.5 rounded-lg text-sm bg-surface-2 border border-outline hover:bg-surface-1 text-white/80 transition-colors disabled:opacity-40"
            >
              Semana siguiente →
            </button>
          </div>

          {poliLoading ? (
            <p className="mt-6 text-white/60">Cargando cronograma...</p>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {poliSemana.length === 0 && (
                <p className="text-sm text-white/40 md:col-span-2 xl:col-span-4">
                  No se pudo cargar la semana.
                </p>
              )}
              {poliSemana.map((d) => {
                const hoy = poliHoy === d.fecha;
                return (
                  <div
                    key={d.fecha}
                    className={`rounded-lg border overflow-hidden ${hoy ? "border-primary/60 shadow-[0_0_18px_rgba(0,147,66,0.12)]" : "border-outline bg-surface"}`}
                  >
                    <div className="px-3 py-2 border-b border-outline bg-surface-1 flex items-center justify-between">
                      <p className="font-display font-bold text-sm capitalize">
                        {d.dia}
                        {hoy && (
                          <span className="ml-1.5 text-[9px] uppercase tracking-wider font-mono text-primary-light align-middle">
                            · hoy
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] font-mono text-white/40">{d.fecha.slice(8, 10)}/{d.fecha.slice(5, 7)}</p>
                    </div>
                    <div className="p-2 space-y-1.5">
                      {/* Partidos del club ese día */}
                      {d.partidos.length > 0 && (
                        <div className="px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[11px]">
                          {d.partidos.map((p) => (
                            <p key={p.id} className="text-amber-200/90">
                              ⚽ {p.time} · {p.team.name} vs {p.rival} {p.isHome ? "(local)" : ""}
                            </p>
                          ))}
                        </div>
                      )}
                      {d.bloques.length === 0 && d.partidos.length === 0 && (
                        <div className="py-2 text-center">
                          <p className="text-xs text-white/30">Sin actividad</p>
                          <button
                            onClick={() => abrirExcepcion(d.fecha)}
                            className="mt-1.5 text-[11px] px-2 py-0.5 rounded bg-white/5 hover:bg-primary/15 hover:text-primary-light border border-outline hover:border-primary/40 transition-colors"
                            title="Agregar un entrenamiento puntual este día"
                          >
                            + Agregar entrenamiento
                          </button>
                        </div>
                      )}
                      {d.bloques.map((b) => (
                        <div
                          key={b.id}
                          className={`rounded-md border px-2.5 py-2 ${placeColor(b.place)}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-mono text-xs font-semibold tabular-nums">
                              {b.startTime}–{b.endTime}
                            </p>
                            <span className="text-[9px] uppercase tracking-wider opacity-70 font-mono">
                              {b.tipo === "EXTRA" ? "Puntual" : b.excepcion ? "Modificado" : "Fijo"}
                            </span>
                          </div>
                          <p className="text-sm font-semibold mt-0.5">{b.team?.name ?? "Actividad libre"}</p>
                          <p className="text-[11px] opacity-80">{b.place}</p>
                          {b.responsable && <p className="text-[11px] opacity-70">👤 {b.responsable}</p>}
                          {b.note && <p className="text-[10px] italic opacity-70 mt-0.5">{b.note}</p>}
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <button
                              onClick={() => abrirExcepcion(d.fecha, b)}
                              disabled={!puedeOperarPoli(b.team?.id)}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                              title={puedeOperarPoli(b.team?.id) ? "Cambiar lugar/hora o cancelar para este día puntual" : "Solo el admin o el encargado de este equipo"}
                            >
                              Cambiar este día
                            </button>
                            <button
                              onClick={() => abrirExcepcion(d.fecha)}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
                              title="Agregar un entrenamiento puntual extra este día"
                            >
                              + Extra
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Plantilla semanal (lista de bloques fijos) */}
          <div className="mt-8">
            <h3 className="font-display font-bold text-sm flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-primary" />
              Plantilla semanal (se repite todas las semanas)
            </h3>
            <p className="text-xs text-white/50 mt-1">
              Acá se definen los bloques fijos. Usá "Cambiar este día" en la grilla para una excepción puntual.
            </p>
            {poliSlots.length === 0 ? (
              <p className="mt-3 text-sm text-white/40">
                Todavía no hay bloques cargados. Tocá "+ Nuevo bloque" para crear el primero (ej: lunes 21:00 JH NEGRO en Polideportivo).
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-white/50">
                      <th className="py-2">Día</th>
                      <th className="py-2">Horario</th>
                      <th className="py-2">Lugar</th>
                      <th className="py-2">Equipo</th>
                      <th className="py-2">Responsable</th>
                      <th className="py-2">Estado</th>
                      <th className="py-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poliSlots.map((s) => {
                      const operable = puedeOperarPoli(s.team?.id);
                      return (
                      <tr key={s.id} className={`border-t border-outline/60 ${s.active ? "" : "opacity-50"}`}>
                        <td className="py-3 capitalize">
                          {["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"][s.dayOfWeek]}
                        </td>
                        <td className="py-3 font-mono tabular-nums">{s.startTime}–{s.endTime}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${placeColor(s.place)}`}>
                            {s.place}
                          </span>
                        </td>
                        <td className="py-3">{s.team?.name ?? "Actividad libre"}</td>
                        <td className="py-3 text-white/70">{s.responsable ?? "—"}</td>
                        <td className="py-3">
                          <button
                            onClick={() => togglePoliSlot(s)}
                            disabled={!operable}
                            className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                              s.active
                                ? "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20"
                                : "bg-white/5 text-white/50 border-outline hover:bg-surface-2"
                            }`}
                          >
                            {s.active ? "Activo" : "Suspendido"}
                          </button>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEditPoliSlot(s)}
                              disabled={!operable}
                              className="px-2.5 py-1 rounded-lg text-xs bg-surface-2 border border-outline hover:bg-surface-1 text-white/80 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => borrarPoliSlot(s)}
                              disabled={!operable}
                              className="px-2.5 py-1 rounded-lg text-xs bg-transparent text-red-400/40 border border-transparent hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/30 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== VISTA PRESUPUESTO ===================== */}
      {view === "presupuesto" && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Presupuesto de {presup?.categoria ?? "la categoría"}</h2>
              <p className="text-xs text-white/50 mt-1">
                Balance del mes con lo que entra por cuotas y lo que sale en gastos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/50">Mes:</label>
              <input
                type="month"
                value={presupMes}
                onChange={(e) => setPresupMes(e.target.value || mesActual())}
                className="px-2.5 py-1.5 rounded-lg bg-surface-1 border border-outline text-sm [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                  onClick={() => setVerTotal(!verTotal)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95 ${
                    verTotal ? "bg-primary text-white" : "bg-surface-1 text-white/60 hover:text-white hover:bg-surface-2"
                  }`}
                >
                  {verTotal ? "Ocultar total" : "Total del club"}
                </button>
            </div>
          </div>

          {presupError && <p className="mt-3 text-red-400 text-sm">{presupError}</p>}

          {presupLoading && <p className="mt-4 text-white/50">Cargando presupuesto...</p>}

          {!presupLoading && presup && (
            <>
              {/* Tarjetas de números */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="card p-4">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">Ingreso · cuotas</p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-green-400 tabular-nums">{formatPesos(presup.resultado.ingreso)}</p>
                  <p className="mt-1 text-xs text-white/60 leading-relaxed">
                    {presup.jugadores} jugadores{presup.cuota != null ? ` × ${formatPesos(presup.cuota)}` : " (sin cuota cargada)"}
                    {presup.jugadoresExcluidos > 0 && ` · ${presup.jugadoresExcluidos} excluido${presup.jugadoresExcluidos === 1 ? "" : "s"}`}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">Gastos del mes</p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-red-400 tabular-nums">{formatPesos(presup.resultado.gastos)}</p>
                  <p className="mt-1 text-xs text-white/60 leading-relaxed">
                    {formatPesos(presup.gastosFijos.reduce((a, g) => a + g.monto, 0))} fijos +{" "}
                    {formatPesos(presup.gastosExtra.reduce((a, g) => a + g.monto, 0))} extras
                  </p>
                </div>
                <div className={`card p-4 ${presup.resultado.balance >= 0 ? "border-green-500/30 bg-green-500/[0.04]" : "border-red-500/30 bg-red-500/[0.04]"}`}>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">Balance</p>
                  <p className={`mt-1.5 font-display text-2xl font-bold tabular-nums ${presup.resultado.balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatPesos(presup.resultado.balance)}
                  </p>
                  <p className="mt-1 text-xs">
                    <span className={presup.resultado.balance >= 0 ? "text-green-400/80" : "text-red-400/80"}>
                      {presup.resultado.balance >= 0 ? "▲ superávit" : "▼ déficit"}
                    </span>
                    <span className="text-white/60"> del mes</span>
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">Cuota recomendada</p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-primary-light tabular-nums">
                    {presup.resultado.recomendacionSana ? formatPesos(presup.resultado.cuotaRecomendada) : "—"}
                  </p>
                  <p className="mt-1 text-xs text-white/60 leading-relaxed">
                    {presup.resultado.recomendacionSana
                      ? `mínima ${formatPesos(presup.resultado.cuotaMinima)} + 10% margen`
                      : "cargá gastos y jugadores para calcularla"}
                  </p>
                </div>
              </div>

              {/* Acciones rápidas */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => { setQuotaInput(presup.cuota != null ? String(presup.cuota) : ""); setShowQuotaModal(true); }}
                  className="btn bg-primary text-white hover:bg-primary-light active:scale-95"
                >
                  {presup.cuota != null ? `Cambiar cuota · ${formatPesos(presup.cuota)}` : "Cargar cuota"}
                </button>
                <button
                  onClick={() => openGastoModal("fijo")}
                  className="btn bg-surface-1 text-white/80 border border-outline hover:bg-surface-2 active:scale-95"
                >
                  + Gasto fijo
                </button>
                <button
                  onClick={() => openGastoModal("extra")}
                  className="btn bg-surface-1 text-white/80 border border-outline hover:bg-surface-2 active:scale-95"
                >
                  + Gasto extra
                </button>
              </div>

              {/* Listas de gastos */}
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-outline overflow-hidden">
                  <div className="px-4 py-3 border-b border-outline bg-surface-1 flex items-center justify-between">
                    <h3 className="font-display font-bold text-sm flex items-center gap-2">
                      <span className="w-1.5 h-4 rounded-full bg-primary" />
                      Gastos fijos
                    </h3>
                    <span className="text-xs font-mono text-white/50 bg-surface-2 px-2 py-0.5 rounded-full">
                      {presup.gastosFijos.length} · {formatPesos(presup.gastosFijos.reduce((a, g) => a + g.monto, 0))}
                    </span>
                  </div>
                  <ul className="divide-y divide-outline/60">
                    {presup.gastosFijos.length === 0 && (
                      <li className="px-4 py-6 text-sm text-white/40 text-center">
                        Sin gastos fijos cargados. Se repiten todos los meses (cancha, árbitros...).
                      </li>
                    )}
                    {presup.gastosFijos.map((g) => (
                      <li key={g.id} className="px-4 py-2.5 flex items-center justify-between gap-2 group hover:bg-surface-2/50 transition-colors">
                        <span className="text-sm">{g.nombre}</span>
                        <span className="flex items-center gap-3">
                          <span className="text-sm text-white/70 tabular-nums font-mono">{formatPesos(g.monto)}</span>
                          <button
                            onClick={() => borrarGasto("fijo", g.id)}
                            className="text-xs text-red-400/50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Eliminar gasto"
                          >
                            ✕
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-outline overflow-hidden">
                  <div className="px-4 py-3 border-b border-outline bg-surface-1 flex items-center justify-between">
                    <h3 className="font-display font-bold text-sm flex items-center gap-2">
                      <span className="w-1.5 h-4 rounded-full bg-amber-300/60" />
                      Extras de {monthShort(presupMes)}
                    </h3>
                    <span className="text-xs font-mono text-white/50 bg-surface-2 px-2 py-0.5 rounded-full">
                      {presup.gastosExtra.length} · {formatPesos(presup.gastosExtra.reduce((a, g) => a + g.monto, 0))}
                    </span>
                  </div>
                  <ul className="divide-y divide-outline/60">
                    {presup.gastosExtra.length === 0 && (
                      <li className="px-4 py-6 text-sm text-white/40 text-center">
                        Sin gastos puntuales en este mes (cancha por lluvia, etc.).
                      </li>
                    )}
                    {presup.gastosExtra.map((g) => (
                      <li key={g.id} className="px-4 py-2.5 flex items-center justify-between gap-2 group hover:bg-surface-2/50 transition-colors">
                        <span className="text-sm">{g.nombre}</span>
                        <span className="flex items-center gap-3">
                          <span className="text-sm text-white/70 tabular-nums font-mono">{formatPesos(g.monto)}</span>
                          <button
                            onClick={() => borrarGasto("extra", g.id)}
                            className="text-xs text-red-400/50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Eliminar gasto"
                          >
                            ✕
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* ===== TOTAL DEL CLUB (ADMIN) ===== */}
              {verTotal && (
                <div className="mt-8">
                  {totalError && <p className="text-red-400 text-sm">{totalError}</p>}
                  {totalLoading && <p className="text-white/50">Cargando total del club...</p>}
                  {!totalLoading && totalData && (
                    <>
                      {/* Tarjetas de totales */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="card p-4">
                          <p className="text-xs text-white/50">Jugadores que pagan</p>
                          <p className="mt-1 text-2xl font-bold">{totalData.totales.jugadores}</p>
                        </div>
                        <div className="card p-4">
                          <p className="text-xs text-white/50">Ingreso total del club</p>
                          <p className="mt-1 text-2xl font-bold text-green-400">{formatPesos(totalData.totales.ingreso)}</p>
                        </div>
                        <div className="card p-4">
                          <p className="text-xs text-white/50">Gastos totales</p>
                          <p className="mt-1 text-2xl font-bold text-red-400">{formatPesos(totalData.totales.gastos)}</p>
                        </div>
                        <div className="card p-4">
                          <p className="text-xs text-white/50">Deuda total</p>
                          <p className="mt-1 text-2xl font-bold text-amber-300">{formatPesos(totalData.totales.deuda)}</p>
                        </div>
                      </div>

                      <div className={`mt-3 card p-4 ${totalData.totales.balance >= 0 ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                        <p className="text-xs text-white/50">Balance total del club</p>
                        <p className={`mt-1 text-2xl font-bold ${totalData.totales.balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {formatPesos(totalData.totales.balance)}
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          {totalData.totales.balance >= 0 ? "superávit" : "déficit"} de {monthShort(totalData.mes)} — el ingreso real es mayor: sumá la deuda ({formatPesos(totalData.totales.deuda)}) a cobrar
                        </p>
                      </div>

                      {/* Tabla por equipo, ordenada por pérdida */}
                      <div className="mt-4 overflow-x-auto rounded-lg border border-outline">
                        <table className="w-full text-sm">
                          <thead className="bg-surface-1/60 text-left text-white/60">
                            <tr>
                              <th className="p-3">Equipo</th>
                              <th className="p-3">Jugadores</th>
                              <th className="p-3">Cuota</th>
                              <th className="p-3">Ingreso</th>
                              <th className="p-3">Gastos</th>
                              <th className="p-3">Balance</th>
                              <th className="p-3">Deuda</th>
                              <th className="p-3">Recomendada</th>
                            </tr>
                          </thead>
                          <tbody>
                            {totalData.porEquipo.map((e) => {
                              const recomendada = e.jugadores > 0
                                ? Math.ceil((e.gastos / e.jugadores) * 1.1 / 500) * 500
                                : 0;
                              return (
                                <tr key={e.teamId} className={`border-t border-outline/60 ${e.balance < 0 ? "bg-red-500/5" : ""}`}>
                                  <td className="p-3 font-semibold">
                                    {e.categoria}
                                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${e.tipo === "FORMATIVA" ? "bg-primary/20 text-primary-light" : "bg-surface-2 text-white/60"}`}>
                                      {e.tipo === "FORMATIVA" ? "formativa" : "primera"}
                                    </span>
                                  </td>
                                  <td className="p-3 text-white/70">{e.jugadores}</td>
                                  <td className="p-3 text-white/70">{e.cuota ? formatPesos(e.cuota) : "—"}</td>
                                  <td className="p-3 text-white/70">{formatPesos(e.ingreso)}</td>
                                  <td className="p-3 text-white/70">{formatPesos(e.gastos)}</td>
                                  <td className={`p-3 font-semibold ${e.balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    {formatPesos(e.balance)}
                                  </td>
                                  <td className={`p-3 ${e.deuda > 0 ? "text-amber-300" : "text-white/40"}`}>{formatPesos(e.deuda)}</td>
                                  <td className="p-3 text-white/60">{recomendada > 0 ? formatPesos(recomendada) : "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="mt-2 text-xs text-white/40">
                        Orden alfabético por categoría. La cuota recomendada por equipo = gastos ÷ jugadores + 10% margen, redondeada a $500.
                      </p>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
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
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-outline bg-surface-2 p-6">
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
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                    placeholder="Pérez"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-white/60">Nombre *</span>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                    placeholder="Juan"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-white/60">DNI *</span>
                  <input
                    value={form.document}
                    onChange={(e) => setForm({ ...form, document: e.target.value.replace(/\D/g, "") })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                    placeholder="12345678"
                  />
                </label>
                {buscandoDni && (
                  <p className="text-xs text-white/40">Buscando DNI...</p>
                )}
                {!buscandoDni && foundPlayer && (
                  <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-xs col-span-2">
                    <p className="text-primary-light font-semibold">
                      ✓ DNI ya registrado: {foundPlayer.firstName} {foundPlayer.lastName}
                    </p>
                    <p className="text-white/70 mt-1 leading-relaxed">
                      Se va a <span className="font-semibold text-white">vincular</span> a este equipo, sin duplicar datos.
                      {foundPlayer.equipos.length > 0 && (
                        <>
                          {" "}Ya figura en:{" "}
                          <span className="font-semibold text-white">
                            {foundPlayer.equipos
                              .map((e) => `${e.name} (${e.type === "FORMATIVA" ? "Formativa" : "Primera"})`)
                              .join(", ")}
                          </span>
                          .
                        </>
                      )}
                    </p>
                  </div>
                )}
                <label className="block">
                  <span className="text-xs text-white/60">Fecha de nacimiento</span>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm [color-scheme:dark]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-white/60">Rol</span>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                  >
                    <option value="JUGADOR" className="bg-surface-2">Jugador</option>
                    <option value="DT" className="bg-surface-2">DT</option>
                    <option value="AT" className="bg-surface-2">AT</option>
                    <option value="PF" className="bg-surface-2">PF</option>
                    <option value="DEL" className="bg-surface-2">Delegado</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-white/60">Posición</span>
                  <input
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                    placeholder="Ala, Cierre..."
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-white/60">N° camiseta</span>
                  <input
                    value={form.jersey}
                    onChange={(e) => setForm({ ...form, jersey: e.target.value.replace(/\D/g, "") })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
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

              {editing && form.role === "JUGADOR" && (
                <label className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-surface-1 border border-outline cursor-pointer hover:bg-surface-2 transition-colors">
                  <input
                    type="checkbox"
                    checked={cuentaPresupuesto}
                    onChange={(e) => setCuentaPresupuesto(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-xs text-white/70">
                    Cuenta para el <span className="text-primary-light font-semibold">presupuesto</span> (paga cuota)
                  </span>
                </label>
              )}

              {formError && <p className="text-red-400 text-sm">{formError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-outline text-sm hover:bg-surface-2"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={savePlayer}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
                >
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : foundPlayer ? "Vincular a este equipo" : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===================== MODAL FICHAS / DOCUMENTOS ===================== */}
      {docsPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-outline bg-surface-2 p-6 max-h-[85vh] overflow-y-auto">
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
            <div className="mt-5 rounded-lg border border-outline bg-surface-1 p-4 space-y-3">
              <p className="text-sm font-semibold text-white/80">Subir documento</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-white/60">Tipo *</span>
                  <select
                    value={docForm.tipo}
                    onChange={(e) => setDocForm({ ...docForm, tipo: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                  >
                    <option value="FICHA_MEDICA" className="bg-surface-2">Ficha médica</option>
                    <option value="ELECTROCARDIOGRAMA" className="bg-surface-2">Electrocardiograma</option>
                    <option value="ERGONOMETRIA" className="bg-surface-2">Ergometría</option>
                    <option value="OTRO" className="bg-surface-2">Otro</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-white/60">Fecha de emisión (del papel)</span>
                  <input
                    type="date"
                    value={docForm.fechaEmision}
                    onChange={(e) => setDocForm({ ...docForm, fechaEmision: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm [color-scheme:dark]"
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
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
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
                    <li key={d.id} className="flex items-center gap-3 rounded-lg border border-outline bg-surface-1 px-3 py-2">
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
                        className="px-2 py-1 rounded text-xs text-white/60 hover:text-white hover:bg-surface-2"
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
    {/* ===================== MODAL DELEGADO ===================== */}
      {showCredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-outline bg-surface-2 p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-lg font-bold">Cambiar mis credenciales</h2>
              <button onClick={() => setShowCredModal(false)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-white/50 mt-1">
              Es tu único cambio de email/contraseña. Después, si necesitás otro, pedilo al administrador.
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); guardarCredenciales(); }}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="text-xs text-white/70 block mb-1">Email de acceso</label>
                <input
                  type="email"
                  value={credForm.email}
                  onChange={(e) => setCredForm({ ...credForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-white/70 block mb-1">Contraseña actual</label>
                <input
                  type="password"
                  value={credForm.currentPassword}
                  onChange={(e) => setCredForm({ ...credForm, currentPassword: e.target.value })}
                  placeholder="Necesaria para cambiar la contraseña"
                  className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                  minLength={1}
                />
              </div>
              <div>
                <label className="text-xs text-white/70 block mb-1">
                  Contraseña nueva (dejala vacía para no cambiarla)
                </label>
                <input
                  type="password"
                  value={credForm.password}
                  onChange={(e) => setCredForm({ ...credForm, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                  minLength={6}
                />
              </div>

              {credMsg && (
                <p className={`text-sm ${credMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{credMsg.text}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={credSaving}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {credSaving ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCredModal(false)}
                  className="px-4 py-2 rounded-lg border border-outline text-sm text-white/70 hover:bg-surface-2 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelegadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-outline bg-surface-2 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-lg font-bold">
                {delegadoEditingId ? "Editar delegado" : "Nuevo delegado"}
              </h2>
              <button onClick={() => setShowDelegadoModal(false)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-white/50 mt-1">
              {delegadoEditingId
                ? "Cambiá los datos y guardá. Dejá la contraseña vacía para no modificarla."
                : "Creá una cuenta para que el delegado gestione sus equipos."}
            </p>

            <form onSubmit={saveDelegado} className="mt-5 space-y-4">
              <div>
                <label className="text-xs text-white/70 block mb-1">Nombre y apellido</label>
                <input
                  value={delegadoForm.fullName}
                  onChange={(e) => setDelegadoForm({ ...delegadoForm, fullName: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-white/70 block mb-1">Email de acceso</label>
                <input
                  type="email"
                  value={delegadoForm.email}
                  onChange={(e) => setDelegadoForm({ ...delegadoForm, email: e.target.value })}
                  placeholder="delegado@josehernandez.futbol"
                  className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-white/70 block mb-1">
                  Contraseña {delegadoEditingId && "(dejala vacía para no cambiarla)"}
                </label>
                <input
                  type="password"
                  value={delegadoForm.password}
                  onChange={(e) => setDelegadoForm({ ...delegadoForm, password: e.target.value })}
                  placeholder={delegadoEditingId ? "••••••••" : "Mínimo 6 caracteres"}
                  className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                  required={!delegadoEditingId}
                  minLength={6}
                />
              </div>
              <div>
                <label className="text-xs text-white/70 block mb-1.5">Equipos asignados</label>
                <p className="text-[11px] text-white/40 mb-2">
                  Marcá las categorías que va a poder gestionar.
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto rounded-lg border border-outline bg-surface-1 p-2">
                  {allTeams.length === 0 && (
                    <p className="text-xs text-white/40 col-span-2 p-2">Cargando equipos...</p>
                  )}
                  {allTeams.map((team) => {
                    const checked = delegadoForm.teamIds.includes(team.id);
                    return (
                      <label
                        key={team.id}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                          checked ? "bg-primary/15 text-white border border-primary/30" : "hover:bg-surface-2 text-white/80 border border-transparent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setDelegadoForm((f) => ({
                              ...f,
                              teamIds: e.target.checked
                                ? [...f.teamIds, team.id]
                                : f.teamIds.filter((id) => id !== team.id),
                            }));
                          }}
                          className="accent-[#008f39]"
                        />
                        {team.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              {delegadosError && <p className="text-sm text-red-400">{delegadosError}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={delegadoSaving}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
                >
                  {delegadoSaving ? "Guardando..." : delegadoEditingId ? "Guardar cambios" : "Crear delegado"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDelegadoModal(false)}
                  className="px-4 py-2 rounded-lg border border-outline text-white/70 text-sm hover:bg-surface-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL BLOQUE SEMANAL (POLI) ===================== */}
      {showPoliSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-outline bg-surface-2 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-lg font-bold">
                {poliSlotEditingId ? "Editar bloque semanal" : "Nuevo bloque semanal"}
              </h2>
              <button onClick={() => setShowPoliSlotModal(false)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-white/50 mt-1">
              Se repite todas las semanas hasta que lo cambies. Para un solo día usá "Cambiar este día" en la grilla.
            </p>

            <form onSubmit={savePoliSlot} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/70 block mb-1">Día</label>
                  <select
                    value={poliSlotForm.dayOfWeek}
                    onChange={(e) => setPoliSlotForm({ ...poliSlotForm, dayOfWeek: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                  >
                    <option value={1}>Lunes</option>
                    <option value={2}>Martes</option>
                    <option value={3}>Miércoles</option>
                    <option value={4}>Jueves</option>
                    <option value={5}>Viernes</option>
                    <option value={6}>Sábado</option>
                    <option value={7}>Domingo</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/70 block mb-1">Lugar</label>
                  <select
                    value={poliSlotForm.place}
                    onChange={(e) => setPoliSlotForm({ ...poliSlotForm, place: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                  >
                    <option>Polideportivo</option>
                    <option>La Toma</option>
                    <option>Palermo</option>
                    <option>Borja</option>
                    <option>Gimnasio</option>
                    <option>Cancha de césped</option>
                    <option>Otro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/70 block mb-1">Desde</label>
                  <input
                    type="time"
                    value={poliSlotForm.startTime}
                    onChange={(e) => setPoliSlotForm({ ...poliSlotForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-white/70 block mb-1">Hasta</label>
                  <input
                    type="time"
                    value={poliSlotForm.endTime}
                    onChange={(e) => setPoliSlotForm({ ...poliSlotForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/70 block mb-1">Equipo / actividad</label>
                <select
                  value={poliSlotForm.teamId}
                  onChange={(e) => setPoliSlotForm({ ...poliSlotForm, teamId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                >
                  {esAdmin && <option value="">Actividad libre (sin equipo)</option>}
                  {equiposPoliEditables.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/70 block mb-1">Responsable (opcional)</label>
                <input
                  value={poliSlotForm.responsable}
                  onChange={(e) => setPoliSlotForm({ ...poliSlotForm, responsable: e.target.value })}
                  placeholder="Ej: DT Marcos"
                  className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-white/70 block mb-1">Nota (opcional)</label>
                <input
                  value={poliSlotForm.note}
                  onChange={(e) => setPoliSlotForm({ ...poliSlotForm, note: e.target.value })}
                  placeholder="Ej: solo jugadores convocados"
                  className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                />
              </div>

              {poliError && <p className="text-sm text-red-400">{poliError}</p>}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowPoliSlotModal(false)}
                  className="px-4 py-2 rounded-lg border border-outline text-white/70 text-sm hover:bg-surface-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={poliSlotSaving}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
                >
                  {poliSlotSaving ? "Guardando..." : poliSlotEditingId ? "Guardar cambios" : "Crear bloque"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL EXCEPCIÓN PUNTUAL (POLI) ===================== */}
      {showPoliExModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-outline bg-surface-2 p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-lg font-bold">
                {showPoliExModal.bloque ? "Cambiar entrenamiento del día" : "Agregar entrenamiento puntual"}
              </h2>
              <button onClick={() => setShowPoliExModal(null)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-white/50 mt-1">
              {showPoliExModal.bloque
                ? <>Aplica solo al <span className="text-white capitalize">{showPoliExModal.fecha}</span>. Si cancelás, ese día no se entrena.</>
                : <>Entrenamiento único para el <span className="text-white capitalize">{showPoliExModal.fecha}</span> (no se repite las semanas siguientes).</>}
            </p>

            <form onSubmit={saveExcepcion} className="mt-5 space-y-4">
              {showPoliExModal.bloque && (
                <div className="rounded-lg bg-surface-1 border border-outline p-3 text-sm">
                  <p className="text-white/80">
                    <span className="text-white/50">De: </span>{showPoliExModal.bloque.team?.name ?? "Actividad libre"}
                    <span className="text-white/40"> · </span>{showPoliExModal.bloque.startTime}–{showPoliExModal.bloque.endTime}
                    <span className="text-white/40"> · </span>{showPoliExModal.bloque.place}
                  </p>
                </div>
              )}

              {showPoliExModal.bloque && (
                <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={poliExForm.canceled}
                    onChange={(e) => setPoliExForm({ ...poliExForm, canceled: e.target.checked })}
                    className="accent-red-500 w-4 h-4"
                  />
                  Cancelar el entrenamiento este día
                </label>
              )}

              {!showPoliExModal.bloque && (
                <div>
                  <label className="text-xs text-white/70 block mb-1">Equipo / actividad</label>
                  <select
                    value={poliExForm.teamId}
                    onChange={(e) => setPoliExForm({ ...poliExForm, teamId: e.target.value })}
                    disabled={poliExForm.canceled}
                    className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm disabled:opacity-50"
                  >
                    {esAdmin && <option value="">Actividad libre (sin equipo)</option>}
                    {equiposPoliEditables.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/70 block mb-1">Lugar</label>
                  <select
                    value={poliExForm.place}
                    onChange={(e) => setPoliExForm({ ...poliExForm, place: e.target.value })}
                    disabled={poliExForm.canceled}
                    className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm disabled:opacity-50"
                  >
                    <option value="">Sin cambio</option>
                    <option>Polideportivo</option>
                    <option>La Toma</option>
                    <option>Palermo</option>
                    <option>Borja</option>
                    <option>Gimnasio</option>
                    <option>Cancha de césped</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Desde</label>
                    <input
                      type="time"
                      value={poliExForm.startTime}
                      onChange={(e) => setPoliExForm({ ...poliExForm, startTime: e.target.value })}
                      disabled={poliExForm.canceled}
                      className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Hasta</label>
                    <input
                      type="time"
                      value={poliExForm.endTime}
                      onChange={(e) => setPoliExForm({ ...poliExForm, endTime: e.target.value })}
                      disabled={poliExForm.canceled}
                      className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/70 block mb-1">Nota (opcional)</label>
                <input
                  value={poliExForm.note}
                  onChange={(e) => setPoliExForm({ ...poliExForm, note: e.target.value })}
                  placeholder="Ej: cancha ocupada por lluvia"
                  className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                />
              </div>

              {poliError && <p className="text-sm text-red-400">{poliError}</p>}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowPoliExModal(null)}
                  className="px-4 py-2 rounded-lg border border-outline text-white/70 text-sm hover:bg-surface-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={poliExSaving}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
                >
                  {poliExSaving ? "Guardando..." : showPoliExModal.bloque ? "Aplicar cambio" : "Agregar entrenamiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL CUOTA ===================== */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-outline bg-surface-2 p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-lg font-bold">Cuota mensual</h2>
              <button onClick={() => setShowQuotaModal(false)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-white/50 mt-1">
              La cuota por jugador de {presup?.categoria}. Dejalo vacío para quitar la cuota cargada.
            </p>
            <input
              type="number"
              min="0"
              step="500"
              value={quotaInput}
              onChange={(e) => setQuotaInput(e.target.value)}
              placeholder="Ej: 30000"
              className="mt-4 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
            />
            <button
              onClick={guardarQuota}
              disabled={quotaSaving}
              className="mt-4 w-full px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
            >
              {quotaSaving ? "Guardando..." : "Guardar cuota"}
            </button>
          </div>
        </div>
      )}

      {/* ===================== MODAL GASTO ===================== */}
      {gastoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-outline bg-surface-2 p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-lg font-bold">
                {gastoModal.tipo === "fijo" ? "Nuevo gasto fijo" : `Gasto extra de ${monthShort(gastoModal.mes ?? mesActual())}`}
              </h2>
              <button onClick={() => setGastoModal(null)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-white/50 mt-1">
              {gastoModal.tipo === "fijo"
                ? "Se repite todos los meses (cancha, árbitros, viáticos...)."
                : "Gasto puntual solo de este mes (cancha extra por lluvia, etc.)."}
            </p>
            <div className="mt-4 space-y-3">
              <input
                value={gastoForm.nombre}
                onChange={(e) => setGastoForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre (ej: Cancha)"
                className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
              />
              <input
                type="number"
                min="0"
                value={gastoForm.monto}
                onChange={(e) => setGastoForm((f) => ({ ...f, monto: e.target.value }))}
                placeholder="Monto (ej: 45000)"
                className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
              />
            </div>
            <button
              onClick={guardarGasto}
              disabled={gastoSaving}
              className="mt-4 w-full px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
            >
              {gastoSaving ? "Guardando..." : "Agregar gasto"}
            </button>
          </div>
        </div>
      )}

      {/* ===================== MODAL INACTIVO (elegir mes de corte) ===================== */}
      {inactivoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-outline bg-surface-2 p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-lg font-bold">
                {inactivoModal.status === "INACTIVO" ? "Ajustar mes de corte" : "Pasar a inactivo"}
              </h2>
              <button onClick={() => setInactivoModal(null)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-white/50 mt-1">
              {inactivoModal.firstName} {inactivoModal.lastName} deja de contar la cuota y el presupuesto.
              Su historial de pagos se conserva.
            </p>
            <label className="block mt-4">
              <span className="text-xs text-white/60">Hasta qué mes jugó</span>
              <input
                type="month"
                max={new Date().toISOString().slice(0, 7)}
                value={inactivoMes}
                onChange={(e) => setInactivoMes(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
              />
            </label>
            <p className="text-xs text-white/40 mt-2 leading-relaxed">
              Si tardaron en marcarlo (ej. dejó de venir en marzo y lo marcan ahora), elegí el mes en que dejó de jugar:
              la deuda se congela ahí y los meses posteriores no corren cuota.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setInactivoModal(null)}
                className="flex-1 px-4 py-2 rounded-xl bg-surface-1 border border-outline text-white/70 text-sm font-semibold hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const p = inactivoModal;
                  setInactivoModal(null);
                  if (p && inactivoMes) setInactivo(p, inactivoMes);
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL IMPORTAR EXCEL ===================== */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-outline bg-surface-2 p-6">
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
                  className="w-full px-4 py-2 rounded-lg border border-outline text-sm hover:bg-surface-2"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}