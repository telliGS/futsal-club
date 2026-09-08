import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Hero from "../components/home/Hero";
import Metricas from "../components/home/Metricas";
import SeccionProximos from "../components/home/SeccionProximos";
import SeccionCategorias from "../components/home/SeccionCategorias";
import SeccionHistoria from "../components/home/SeccionHistoria";
import SeccionElClub from "../components/home/SeccionElClub";
import TeamModal from "../components/home/TeamModal";
import Emergente from "../components/home/Emergente";
import { apiFetch } from "../lib/api";
import { usePageMeta } from "../lib/usePageMeta";
import {
  IEquipoPublico,
  IMatch,
  IStats,
  diaKeyLocal,
  estadoPartido,
} from "../lib/home-helpers";

export default function Home() {
  usePageMeta({
    title: "Inicio",
    description: "Futsal de Paraná: próximos partidos, categorías formativas y primera. Club José Hernández, 10 equipos y más de 100 jugadores.",
  });
  const [matches, setMatches] = useState<IMatch[]>([]);
  const [teams, setTeams] = useState<IEquipoPublico[]>([]);
  const [stats, setStats] = useState<IStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selTeam, setSelTeam] = useState<IEquipoPublico | null>(null);
  const [teamMatches, setTeamMatches] = useState<IMatch[] | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState("");

  const [restante, setRestante] = useState<{ dias: number; horas: number; mins: number } | null>(null);
  const [showEmergente, setShowEmergente] = useState(true);
  // Reloj para que el destacado avance solo cuando pasa la hora del partido.
  // Los derivados están memoizados y los componentes segmentados con
  // React.memo: el tick no re-renderiza el resto de la página.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Destacado: el partido no terminado más cercano (en curso o por jugarse),
  // sin depender del orden de la lista. Avanza solo al pasar cada horario.
  // Nota: un partido a las 21:00 ARG = 00:00 UTC, así que NO se filtra por
  // "hora confirmada" (heurística rota para las 21:00).
  const destacado = useMemo(
    () =>
      matches
        .filter((m) => estadoPartido(m, now) !== "terminado")
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0],
    [matches, now]
  );

  // Countdown derivado de `now` — un solo reloj alimenta destacado y restante.
  useEffect(() => {
    if (!destacado) {
      setRestante(null);
      return;
    }
    const diff = new Date(destacado.dateTime).getTime() - now;
    if (diff <= 0) {
      setRestante(null);
      return;
    }
    setRestante({
      dias: Math.floor(diff / 86_400_000),
      horas: Math.floor((diff % 86_400_000) / 3_600_000),
      mins: Math.floor((diff % 3_600_000) / 60_000),
    });
  }, [destacado, now]);

  useEffect(() => {
    Promise.all([
      apiFetch<IMatch[]>("/matches/upcoming?weekend=2"),
      apiFetch<IEquipoPublico[]>("/public/teams"),
      apiFetch<IStats>("/public/stats"),
    ])
      .then(([m, t, s]) => {
        setMatches(m);
        setTeams(t);
        setStats(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selTeam) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelTeam(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selTeam]);

  const openTeam = useCallback(async (t: IEquipoPublico) => {
    setSelTeam(t);
    setTeamMatches(null);
    setTeamError("");
    setTeamLoading(true);
    try {
      const m = await apiFetch<IMatch[]>(`/matches?teamId=${t.id}&limit=50`);
      setTeamMatches(m);
    } catch (e) {
      setTeamError((e as Error).message);
    } finally {
      setTeamLoading(false);
    }
  }, []);

  const cerrarTeam = useCallback(() => setSelTeam(null), []);
  const cerrarEmergente = useCallback(() => setShowEmergente(false), []);

  // Partidos del equipo seleccionado agrupados por día local
  const porDia = useMemo(() => {
    const mapa = new Map<string, IMatch[]>();
    for (const m of teamMatches ?? []) {
      const dia = diaKeyLocal(m.dateTime);
      const grupo = mapa.get(dia) ?? [];
      grupo.push(m);
      mapa.set(dia, grupo);
    }
    return mapa;
  }, [teamMatches]);

  // Próximos agrupados por día local
  const restoPorDia = useMemo(() => {
    const mapa = new Map<string, IMatch[]>();
    for (const m of matches) {
      const dia = diaKeyLocal(m.dateTime);
      const grupo = mapa.get(dia) ?? [];
      grupo.push(m);
      mapa.set(dia, grupo);
    }
    return mapa;
  }, [matches]);

  const { formativas, ordenEquipos } = useMemo(() => {
    const formativas = teams.filter((t) => t.type === "FORMATIVA");
    const primeras = teams.filter((t) => t.type !== "FORMATIVA");
    return { formativas, ordenEquipos: [...formativas, ...primeras] };
  }, [teams]);

  return (
    <Layout>
      <Hero />

      <Metricas loading={loading} stats={stats} />

      <main className="max-w-5xl mx-auto px-6 py-16">
        <SeccionProximos loading={loading} error={error} matches={matches} restoPorDia={restoPorDia} />

        <SeccionCategorias loading={loading} teams={teams} ordenEquipos={ordenEquipos} openTeam={openTeam} />

        <SeccionHistoria />

        <SeccionElClub formativas={formativas} />
      </main>

      <TeamModal
        selTeam={selTeam}
        teamLoading={teamLoading}
        teamError={teamError}
        teamMatches={teamMatches}
        porDia={porDia}
        onClose={cerrarTeam}
      />

      {!loading && destacado && (
        <Emergente
          destacado={destacado}
          restante={restante}
          visible={showEmergente}
          onClose={cerrarEmergente}
        />
      )}
    </Layout>
  );
}