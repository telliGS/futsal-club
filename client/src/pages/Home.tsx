import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { apiFetch } from "../lib/api";
import { usePageMeta } from "../lib/usePageMeta";
import { cn } from "../lib/cn";

interface IMatch {
  id: string;
  dateTime: string;
  venue: string;
  isHome: boolean;
  rival: string;
  team: { name: string };
  clubGoals?: number | null;
  rivalGoals?: number | null;
}

interface IEquipoPublico {
  id: string;
  name: string;
  type: string;
}

interface IStats {
  jugadores: number;
  equipos: number;
  partidosProximos: number;
}

function formatHora(iso: string): string {
  // El server guarda instantes absolutos en UTC. La hora del evento se muestra
  // en hora de Argentina (UTC-3, sin DST) calculada directamente sobre UTC,
  // sin re-format por zona local del navegador (evita doble conversión).
  const d = new Date(iso);
  const hora = (d.getUTCHours() - 3 + 24) % 24;
  const min = d.getUTCMinutes();
  return `${String(hora).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}



function formatDia(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { weekday: "long" });
}

function formatFechaLegible(iso: string) {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  return `${dia} de ${d.getUTCFullYear()}`;
}

function diaKeyLocal(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function colorEquipo(tipo: string): string {
  return tipo === "FORMATIVA"
    ? "bg-primary/15 text-primary-light border-primary/30"
    : "bg-white/10 text-white/60 border-white/20";
}

const EN_CURSO_WINDOW_MS = 90 * 60_000; // 1:30h = duración aprox. de un partido de futsal
function estadoPartido(m: IMatch, ahora: number = Date.now()): "proximo" | "en_curso" | "terminado" {
  const inicio = new Date(m.dateTime).getTime();
  if (ahora < inicio) return "proximo";
  if (ahora - inicio < EN_CURSO_WINDOW_MS) return "en_curso";
  return "terminado";
}

function BadgeEnCurso() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
      En curso
    </span>
  );
}

// ============================ HERO ============================
function Hero() {
  return (
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

      <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-8 md:gap-12">
          <div className="flex flex-col items-center text-center md:flex-row md:items-center md:text-left gap-4 md:gap-6">
            <div className="logo-hover shrink-0">
              <img
                src="/escudo-jh.png"
                alt="Escudo Club José Hernández"
                className="w-24 h-24 md:w-36 md:h-36"
              />
            </div>
            <div>
              <p className="text-white/60 font-mono text-[10px] uppercase tracking-[0.14em]">
                Club Social y Deportivo
              </p>
              <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold mt-2 leading-[1.1] text-white">
                José Hernández
              </h1>
              <div className="mt-3 flex justify-center md:justify-start">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary-light text-xs font-mono uppercase tracking-wider">
                  Futsal · APFS Paraná
                </span>
              </div>
              <p className="mt-3 text-white/70 text-sm md:text-base max-w-md">
                Más de 100 jugadores en 10 equipos · Desde 2010
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 animate-fade-up md:flex-row md:items-center shrink-0" style={{ animationDelay: "0.1s" }}>
            <Link to="/mi-cuota" className="btn-primary active:scale-[0.96] transition-transform">
              Consultar mi cuota
            </Link>
            <Link to="/ingresar" className="btn-secondary active:scale-[0.96] transition-transform">
              Área delegados
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

// ============================ PRÓXIMOS PARTIDOS ============================
interface IProximosProps {
  loading: boolean;
  error: string;
  matches: IMatch[];
  restoPorDia: Map<string, IMatch[]>;
}

function SeccionProximos({ loading, error, matches, restoPorDia }: IProximosProps) {
  return (
    <>
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
                  className="group animate-fade-up relative pl-4 border-l-2 border-primary/60 hover:border-primary transition-all duration-300"
                  style={{ animationDelay: `${0.05 * i}s` }}
                >
                    {i === 0 && (
                      <span className="absolute -top-2 -right-2 z-10 px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-mono uppercase tracking-wider">
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
                          <span className="text-white/25 font-light">vs</span>{" "}
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
                        <p className={cn('font-display font-bold text-2xl tabular-nums transition-colors duration-200 group-hover:text-primary-light', estadoPartido(m) === "en_curso" ? "text-action-green" : "")}>
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
    </>
  );
}

// ============================ CATEGORÍAS DEL CLUB ============================
interface ICategoriasProps {
  loading: boolean;
  teams: IEquipoPublico[];
  ordenEquipos: IEquipoPublico[];
  openTeam: (t: IEquipoPublico) => void;
}

function SeccionCategorias({ loading, teams, ordenEquipos, openTeam }: ICategoriasProps) {
  return (
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
              className="card p-4 rounded-xl text-center animate-fade-up transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary/60 group cursor-pointer active:scale-[0.96]"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <p className="font-display font-bold text-xl leading-tight">{t.name}</p>
              <span
                className={cn('mt-2 inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-mono border text-center', colorEquipo(t.type))}
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
  );
}

// ============================ HISTORIA ============================
function SeccionHistoria() {
  return (
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
        <div className="rounded-xl overflow-hidden border border-outline bg-surface-1 aspect-[4/3]">
          <img
            src="/images/galeria-historica/clausura-2025-01.jpg"
            alt="José Hernández Negro celebrando el título del Clausura 2025 en el polideportivo"
            loading="lazy"
            decoding="async"
            width="1066"
            height="1066"
            className="w-full h-full object-cover outline outline-1 outline-white/10"
          />
        </div>
      </div>
    </section>
  );
}

// ============================ EL CLUB ============================
interface IElClubProps {
  formativas: IEquipoPublico[];
}

function SeccionElClub({ formativas }: IElClubProps) {
  return (
    <section className="mt-16">
      <h2 className="font-display text-2xl font-bold flex items-center gap-3 animate-fade-up">
        <span className="inline-block w-1.5 h-7 bg-primary rounded-full" />
        El club
      </h2>
      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <div className="card-static animate-fade-up">
          <span className="w-11 h-11 rounded-xl bg-surface-2 border border-outline flex items-center justify-center text-xl">
            🌱
          </span>
          <h3 className="font-display font-bold mt-4">Semillero de campeones</h3>
          <p className="text-sm text-white/70 mt-2 leading-relaxed">
            {formativas.length} categorías de base (C11 a C20) formando jugadores
            para la primera división del club.
          </p>
        </div>
        <div className="card-static animate-fade-up" style={{ animationDelay: "0.05s" }}>
          <span className="w-11 h-11 rounded-xl bg-surface-2 border border-outline flex items-center justify-center text-xl">
            ⚽
          </span>
          <h3 className="font-display font-bold mt-4">Cuatro equipos de primera</h3>
          <p className="text-sm text-white/70 mt-2 leading-relaxed">
            Primera Femenina, JH C, JH NEGRO y JH ELITE en la Competencia Oficial APFS.
          </p>
        </div>
        <div className="card-static animate-fade-up" style={{ animationDelay: "0.1s" }}>
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
  );
}

// ============================ MODAL: FIXTURE DEL EQUIPO ============================
interface ITeamModalProps {
  selTeam: IEquipoPublico | null;
  teamLoading: boolean;
  teamError: string;
  teamMatches: IMatch[] | null;
  porDia: Map<string, IMatch[]>;
  onClose: () => void;
}

function TeamModal({ selTeam, teamLoading, teamError, teamMatches, porDia, onClose }: ITeamModalProps) {
  if (!selTeam) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Partidos de ${selTeam.name}`}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-lg border border-outline bg-surface-2">
        <div className="flex items-center gap-3 p-5 border-b border-outline">
          <img src="/escudo-jh.png" alt="Escudo Club José Hernández" className="w-10 h-10 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-lg leading-tight">{selTeam.name}</h3>
            <span className="text-xs text-white/70">
              {selTeam.type === "FORMATIVA" ? "Categoría formativa" : "Primera"} · Futsal APFS
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
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
                          className={cn('rounded-xl border p-3 flex items-center gap-3 transition-colors duration-200',
                            conResultado
                              ? ganado
                                ? 'border-primary/40 bg-primary/10'
                                : perdido
                                  ? 'border-red-500/40 bg-red-500/10'
                                  : 'border-white/15 bg-white/[0.04]'
                              : yaJugado
                                ? 'border-white/10 bg-white/[0.03] opacity-60'
                                : 'border-primary/40 bg-primary/10'
                          )}
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
                              className={cn('shrink-0 inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border',
                                ganado
                                  ? 'text-primary-light border-primary/40 bg-primary/15'
                                  : perdido
                                    ? 'text-red-300 border-red-500/40 bg-red-500/15'
                                    : 'text-white/60 border-white/15 bg-white/[0.04]'
                              )}
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
  );
}

