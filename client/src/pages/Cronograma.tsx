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

function schedulePlaceColor(place: string): string {
  if (/polideportivo/i.test(place)) return "bg-primary/15 border-primary/40 text-green-300";
  if (/toma/i.test(place)) return "bg-sky-500/10 border-sky-500/30 text-sky-300";
  if (/palermo/i.test(place)) return "bg-amber-500/10 border-amber-500/30 text-amber-300";
  if (/borja/i.test(place)) return "bg-purple-500/10 border-purple-500/30 text-purple-300";
  if (/gym|gimnasio/i.test(place)) return "bg-orange-500/10 border-orange-500/30 text-orange-300";
  return "bg-surface-2 border-outline text-white/70";
}

export default function Cronograma() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Schedule>("/public/schedule")
      .then(setSchedule)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
        <div className="rounded-lg border border-outline bg-surface-1 overflow-hidden animate-fade-up">
          {/* ======== Panel de marca (arriba) — noche de estadio ======== */}
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
              <p className="text-white/70 text-sm mt-3 leading-relaxed max-w-lg">
                Horarios y lugares de esta semana, actualizados por los delegados del club.
                Los partidos del fin de semana también se muestran acá.
              </p>

              {/* Leyenda de lugares */}
              <div className="mt-8 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 text-green-300 px-3 py-1">
                  <span className="w-2 h-2 rounded-full bg-primary" /> Polideportivo
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 text-sky-300 px-3 py-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400" /> La Toma
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 px-3 py-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Palermo
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-300 px-3 py-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400" /> Borja
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-300 px-3 py-1">
                  <span className="w-2 h-2 rounded-full bg-orange-400" /> Gimnasio
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-200 px-3 py-1">
                  ⚽ Partido
                </span>
              </div>
            </div>
          </div>

          {/* ======== Grilla de la semana ======== */}
          <div className="p-8 md:p-10">
            {loading && <p className="text-white/60">Cargando cronograma...</p>}
            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                No se pudo cargar el cronograma: {error}
              </p>
            )}

            {!loading && !error && schedule && schedule.semana.length > 0 && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <h3 className="font-display font-bold text-lg">Esta semana</h3>
                  <p className="text-xs font-mono text-white/40">
                    {schedule.from.split("-").join("/")} → {schedule.to.split("-").join("/")}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {schedule.semana.map((d) => (
                    <div key={d.fecha} className="rounded-lg border border-outline bg-surface overflow-hidden">
                      <div className="px-3 py-2 border-b border-outline bg-surface-1">
                        <p className="font-display font-bold text-sm capitalize">{d.dia}</p>
                        <p className="text-[10px] font-mono text-white/40">
                          {new Date(`${d.fecha}T00:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" })}
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
                        {d.bloques.length === 0 && d.partidos.length === 0 && (
                          <p className="px-2 py-3 text-center text-xs text-white/30">Sin actividad</p>
                        )}
                        {d.bloques.map((b) => (
                          <div key={b.id} className={`rounded-md border px-2.5 py-2 ${schedulePlaceColor(b.place)}`}>
                            <p className="font-mono text-xs font-semibold tabular-nums">
                              {b.startTime}–{b.endTime}
                            </p>
                            <p className="text-sm font-semibold mt-0.5">{b.team?.name ?? "Actividad libre"}</p>
                            <p className="text-[11px] opacity-80">{b.place}</p>
                            {b.note && <p className="text-[10px] italic opacity-70 mt-0.5">{b.note}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-6 text-[11px] text-white/40 text-center">
                  Cronograma cargado por los delegados · Los partidos se sincronizan desde el fixture de la APFS.
                </p>
              </div>
            )}

            {!loading && !error && schedule && schedule.semana.length === 0 && (
              <p className="text-white/50">
                Todavía no se cargó el cronograma de esta semana. Volvé pronto.
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
