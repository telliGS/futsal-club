import { memo } from "react";
import { cn } from "../../lib/cn";
import { IEquipoPublico, colorEquipo } from "../../lib/home-helpers";

interface ICategoriasProps {
  loading: boolean;
  teams: IEquipoPublico[];
  ordenEquipos: IEquipoPublico[];
  openTeam: (t: IEquipoPublico) => void;
}

export default memo(function SeccionCategorias({ loading, teams, ordenEquipos, openTeam }: ICategoriasProps) {
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
});