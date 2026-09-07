import { IPoliBloque, IPoliDia, IPoliSlot } from "../../lib/panel-types";
import { cn } from "../../lib/cn";

interface IPoliViewProps {
  poliMsg: string;
  poliError: string;
  poliLoading: boolean;
  poliSemana: IPoliDia[];
  poliHoy?: string;
  poliSlots: IPoliSlot[];
  poliSemanaOffset: number;
  openNuevoPoliSlot: () => void;
  moverSemana: (delta: number) => void;
  abrirExcepcion: (fecha: string, bloque?: IPoliBloque) => void;
  placeColor: (place: string) => string;
  puedeOperarPoli: (teamIdSlot: string | null | undefined) => boolean;
  togglePoliSlot: (s: IPoliSlot) => void;
  startEditPoliSlot: (s: IPoliSlot) => void;
  borrarPoliSlot: (s: IPoliSlot) => void;
}

export default function PoliView({
  poliMsg,
  poliError,
  poliLoading,
  poliSemana,
  poliHoy,
  poliSlots,
  poliSemanaOffset,
  openNuevoPoliSlot,
  moverSemana,
  abrirExcepcion,
  placeColor,
  puedeOperarPoli,
  togglePoliSlot,
  startEditPoliSlot,
  borrarPoliSlot,
}: IPoliViewProps) {
  return (
    <div className="mt-8 rounded-lg border border-outline bg-surface-1 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Cronograma de entrenamiento</h2>
          <p className="text-sm text-white/60 mt-1">
            Horarios y lugares donde entrena cada categoría. La plantilla se repite todas las semanas; podés cambiar un día puntual con "Cambiar este día".
          </p>
        </div>
        <button
          onClick={openNuevoPoliSlot}
          className="btn bg-primary text-white hover:bg-primary-light active:scale-95"
        >
          + Nuevo bloque
        </button>
      </div>

      {poliMsg && (
        <p className="mt-4 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-sm text-primary-light">
          {poliMsg}
        </p>
      )}
      {poliError && <p className="mt-4 text-sm text-red-400">{poliError}</p>}

      {/* Navegación de semana */}
      <div className="mt-5 flex items-center justify-between gap-2">
        <button
          onClick={() => moverSemana(-1)}
          className="px-3 py-1.5 rounded-lg text-sm bg-surface-2 border border-outline hover:bg-surface-1 text-white/80 transition-colors"
        >
          ← Semana anterior
        </button>
        <p className="text-sm text-white/60 font-mono">
          {poliSemanaOffset === 0 ? "Esta semana" : poliSemanaOffset > 0 ? `En ${poliSemanaOffset} semana${poliSemanaOffset === 1 ? "" : "s"}` : `Hace ${-poliSemanaOffset} semana${-poliSemanaOffset === 1 ? "" : "s"}`}
        </p>
        <button
          onClick={() => moverSemana(1)}
          disabled={poliSemanaOffset >= 3}
          className="px-3 py-1.5 rounded-lg text-sm bg-surface-2 border border-outline hover:bg-surface-1 text-white/80 transition-colors disabled:opacity-40"
        >
          Semana siguiente →
        </button>
      </div>

      {poliLoading ? (
        <p className="mt-6 text-white/60">Cargando cronograma...</p>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {poliSemana.length === 0 && (
            <p className="text-sm text-white/40 md:col-span-2 xl:col-span-4">
              No se pudo cargar la semana.
            </p>
          )}
          {poliSemana.map((d) => {
            const hoy = poliHoy === d.fecha;
            return (
              <div
                key={d.fecha}
                className={cn('rounded-lg border overflow-hidden', hoy ? 'border-primary/60 bg-primary/[0.03]' : 'border-outline bg-surface')}
              >
                <div className="px-3 py-2 border-b border-outline bg-surface-1 flex items-center justify-between">
                  <p className="font-display font-bold text-sm capitalize">
                    {d.dia}
                    {hoy && (
                      <span className="ml-1.5 text-[9px] uppercase tracking-wider font-mono text-primary-light align-middle">
                        · hoy
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] font-mono text-white/40">{d.fecha.slice(8, 10)}/{d.fecha.slice(5, 7)}</p>
                </div>
                <div className="p-2 space-y-1.5">
                  {/* Partidos del club ese día */}
                  {d.partidos.length > 0 && (
                    <div className="px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[11px]">
                      {d.partidos.map((p) => (
                        <p key={p.id} className="text-amber-200/90">
                          ⚽ {p.time} · {p.team.name} vs {p.rival} {p.isHome ? "(local)" : ""}
                        </p>
                      ))}
                    </div>
                  )}
                  {d.bloques.length === 0 && (
                    <div className="py-2 text-center">
                      <p className="text-xs text-white/30">Sin actividad</p>
                      <button
                        onClick={() => abrirExcepcion(d.fecha)}
                        className="mt-1.5 text-[11px] px-2 py-0.5 rounded bg-white/5 hover:bg-primary/15 hover:text-primary-light border border-outline hover:border-primary/40 transition-colors"
                        title="Agregar un entrenamiento puntual este día"
                      >
                        + Agregar entrenamiento
                      </button>
                    </div>
                  )}
                  {d.bloques.map((b) => (
                    <div
                      key={b.id}
                      className={cn('rounded-md border px-2.5 py-2', placeColor(b.place))}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-mono text-xs font-semibold tabular-nums">
                          {b.startTime}–{b.endTime}
                        </p>
                        <span className="text-[9px] uppercase tracking-wider opacity-70 font-mono">
                          {b.tipo === "EXTRA" ? "Puntual" : b.excepcion ? "Modificado" : "Fijo"}
                        </span>
                      </div>
                      <p className="text-sm font-semibold mt-0.5">{b.team?.name ?? "Actividad libre"}</p>
                      <p className="text-[11px] opacity-80">{b.place}</p>
                      {b.responsable && <p className="text-[11px] opacity-70">👤 {b.responsable}</p>}
                      {b.note && <p className="text-[10px] italic opacity-70 mt-0.5">{b.note}</p>}
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <button
                          onClick={() => abrirExcepcion(d.fecha, b)}
                          disabled={!puedeOperarPoli(b.team?.id)}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          title={puedeOperarPoli(b.team?.id) ? "Cambiar lugar/hora o cancelar para este día puntual" : "Solo el admin o el encargado de este equipo"}
                        >
                          Cambiar este día
                        </button>
                        <button
                          onClick={() => abrirExcepcion(d.fecha)}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
                          title="Agregar un entrenamiento puntual extra este día"
                        >
                          + Extra
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plantilla semanal (lista de bloques fijos) */}
      <div className="mt-8">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-primary" />
          Plantilla semanal (se repite todas las semanas)
        </h3>
        <p className="text-xs text-white/50 mt-1">
          Acá se definen los bloques fijos. Usá "Cambiar este día" en la grilla para una excepción puntual.
        </p>
        {poliSlots.length === 0 ? (
          <p className="mt-3 text-sm text-white/40">
            Todavía no hay bloques cargados. Tocá "+ Nuevo bloque" para crear el primero (ej: lunes 21:00 JH NEGRO en Polideportivo).
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/50">
                  <th className="py-2">Día</th>
                  <th className="py-2">Horario</th>
                  <th className="py-2">Lugar</th>
                  <th className="py-2">Equipo</th>
                  <th className="py-2">Responsable</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {poliSlots.map((s) => {
                  const operable = puedeOperarPoli(s.team?.id);
                  return (
                    <tr key={s.id} className={cn('border-t border-outline/60', s.active ? "" : "opacity-50")}>
                      <td className="py-3 capitalize">
                        {["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"][s.dayOfWeek]}
                      </td>
                      <td className="py-3 font-mono tabular-nums">{s.startTime}–{s.endTime}</td>
                      <td className="py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs border', placeColor(s.place))}>
                          {s.place}
                        </span>
                      </td>
                      <td className="py-3">{s.team?.name ?? "Actividad libre"}</td>
                      <td className="py-3 text-white/70">{s.responsable ?? "—"}</td>
                      <td className="py-3">
                        <button
                          onClick={() => togglePoliSlot(s)}
                          disabled={!operable}
                          className={cn('px-2.5 py-0.5 rounded-full text-xs border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                            s.active
                              ? 'bg-primary/10 text-primary-light border-primary/30 hover:bg-primary/20'
                              : 'bg-white/5 text-white/50 border-outline hover:bg-surface-2'
                          )}
                        >
                          {s.active ? "Activo" : "Suspendido"}
                        </button>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEditPoliSlot(s)}
                            disabled={!operable}
                            className="px-2.5 py-1 rounded-lg text-xs bg-surface-2 border border-outline hover:bg-surface-1 text-white/80 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => borrarPoliSlot(s)}
                            disabled={!operable}
                            className="px-2.5 py-1 rounded-lg text-xs bg-transparent text-red-400/40 border border-transparent hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/30 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}