import { memo } from "react";
import { cn } from "../../lib/cn";
import { IMatch, estadoPartido, formatDia, formatFechaLegible, formatHora } from "../../lib/home-helpers";
import { BadgeEnCurso } from "./BadgeEnCurso";

interface IProximosProps {
  loading: boolean;
  error: string;
  matches: IMatch[];
  restoPorDia: Map<string, IMatch[]>;
}

export default memo(function SeccionProximos({ loading, error, matches, restoPorDia }: IProximosProps) {
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
});