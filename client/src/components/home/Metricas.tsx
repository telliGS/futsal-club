import { IStats } from "../../lib/home-helpers";

interface IMetricasProps {
  loading: boolean;
  stats: IStats | null;
}

export default function Metricas({ loading, stats }: IMetricasProps) {
  return (
    // Métricas sutiles — stats solo, destacado va como emergente flotante
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
  );
}