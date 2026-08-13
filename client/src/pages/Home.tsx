import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import Layout from "../components/Layout";

interface Match {
  id: string;
  dateTime: string;
  venue: string;
  rival: string;
  isHome: boolean;
  clubGoals?: number | null;
  rivalGoals?: number | null;
  team: { name: string; tier?: string | null };
}

interface EquipoPublico {
  id: string;
  name: string;
  type: string;
}

interface Stats {
  equipos: number;
  jugadores: number;
  partidosProximos: number;
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDia(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { weekday: "long" });
}

function formatFechaLegible(iso: string) {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  return `${formatDia(iso).charAt(0).toUpperCase()}${formatDia(iso).slice(1)} ${dia}`;
}

function diaKeyLocal(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function colorEquipo(tipo: string): string {
  return tipo === "FORMATIVA" ? "bg-primary/15 border-primary/30" : "bg-surface-1 border-outline";
}

const EN_CURSO_WINDOW_MS = 2 * 3_600_000;
function estadoPartido(m: Match): "proximo" | "en_curso" | "terminado" {
  const inicio = new Date(m.dateTime).getTime();
  const ahora = Date.now();
  if (inicio > ahora) return "proximo";
  if (ahora - inicio < EN_CURSO_WINDOW_MS) return "en_curso";
  return "terminado";
}

function BadgeEnCurso() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-action-green/10 border border-action-green/30 text-[11px] font-mono uppercase tracking-wider text-action-green">
      <span className="relative flex w-1.5 h-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-action-green opacity-60" />
        <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-action-green" />
      </span>
      En curso
    </span>
  );
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<EquipoPublico[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selTeam, setSelTeam] = useState<EquipoPublico | null>(null);
  const [teamMatches, setTeamMatches] = useState<Match[] | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState("");

  const [restante, setRestante] = useState<{ dias: number; horas: number; mins: number } | null>(null);
  useEffect(() => {
    if (!matches.length) return;
    const tick = () => {
      const diff = new Date(matches[0].dateTime).getTime() - Date.now();
      if (diff <= 0) {
        setRestante(null);
        return;
      }
      setRestante({
        dias: Math.floor(diff / 86_400_000),
        horas: Math.floor((diff % 86_400_000) / 3_600_000),
        mins: Math.floor((diff % 3_600_000) / 60_000),
      });
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [matches]);

  useEffect(() => {
    Promise.all([
      apiFetch<Match[]>("/matches/upcoming?weekend=2"),
      apiFetch<EquipoPublico[]>("/public/teams"),
      apiFetch<Stats>("/public/stats"),
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

  const openTeam = async (t: EquipoPublico) => {
    setSelTeam(t);
    setTeamMatches(null);
    setTeamError("");
    setTeamLoading(true);
    try {
      const m = await apiFetch<Match[]>(`/matches?teamId=${t.id}&limit=50`);
      setTeamMatches(m);
    } catch (e) {
      setTeamError((e as Error).message);
    } finally {
      setTeamLoading(false);
    }
  };

  const porDia = new Map<string, Match[]>();
  for (const m of teamMatches ?? []) {
    const dia = diaKeyLocal(m.dateTime);
    const grupo = porDia.get(dia) ?? [];
    grupo.push(m);
    porDia.set(dia, grupo);
  }

  const restoPorDia = new Map<string, Match[]>();
  for (const m of matches) {
    const dia = diaKeyLocal(m.dateTime);
    const grupo = restoPorDia.get(dia) ?? [];
    grupo.push(m);
    restoPorDia.set(dia, grupo);
  }

  const formativas = teams.filter((t) => t.type === "FORMATIVA");
  const primeras = teams.filter((t) => t.type !== "FORMATIVA");
  const ordenEquipos = [...formativas, ...primeras];

  const destacado = matches[0];

  return (
    <Layout>
      {/* ============================ HERO ============================ */}
      <header className="relative bg-surface overflow-hidden border-b border-outline">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 110%, rgba(0,147,66,0.35) 0%, rgba(0,99,43,0.15) 40%, transparent 70%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #ffffff 1px, transparent 1px),
              linear-gradient(-45deg, #ffffff 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute right-[-12rem] top-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full border border-white/[0.05]"
        />
        <div
          aria-hidden="true"
          className="absolute right-[-10rem] top-1/2 -translate-y-1/2 w-[24rem] h-[24rem] rounded-full border border-white/[0.05]"
        />

        <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-32">
          <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-12">
            <div className="flex items-center gap-5 animate-fade-up">
              <div className="logo-hover shrink-0">
                <img
                  src="/escudo-jh.png"
                  alt="Escudo Club José Hernández"
                  className="w-28 h-28 md:w-36 md:h-36 drop-shadow-[0_0_40px_rgba(0,255,102,0.20)]"
                />
              </div>
              <div>
                <p className="text-primary-light font-mono text-xs uppercase tracking-[0.2em]">
                  Club José Hernández
                </p>
                <h1 className="font-display text-5xl md:text-7xl font-bold mt-2 leading-[1.1]">
                  Futsal de{" "}
                  <span className="text-primary-light">Paraná</span>
                </h1>
                <p className="mt-2 text-white/60 text-sm md:text-base max-w-md font-mono tracking-wider">
                  10 equipos · más de 100 jugadores · una pasión
                </p>
                <p className="mt-1 text-white/80 text-sm md:text-base max-w-md">
                  Competencia Oficial APFS
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 animate-fade-up md:flex-col md:items-end" style={{ animationDelay: "0.1s" }}>
              <Link to="/mi-cuota" className="btn-primary">
                Consultar mi cuota
              </Link>
              <Link to="/ingresar" className="btn-secondary">
                Área delegados
              </Link>
            </div>
          </div>

          {!loading && stats && (
            <div
              className="mt-16 grid grid-cols-3 gap-6 max-w-lg animate-fade-up"
              style={{ animationDelay: "0.15s" }}
            >
              {[
                { n: stats.jugadores, l: "Jugadores" },
                { n: stats.equipos, l: "Equipos" },
                { n: stats.partidosProximos, l: "Partidos por jugar" },
              ].map((s) => (
                <div key={s.l} className="rounded-lg bg-surface-1 border border-outline px-5 py-4 text-center bg-noise">
                  <p className="font-display font-bold text-3xl md:text-4xl tabular-nums text-white">{s.n}</p>
                  <p className="text-[11px] uppercase tracking-wider text-white/60 mt-1 font-mono">{s.l}</p>
                </div>
              ))}
            </div>
          )}

          {/* Partido destacado */}
          {!loading && destacado && (
            (() => {
              const estado = estadoPartido(destacado);
              const enCurso = estado === "en_curso";
              return (
                <div className="mt-10 max-w-md animate-fade-up" style={{ animationDelay: "0.2s" }}>
                  <div className="border-t-2 border-primary/50 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-primary/20 text-primary-light text-[11px] font-mono uppercase tracking-wider border border-primary/30 rounded-sm">
                        {destacado.team.name}
                      </span>
                      {enCurso ? (
                        <BadgeEnCurso />
                      ) : (
                        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40">
                          Próximo partido
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4">
                      <p className="font-display font-black text-3xl md:text-4xl leading-tight tracking-tight">
                        {destacado.isHome ? "J.H." : destacado.rival}
                      </p>
                      <span className="font-mono text-white/20 text-sm tracking-widest">VS</span>
                      <p className="font-display font-black text-3xl md:text-4xl leading-tight tracking-tight text-right">
                        {destacado.isHome ? destacado.rival : "J.H."}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/60">
                      <span className="text-white/80">{formatFechaLegible(destacado.dateTime)}</span>
                      <span className="text-white/30">·</span>
                      <span className="font-mono tabular-nums text-white/80">{formatHora(destacado.dateTime)}</span>
                      <span className="text-white/30">·</span>
                      <span className="uppercase tracking-wider text-xs text-white/70">{destacado.venue}</span>
                    </div>

                    {!enCurso && restante && (
                      <div className="mt-4 flex items-center gap-4 border-t border-white/10 pt-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">⌛</span>
                        <span className="font-mono text-sm font-bold text-primary-light tabular-nums tracking-wide">
                          {restante.dias > 0
                            ? `${restante.dias}d ${restante.horas}h`
                            : restante.horas > 0
                              ? `${restante.horas}h ${restante.mins}m`
                              : `${restante.mins}m`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* ========================= PRÓXIMOS PARTIDOS ========================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-up">
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <span className="inline-block w-1.5 h-7 bg-primary rounded-full" />
            Próximos partidos
            {!loading && matches.length > 1 && (
              <span className="text-xs font-mono bg-primary/15 text-primary-light px-2.5 py-1 rounded-full">
                {matches.length}
              </span>
            )}
          </h2>
        </div>

        {loading && <p className="mt-6 text-white/70">Cargando partidos...</p>}
        {error && <p className="mt-6 text-red-400">No se pudieron cargar los datos: {error}</p>}
        {!loading && !error && matches.length === 0 && (
          <div className="mt-8 rounded-lg border border-dashed border-outline p-10 text-center">
            <p className="text-3xl">📅</p>
            <p className="mt-3 font-display font-bold text-lg">Todavía no hay partidos cargados</p>
            <p className="text-sm text-white/60 mt-1">Los fixtures se publican acá apenas se carga la fecha. Volvé pronto.</p>
          </div>
        )}

        {restoPorDia.size > 0 && matches.length >= 1 && (
          <div className="mt-4 space-y-6">
            {[...restoPorDia.entries()].map(([dia, parts]) => (
              <div key={dia}>
                <p className="text-xs font-mono uppercase tracking-widest text-primary-light mb-2">
                  {formatFechaLegible(parts[0].dateTime)}
                </p>
                <div className="grid md:grid-cols-2 gap-4 gap-y-3">
                  {parts.map((m, i) => (
                    <article
                      key={m.id}
                      className="group animate-fade-up relative pl-4 border-l-4 border-primary/60 hover:border-primary transition-all duration-300"
                      style={{ animationDelay: `${0.05 * i}s` }}
                    >
                      {i === 0 && (
                        <span className="absolute -top-2 -right-2 z-10 px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-mono uppercase tracking-wider shadow-lg">
                          ¡Este finde!
                        </span>
                      )}
                      <div className="flex items-start gap-4 py-3 border-b border-white/5 hover:border-white/10 transition-colors">
                        <div className="shrink-0 w-14 rounded-lg bg-primary/10 border border-primary/20 text-center py-2 transition-colors duration-200 group-hover:bg-primary/20">
                          <p className="text-[10px] uppercase tracking-wide text-primary-light font-mono">
                            {formatDia(m.dateTime).slice(0, 3)}
                          </p>
                          <p className="font-display font-bold text-lg leading-none mt-1">
                            {new Date(m.dateTime).getDate()}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-bold text-lg leading-snug">
                            {m.isHome ? "J.H." : m.rival}{" "}
                            <span className="text-white/30 font-light">vs</span>{" "}
                            {m.isHome ? m.rival : "J.H."}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                            <span className="text-sm text-white/60">{m.team.name}</span>
                            <span className="text-white/30">·</span>
                            <span className="text-xs text-white/50 uppercase tracking-wider">{m.venue}</span>
                            {estadoPartido(m) === "en_curso" && <BadgeEnCurso />}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`font-display font-bold text-2xl tabular-nums transition-colors duration-200 group-hover:text-primary-light ${estadoPartido(m) === "en_curso" ? "text-action-green" : ""}`}>
                            {formatHora(m.dateTime)}
                          </p>
                          {estadoPartido(m) === "en_curso" && (
                            <p className="text-[10px] font-mono uppercase tracking-wider text-action-green/80 mt-0.5">
                              jugándose
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================= CATEGORÍAS DEL CLUB ========================= */}
<section className="mt-16">
  <div className="flex flex-wrap items-end justify-between gap-3 animate-fade-up">
    <div>
      <h2 className="font-display text-2xl font-bold flex items-center gap-3">
        <span className="inline-block w-1.5 h-7 bg-primary rounded-full" />
        Categorías del club
      </h2>
      <p className="mt-1 text-white/70 text-sm">
        Formativas y equipos de primera compitiendo en la APFS de Paraná.
      </p>
    </div>
    <span className="text-xs font-mono bg-primary/15 text-primary-light px-3 py-1.5 rounded-full shrink-0 border border-primary/20">
      {teams.length} equipos
    </span>
  </div>

  {teams.length > 0 && (
    <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {ordenEquipos.map((t, i) => (
        <button
          key={t.id}
          type="button"
          onClick={() => openTeam(t)}
          title={`Ver partidos de ${t.name}`}
          className="card p-4 text-center animate-fade-up transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 group cursor-pointer"
          style={{ animationDelay: `${0.04 * i}s` }}
        >
          <p className="font-display font-bold text-xl leading-tight">{t.name}</p>
          <span
            className={`mt-2 inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-mono border text-center ${colorEquipo(t.type)}`}
          >
            {t.type === "FORMATIVA" ? "Formativa" : "Primera"}
          </span>
          <span className="mt-2 block text-[10px] uppercase tracking-wider text-white/40 font-mono opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Ver partidos →
          </span>
        </button>
      ))}
    </div>
  )}
  {!loading && teams.length === 0 && (
    <p className="mt-4 text-white/60 text-sm">Las categorías se cargan al configurar el club.</p>
  )}
</section>

        {/* ========================= HISTORIA ========================= */}
        <section className="mt-16 border-t border-outline pt-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-display text-3xl font-bold flex items-center gap-3">
                <span className="inline-block w-1.5 h-8 bg-primary rounded-full" />
                Nuestra historia
              </h2>
              <div className="mt-4 text-white/80 leading-relaxed space-y-3">
                <p>
                  Somos el Club José Hernández. Nacimos el <span className="text-primary-light font-semibold">30 de abril de 2010</span> en el <span className="text-white font-semibold">barrio José Hernández</span>, con una pelota y un sueño. Perdimos finales, pero nunca bajamos los brazos.
                </p>
                <p>
                  En <span className="text-primary-light font-semibold">2015</span> llegó el primer título: la Juvenil Clausura. Un año después, en <span className="text-primary-light font-semibold">2016</span>, dimos la vuelta: campeones de la <span className="text-white font-semibold">Copa de Oro Norte en Corrientes</span>, siendo el único club de la ciudad con un campeonato local, provincial y nacional.
                </p>
                <p>
                  El <span className="text-primary-light font-semibold">2017</span> fue un año histórico: <span className="text-white font-semibold">JH masculino campeón del Apertura de Elite</span> (venciendo a Paracao 2-1) y <span className="text-white font-semibold">JH Femenino campeón del Apertura de ascenso</span> (4-3 vs Oro Verde). <span className="text-primary-light font-semibold">¡Los dos equipos salieron campeones el mismo año!</span> En <span className="text-primary-light font-semibold">2022</span>, JH Elite repitió en el Clausura de la División Elite. En <span className="text-primary-light font-semibold">2023</span>, nuestra <span className="text-white font-semibold">1ra Femenina</span> levantó el Torneo Apertura APFS. En <span className="text-primary-light font-semibold">2024</span>, JH C fue campeón del Clausura en la "B". En <span className="text-primary-light font-semibold">2025</span>, JH Negro fue campeón del Clausura en Segunda División. Y este <span className="text-primary-light font-semibold">2026</span>, nuestras C11 y C13 salieron campeonas del Apertura.
                </p>
                <p>
                  Hoy somos <span className="text-white font-semibold">10 equipos</span>, más de <span className="text-white font-semibold">100 jugadores</span>, y seguimos siendo un club de barrio: <span className="text-white font-semibold">familia, esfuerzo y pasión</span> por la camiseta verde. <span className="text-primary-light font-semibold">Somos JH Futsal.</span>
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link to="/historia" className="btn-primary inline-flex items-center gap-2">
                  Conocé más
                  <span aria-hidden>→</span>
                </Link>
                <a
                  href="https://www.instagram.com/josehernandezfs/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  📸 Seguinos en Instagram
                </a>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-outline shadow-xl bg-surface-1 aspect-[4/3]">
              <img
                src="/images/historia-1.jpg"
                alt="Equipo del Club José Hernández"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>

      {/* ========================= EL CLUB ========================= */}
<section className="mt-16">
  <h2 className="font-display text-2xl font-bold flex items-center gap-3 animate-fade-up">
    <span className="inline-block w-1.5 h-7 bg-primary rounded-full" />
    El club
  </h2>
  <div className="mt-6 grid md:grid-cols-3 gap-4">
    <div className="rounded-lg border border-outline bg-surface-1 bg-noise p-6 animate-fade-up border-l-4 border-l-primary transition-all duration-200 hover:-translate-y-1">
      <span className="w-11 h-11 rounded-xl bg-surface-2 border border-outline flex items-center justify-center text-xl">
        🌱
      </span>
      <h3 className="font-display font-bold mt-4">Semillero de campeones</h3>
      <p className="text-sm text-white/70 mt-2 leading-relaxed">
        {formativas.length} categorías de base (C11 a C20) formando jugadores
        para la primera división del club.
      </p>
    </div>
    <div className="rounded-lg border border-outline bg-surface-1 bg-noise p-6 animate-fade-up transition-all duration-200 hover:-translate-y-1" style={{ animationDelay: "0.05s" }}>
      <span className="w-11 h-11 rounded-xl bg-surface-2 border border-outline flex items-center justify-center text-xl">
        ⚽
      </span>
      <h3 className="font-display font-bold mt-4">Cuatro equipos de primera</h3>
      <p className="text-sm text-white/70 mt-2 leading-relaxed">
        Primera Femenina, JH C, JH NEGRO y JH ELITE en la Competencia Oficial APFS.
      </p>
    </div>
    <div className="rounded-lg border border-outline bg-surface-1 bg-noise p-6 animate-fade-up transition-all duration-200 hover:-translate-y-1" style={{ animationDelay: "0.1s" }}>
      <span className="w-11 h-11 rounded-xl bg-surface-2 border border-outline flex items-center justify-center text-xl">
        🏟️
      </span>
      <h3 className="font-display font-bold mt-4">Futsal de Paraná</h3>
      <p className="text-sm text-white/70 mt-2 leading-relaxed">
        Jugamos los fines en las canchas de la ciudad (Berduc, Unión Árabe,
        Toma Vieja) con la APFS.
      </p>
    </div>
  </div>
</section>
      </main>

      {/* ===================== MODAL: FIXTURE DEL EQUIPO ===================== */}
      {selTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={`Partidos de ${selTeam.name}`}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelTeam(null)} />
          <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-lg border border-outline bg-surface-2 shadow-lg">
            <div className="flex items-center gap-3 p-5 border-b border-outline">
              <img src="/escudo-jh.png" alt="" className="w-10 h-10 shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-lg leading-tight">{selTeam.name}</h3>
                <span className="text-xs text-white/70">
                  {selTeam.type === "FORMATIVA" ? "Categoría formativa" : "Primera"} · Futsal APFS
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelTeam(null)}
                aria-label="Cerrar"
                className="btn px-3 py-1.5 bg-surface-1 border border-outline hover:bg-surface-2"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {teamLoading && <p className="text-white/70 text-center py-8">Cargando partidos...</p>}
              {teamError && <p className="text-red-400 text-center py-8">No se pudieron cargar: {teamError}</p>}
              {!teamLoading && !teamError && teamMatches && teamMatches.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-3xl">🗓️</p>
                  <p className="mt-3 font-display font-bold">Todavía no hay partidos cargados</p>
                  <p className="text-sm text-white/60 mt-1">
                    El fixture de {selTeam.name} se publica acá apenas se carga la fecha.
                  </p>
                </div>
              )}

              {!teamLoading && !teamError && teamMatches && teamMatches.length > 0 && (
                <div className="space-y-6">
                  {[...porDia.entries()].map(([dia, parts]) => (
                    <div key={dia}>
                      <p className="text-xs font-mono uppercase tracking-widest text-primary-light mb-2">
                        {formatFechaLegible(parts[0].dateTime)}
                      </p>
                      <div className="space-y-2">
                        {parts.map((m) => {
                          const yaJugado = new Date(m.dateTime) < new Date();
                          const conResultado = m.clubGoals != null && m.rivalGoals != null && yaJugado;
                          const ganado = conResultado && m.clubGoals! > m.rivalGoals!;
                          const perdido = conResultado && m.clubGoals! < m.rivalGoals!;
                          return (
                            <div
                              key={m.id}
                              className={`rounded-xl border p-3 flex items-center gap-3 transition-colors duration-200 ${
                                conResultado
                                  ? ganado
                                    ? "border-green-500/40 bg-green-500/10"
                                    : perdido
                                      ? "border-red-500/40 bg-red-500/10"
                                      : "border-yellow-500/40 bg-yellow-500/10"
                                  : yaJugado
                                    ? "border-white/10 bg-white/[0.03] opacity-60"
                                    : "border-primary/40 bg-primary/10 shadow-[0_0_16px_rgba(0,147,66,0.18)]"
                              }`}
                            >
                              <p className="font-display font-bold text-xl tabular-nums w-16 shrink-0 text-center">
                                {formatHora(m.dateTime)}
                              </p>
                              <div className="flex-1 min-w-0">
                                <p className="font-display font-bold text-sm leading-snug">
                                  {conResultado ? (
                                    <>
                                      J.H.{" "}
                                      <span className="text-white/80">
                                        {m.clubGoals} - {m.rivalGoals}
                                      </span>{" "}
                                      {m.rival}
                                    </>
                                  ) : (
                                    <>
                                      {m.isHome ? "J.H." : m.rival}{" "}
                                      <span className="text-white/40 font-light">vs</span>{" "}
                                      {m.isHome ? m.rival : "J.H."}
                                    </>
                                  )}
                                </p>
                                <p className="text-xs text-white/60 mt-0.5 truncate">{m.venue}</p>
                              </div>
                              {conResultado ? (
                                <span
                                  className={`shrink-0 inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border ${
                                    ganado
                                      ? "text-green-300 border-green-500/40 bg-green-500/15"
                                      : perdido
                                        ? "text-red-300 border-red-500/40 bg-red-500/15"
                                        : "text-yellow-200 border-yellow-500/40 bg-yellow-500/15"
                                  }`}
                                >
                                  {ganado ? "✓ Ganado" : perdido ? "✗ Perdido" : "= Empate"}
                                </span>
                              ) : yaJugado ? (
                                <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 shrink-0">
                                  Jugado
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono uppercase tracking-wider text-primary-light shrink-0">
                                  Próximo
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-outline text-center text-[11px] text-white/50">
              Los partidos se sincronizan automáticamente desde el fixture de la APFS.
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}