import { IMatch, estadoPartido, formatFechaLegible, formatHora } from "../../lib/home-helpers";
import { BadgeEnCurso } from "./BadgeEnCurso";

interface IEmergenteProps {
  destacado: IMatch;
  restante: { dias: number; horas: number; mins: number } | null;
  visible: boolean;
  onClose: () => void;
}

export default function Emergente({ destacado, restante, visible, onClose }: IEmergenteProps) {
  if (!visible) return null;
  return (
    // Próximo partido emergente — fixed arriba, descartable
    <div className="pointer-events-none fixed inset-x-4 top-20 z-30 md:top-20 md:right-6 md:left-auto md:w-[380px]">
      <article
        aria-labelledby="emergente-heading"
        className="pointer-events-auto card--lead group relative flex flex-col gap-0 overflow-hidden shadow-2xl"
      >
        <button
          onClick={onClose}
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
  );
}