// ============================ HOME ============================
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
  // Reloj para que el destacado avance solo cuando pasa la hora del partido
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Destacado: el partido no terminado más cercano (en curso o por jugarse),
  // sin depender del orden de la lista. Avanza solo al pasar cada horario.
  // Nota: un partido a las 21:00 ARG = 00:00 UTC, así que NO se filtra por
  // "hora confirmada" (heurística rota para las 21:00).
  const destacado = matches
    .filter((m) => estadoPartido(m, now) !== "terminado")
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];

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

  const openTeam = async (t: IEquipoPublico) => {
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
  };

  // Partidos del equipo seleccionado agrupados por día local
  const porDia = new Map<string, IMatch[]>();
  for (const m of teamMatches ?? []) {
    const dia = diaKeyLocal(m.dateTime);
    const grupo = porDia.get(dia) ?? [];
    grupo.push(m);
    porDia.set(dia, grupo);
  }

  // Próximos agrupados por día local
  const restoPorDia = new Map<string, IMatch[]>();
  for (const m of matches) {
    const dia = diaKeyLocal(m.dateTime);
    const grupo = restoPorDia.get(dia) ?? [];
    grupo.push(m);
    restoPorDia.set(dia, grupo);
  }

  const formativas = teams.filter((t) => t.type === "FORMATIVA");
  const primeras = teams.filter((t) => t.type !== "FORMATIVA");
  const ordenEquipos = [...formativas, ...primeras];

  return (
    <Layout>
      <Hero />

            {/* Métricas sutiles — stats solo, destacado va como emergente flotante */}
      <section className="max-w-5xl mx-auto px-6 -mt-6 md:-mt-8 relative z-10" aria-label="Resumen del club">
        {!loading && stats && (
          <div
            className="flex divide-x divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.06] bg-surface-1/50 backdrop-blur"
            role="list"
            aria-label="Estadísticas del club"
          >
            {[
              { n: stats.jugadores, l: "Jugadores", d: "plantel activo" },
              { n: stats.equipos, l: "Equipos", d: "categorías" },
              { n: stats.partidosProximos, l: "Próximos", d: "este finde" },
            ].map((s) => (
              <div
                key={s.l}
                role="listitem"
                className="flex min-w-0 flex-1 flex-col items-center justify-center px-2 py-2.5 text-center md:px-4 md:py-3"
              >
                <p className="font-display text-[17px] font-bold leading-none tabular-nums text-white/90 md:text-xl">{s.n}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] leading-none text-white/35 md:text-[10px]">{s.l}</p>
                <p className="mt-0.5 hidden text-[10px] leading-none text-white/25 md:block">{s.d}</p>
              </div>
            ))}
          </div>
        )}
        {loading && (
          <div
            className="flex divide-x divide-white/[0.04] overflow-hidden rounded-lg border border-white/[0.04] bg-surface-1/30"
            aria-hidden="true"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[52px] flex-1 animate-pulse bg-white/[0.02] md:h-[60px]" />
            ))}
          </div>
        )}
      </section>

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
        onClose={() => setSelTeam(null)}
      />

      {/* Próximo partido emergente — fixed arriba, descartable */}
      {!loading && destacado && showEmergente && (
        <div className="pointer-events-none fixed inset-x-4 top-20 z-30 md:top-20 md:right-6 md:left-auto md:w-[380px]">
          <article
            aria-labelledby="emergente-heading"
            className="pointer-events-auto card--lead group relative flex flex-col gap-0 overflow-hidden shadow-2xl"
          >
            <button
              onClick={() => setShowEmergente(false)}
              aria-label="Cerrar"
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-surface-2/90 text-white/60 hover:bg-surface-1 hover:text-white border border-white/10"
            >
              ✕
            </button>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: "radial-gradient(85% 120% at 100% 0%, rgba(0,143,57,0.12) 0%, transparent 60%)",
              }}
            />
            <div className="relative flex items-center gap-2 px-4 pt-4 pr-10">
              <span className="inline-flex items-center rounded border border-primary/30 bg-primary/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary-light">
                {destacado.team.name}
              </span>
              <span className="font-mono text-[10px] text-white/40">Próximo</span>
              {estadoPartido(destacado) === "en_curso" ? (
                <BadgeEnCurso />
              ) : (
                restante && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-[11px] font-semibold tabular-nums text-primary-light">
                    ⏳ {restante.dias > 0 ? `${restante.dias}d ${restante.horas}h` : restante.horas > 0 ? `${restante.horas}h ${restante.mins}m` : `${restante.mins}m`}
                  </span>
                )
              )}
            </div>
            <div className="relative flex items-center gap-2 px-4 py-3">
              <h3 id="emergente-heading" className="min-w-0 flex-1 font-display text-lg font-bold leading-none truncate">
                {destacado.isHome ? "J.H." : destacado.rival}
              </h3>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-outline bg-surface-2 text-[9px] font-bold text-white/30">VS</span>
              <h3 className="min-w-0 flex-1 text-right font-display text-lg font-bold leading-none truncate">
                {destacado.isHome ? destacado.rival : "J.H."}
              </h3>
            </div>
            <div className="relative flex items-center gap-2 border-t border-white/[0.06] bg-surface-1/50 px-4 py-2.5 text-xs">
              <span className="font-mono text-white/70">{formatFechaLegible(destacado.dateTime)}</span>
              <span className="text-white/20">·</span>
              <span className="font-mono text-white/70">{formatHora(destacado.dateTime)}</span>
              <span className="text-white/20">·</span>
              <span className="truncate text-[11px] uppercase tracking-wider text-white/45">{destacado.venue}</span>
            </div>
          </article>
        </div>
      )}
    </Layout>
  );
}