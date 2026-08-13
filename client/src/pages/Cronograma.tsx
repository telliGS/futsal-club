import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import Layout from "../components/Layout";

interface ScheduleBloque {
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

interface SchedulePartido {
  id: string;
  time: string;
  rival: string;
  isHome: boolean;
  venue: string;
  team: { id: string; name: string };
}

interface ScheduleDia {
  fecha: string;
  dia: string;
  bloques: ScheduleBloque[];
  partidos: SchedulePartido[];
}

interface Schedule {
  from: string;
  to: string;
  semana: ScheduleDia[];
}

interface EquipoPublico {
  id: string;
  name: string;
  type: string;
}

const LUGARES = [
  { name: "Polideportivo", color: "border-primary/40 bg-primary/15 text-green-300", emoji: "🏟️" },
  { name: "La Toma", color: "border-sky-500/40 bg-sky-500/10 text-sky-300", emoji: "🌿" },
  { name: "Palermo", color: "border-amber-500/40 bg-amber-500/10 text-amber-300", emoji: "🌳" },
  { name: "Borja", color: "border-purple-500/40 bg-purple-500/10 text-purple-300", emoji: "🏠" },
  { name: "Gimnasio", color: "border-orange-500/40 bg-orange-500/10 text-orange-300", emoji: "💪" },
];

function getLugarInfo(place: string) {
  const found = LUGARES.find((l) => place.toLowerCase().includes(l.name.toLowerCase()));
  if (found) return found;
  return { color: "border-outline bg-surface-2 text-white/70", emoji: "📍" };
}

export default function Cronograma() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [teams, setTeams] = useState<EquipoPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");

