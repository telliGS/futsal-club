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
}

interface MeData {
  id: string;
  fullName: string;
  email: string;
  role: string;
  teams: Team[];
}

export default function Dashboard() {
  const token = getToken();
  const [me, setMe] = useState<MeData | null>(null);
  const [teamId, setTeamId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      .catch(() => setPlayers([]));
  }, [teamId, token]);

  async function toggleCuota(p: Player, month: string, paid: boolean) {
    if (!token) return;
    try {
      await apiFetch(`/players/${p.id}/payments/${month}`, {
        method: "POST",
        body: JSON.stringify({ paid, amount: 0 }),
      }, token);
      // refresh list
      const fresh = await apiFetch<Player[]>(`/teams/${teamId}/players`, {}, token);
      setPlayers(fresh);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <div className="p-10">Cargando...</div>;

  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-6 py-8">
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
      {me && me.teams.length > 1 && (
        <div className="mt-6">
          <label className="text-sm text-white/70">Estás viendo: </label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="ml-2 px-3 py-2 rounded-lg bg-white/10 border border-white/20"
          >
            {me.teams.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#1c1c1c]">
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="mt-4 text-red-400">{error}</p>}

      {/* Listado */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-white/60">
            <tr>
              <th className="p-3">Jugador</th>
              <th className="p-3">Rol</th>
              <th className="p-3">DNI</th>
              <th className="p-3">Estado</th>
              <th className="p-3">{currentMonth} — pagó</th>
              <th className="p-3">Historial reciente</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const thisMonth = p.payments.find((x) => x.month === currentMonth);
              return (
                <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3">
                    <span className="font-semibold">{p.firstName} {p.lastName}</span>
                    {p.position && <span className="text-white/40 text-xs ml-1">({p.position})</span>}
                    {p.jersey && <span className="text-white/40 text-xs ml-1">#{p.jersey}</span>}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${p.role !== "JUGADOR" ? "bg-primary/20 text-primary-light" : "bg-white/10"}`}>
                      {p.role}
                    </span>
                  </td>
                  <td className="p-3 text-white/60">{p.document}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${p.status === "DEUDA" ? "bg-red-500/20 text-red-400" : p.status === "INACTIVO" ? "bg-white/10 text-white/50" : "bg-green-500/20 text-green-400"}`}>
                      {p.status}
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
                    {p.payments.slice(1, 4).map((x) => (x.paid ? "✓" : "·")).join(" ") ?? "—"}
                  </td>
                </tr>
              );
            })}
            {players.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-white/40">Sin jugadores en este equipo.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-white/40">
        <Link to="/" className="underline">Ver sitio público</Link>
      </p>
    </div>
  );
}