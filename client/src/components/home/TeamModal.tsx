import { memo } from "react";
import { cn } from "../../lib/cn";
import { IMatch, IEquipoPublico, formatFechaLegible, formatHora } from "../../lib/home-helpers";

interface ITeamModalProps {
  selTeam: IEquipoPublico | null;
  teamLoading: boolean;
  teamError: string;
  teamMatches: IMatch[] | null;
  porDia: Map<string, IMatch[]>;
  onClose: () => void;
}

export default memo(function TeamModal({ selTeam, teamLoading, teamError, teamMatches, porDia, onClose }: ITeamModalProps) {
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
                      const yaJugado = new Date(m.dateTime!) < new Date();
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
});