  // Cargar cronograma y lista de equipos
  useEffect(() => {
    Promise.all([
      apiFetch<Schedule>("/public/schedule"),
      apiFetch<EquipoPublico[]>("/public/teams"),
    ])
      .then(([s, t]) => {
        setSchedule(s);
        setTeams(t);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  // Ordenar equipos: formativas primero, luego primeras
  const equiposOrdenados = [...teams].sort((a, b) => {
    if (a.type === "FORMATIVA" && b.type !== "FORMATIVA") return -1;
    if (a.type !== "FORMATIVA" && b.type === "FORMATIVA") return 1;
    return a.name.localeCompare(b.name);
  });

  // Categorías que tienen entrenamientos (para saber si mostrar "sin actividad")
  const categoriasConActividad = schedule
    ? Array.from(
        new Set(
          schedule.semana.flatMap((d) =>
            d.bloques.map((b) => b.team?.name).filter(Boolean)
          )
        )
      )
    : [];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
        <div className="rounded-lg border border-outline bg-surface-1 overflow-hidden animate-fade-up">
          {/* ======== Encabezado ======== */}
          <div className="relative bg-surface p-8 md:p-10 text-white overflow-hidden border-b border-outline">
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 90% at 50% 110%, rgba(0,147,66,0.30) 0%, rgba(0,99,43,0.12) 38%, transparent 72%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute right-[-7rem] bottom-[-7rem] w-[22rem] h-[22rem] rounded-full border border-white/[0.05]"
            />
            <div
              aria-hidden="true"
              className="absolute right-[-5rem] bottom-[-5rem] w-[12rem] h-[12rem] rounded-full border border-white/[0.05]"
            />
            <div className="relative">
              <div className="flex items-center gap-3">
                <img src="/escudo-jh.png" alt="" className="w-14 h-14 drop-shadow-[0_0_28px_rgba(0,255,102,0.25)]" />
                <div>
                  <p className="font-display font-bold text-lg leading-tight">Cronograma de entrenamiento</p>
                  <p className="text-xs font-mono uppercase tracking-widest text-primary-light mt-0.5">
                    José Hernández Futsal
                  </p>
                </div>
              </div>

              <h2 className="font-display text-2xl md:text-3xl font-bold mt-8 leading-snug">
                Dónde y cuándo entrena cada categoría
              </h2>
              <p className="text-white/80 text-sm mt-3 leading-relaxed max-w-lg">
                Horarios y lugares de esta semana, actualizados por los delegados del club.
                Los partidos del fin de semana también se muestran acá.
              </p>

              {/* Leyenda de lugares */}
              <div className="mt-6 flex flex-wrap gap-2 text-xs">
                {LUGARES.map((l) => (
                  <span
                    key={l.name}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${l.color}`}
                  >
                    {l.emoji} {l.name}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-200 px-2.5 py-1">
                  ⚽ Partido
                </span>
              </div>

              {/* Badge "Esta semana" */}
              {!loading && schedule && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary-light text-[11px] font-mono uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-light animate-pulse" />
                  Esta semana · {schedule.semana.filter(d => d.bloques.length > 0 || d.partidos.length > 0).length} días con actividad
                </div>
              )}
            </div>
          </div>

          {/* ======== Grilla ======== */}
          <div className="p-6 md:p-8">
            {loading && <p className="text-white/70">Cargando cronograma...</p>}
            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                No se pudo cargar el cronograma: {error}
              </p>
            )}

            {!loading && !error && schedule && schedule.semana.length > 0 && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <h3 className="font-display font-bold text-lg">Esta semana</h3>
                  <p className="text-xs font-mono text-white/50">
                    {schedule.from.split("-").join("/")} → {schedule.to.split("-").join("/")}
                  </p>
                </div>

                {/* ===== FILTRO CON TODAS LAS CATEGORÍAS ===== */}
                {equiposOrdenados.length > 0 && (
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <label className="text-sm text-white/70 font-medium">Filtrar por categoría:</label>
                    <select
                      value={categoriaFiltro}
                      onChange={(e) => setCategoriaFiltro(e.target.value)}
                      className="px-4 py-2 rounded-lg bg-surface-1 border border-outline text-sm text-white focus:outline-none focus:border-primary transition-colors"
                    >
                      <option value="todas">Todas las categorías</option>
                      {equiposOrdenados.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {categoriaFiltro !== "todas" && (
                      <button
                        onClick={() => setCategoriaFiltro("todas")}
                        className="text-xs text-white/50 hover:text-white underline transition-colors"
                      >
                        Limpiar filtro
                      </button>
                    )}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {schedule.semana.map((d) => {
                    const bloquesFiltrados =
                      categoriaFiltro === "todas"
                        ? d.bloques
                        : d.bloques.filter((b) => b.team?.name === categoriaFiltro);

                    const tieneActividad = bloquesFiltrados.length > 0 || d.partidos.length > 0;

                    // Si no hay actividad y el filtro está activo, no mostrar el día
                    if (categoriaFiltro !== "todas" && !tieneActividad) return null;
                    if (categoriaFiltro === "todas" && d.bloques.length === 0 && d.partidos.length === 0) return null;

                    return (
                      <div
                        key={d.fecha}
                        className="rounded-lg border border-outline bg-surface overflow-hidden border-t-2 border-t-primary/40"
                      >
                        <div className="px-3 py-2 border-b border-outline bg-surface-1 flex items-center justify-between">
                          <p className="font-display font-bold text-sm capitalize">{d.dia}</p>
                          <p className="text-[10px] font-mono text-white/50">
                            {new Date(`${d.fecha}T00:00:00`).toLocaleDateString("es-AR", {
                              day: "numeric",
                              month: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="p-2 space-y-1.5">
                          {d.partidos.length > 0 && (
                            <div className="px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[11px]">
                              {d.partidos.map((p) => (
                                <p key={p.id} className="text-amber-200/90 leading-snug">
                                  ⚽ <span className="font-mono">{p.time}</span> · {p.team.name} vs {p.rival}
                                </p>
                              ))}
                            </div>
                          )}
                          {bloquesFiltrados.length === 0 && d.partidos.length === 0 && (
                            <div className="py-3 text-center text-xs text-white/40 flex flex-col items-center gap-1">
                              <span className="text-lg">🌙</span>
                              <span>Sin actividad</span>
                            </div>
                          )}
                          {bloquesFiltrados.map((b) => {
                            const info = getLugarInfo(b.place);
                            return (
                              <div
                                key={b.id}
                                className={`rounded-md border px-2.5 py-2 ${info.color}`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <p className="font-mono text-xs font-semibold tabular-nums flex items-center gap-1">
                                    {info.emoji} {b.startTime}–{b.endTime}
                                  </p>
                                  <span className="text-[9px] uppercase tracking-wider opacity-70 font-mono">
                                    {b.tipo === "EXTRA" ? "Extra" : b.excepcion ? "Modificado" : "Fijo"}
                                  </span>
                                </div>
                                <p className="text-sm font-semibold mt-0.5">{b.team?.name ?? "Actividad libre"}</p>
                                <p className="text-[11px] opacity-80">{b.place}</p>
                                {b.note && <p className="text-[10px] italic opacity-70 mt-0.5">{b.note}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mensaje cuando no hay resultados con el filtro */}
                {categoriaFiltro !== "todas" && !schedule.semana.some((d) => {
                  const bloquesFiltrados = d.bloques.filter((b) => b.team?.name === categoriaFiltro);
                  return bloquesFiltrados.length > 0 || d.partidos.length > 0;
                }) && (
                  <div className="mt-8 text-center text-white/60 text-sm border border-dashed border-outline rounded-lg py-8">
                    <p className="text-2xl">🔍</p>
                    <p className="mt-2">
                      No hay entrenamientos para <span className="font-semibold text-white">{categoriaFiltro}</span> esta semana.
                    </p>
                    <button
                      onClick={() => setCategoriaFiltro("todas")}
                      className="mt-3 text-primary-light hover:underline text-sm"
                    >
                      Mostrar todas las categorías
                    </button>
                  </div>
                )}

                <p className="mt-6 text-[11px] text-white/50 text-center border-t border-outline pt-4">
                  Cronograma cargado por los delegados · Los partidos se sincronizan desde el fixture de la APFS.
                </p>
              </div>
            )}

            {!loading && !error && schedule && schedule.semana.length === 0 && (
              <div className="text-center py-12 border border-dashed border-outline rounded-lg">
                <p className="text-3xl">📅</p>
                <p className="mt-3 text-white/70">Todavía no se cargó el cronograma de esta semana.</p>
                <p className="text-sm text-white/50 mt-1">Volvé pronto para ver los entrenamientos.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}