import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, getToken, setToken } from "../lib/api";

interface Team {
  id: string;
  name: string;
  gender: string;
  type: string;
  tier?: string | null;
}

interface Player {
  id: string;
  lastName: string;
  firstName: string;
  document: string;
  status: string;
  role: string;
  position?: string | null;
  jersey?: number | null;
  payments: Array<{ month: string; paid: boolean; amount: number }>;
  estadoCuota?: {
    deudor: boolean;
    alDia: boolean;
    pendiente: boolean;
    puedeJugar: boolean;
    mesesDebe: number;
  };
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

export default function Dashboard() {
  const token = getToken();
  const [me, setMe] = useState<MeData | null>(null);
  const [teamId, setTeamId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"lista" | "calendario">("lista");

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
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-red-400">{error}</p>}

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
                <th className="p-3">
                  {monthShort(currentMonth)} {currentMonth.slice(0, 4)} — pagó
                  <span className="block text-[10px] opacity-60">cuota del mes en curso</span>
                </th>
                <th className="p-3">Deuda</th>
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
                  </tr>
                );
              })}
              {plantel.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-white/40">Sin jugadores en este equipo.</td></tr>
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
    </div>
  );
}