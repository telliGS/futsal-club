import { monthShort } from "../../lib/panel-helpers";
import { PresupuestoData, TotalPresupuesto } from "../../lib/panel-types";
import { cn } from "../../lib/cn";

interface PresupuestoViewProps {
  presup: PresupuestoData | null;
  presupMes: string;
  setPresupMes: (m: string) => void;
  mesActual: () => string;
  presupLoading: boolean;
  presupError: string;
  verTotal: boolean;
  setVerTotal: (v: boolean) => void;
  formatPesos: (n: number | null | undefined) => string;
  setQuotaInput: (v: string) => void;
  setShowQuotaModal: (v: boolean) => void;
  openGastoModal: (tipo: "fijo" | "extra") => void;
  borrarGasto: (tipo: "fijo" | "extra", id: string) => void;
  totalData: TotalPresupuesto | null;
  totalLoading: boolean;
  totalError: string;
}

export default function PresupuestoView({
  presup,
  presupMes,
  setPresupMes,
  mesActual,
  presupLoading,
  presupError,
  verTotal,
  setVerTotal,
  formatPesos,
  setQuotaInput,
  setShowQuotaModal,
  openGastoModal,
  borrarGasto,
  totalData,
  totalLoading,
  totalError,
}: PresupuestoViewProps) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Presupuesto de {presup?.categoria ?? "la categoría"}</h2>
          <p className="text-xs text-white/50 mt-1">
            Balance del mes con lo que entra por cuotas y lo que sale en gastos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-white/50">Mes:</label>
          <input
            type="month"
            value={presupMes}
            onChange={(e) => setPresupMes(e.target.value || mesActual())}
            className="px-2.5 py-1.5 rounded-lg bg-surface-1 border border-outline text-sm [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={() => setVerTotal(!verTotal)}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95',
              verTotal ? 'bg-primary text-white' : 'bg-surface-1 text-white/60 hover:text-white hover:bg-surface-2'
            )}
          >
            {verTotal ? "Ocultar total" : "Total del club"}
          </button>
        </div>
      </div>

      {presupError && <p className="mt-3 text-red-400 text-sm">{presupError}</p>}

      {presupLoading && <p className="mt-4 text-white/50">Cargando presupuesto...</p>}

      {!presupLoading && presup && (
        <>
          {/* Tarjetas de números */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">Ingreso · estimado</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-green-400 tabular-nums">{formatPesos(presup.resultado.ingreso)}</p>
              <p className="mt-1 text-xs text-white/60 leading-relaxed">
                {presup.jugadores} jugadores{presup.cuota != null ? ` × ${formatPesos(presup.cuota)}` : " (sin cuota cargada)"}
                {presup.jugadoresExcluidos > 0 && ` · ${presup.jugadoresExcluidos} excluido${presup.jugadoresExcluidos === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">Ingreso · real cobrado</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-green-400 tabular-nums">{formatPesos(presup.recaudado)}</p>
              <p className="mt-1 text-xs text-white/60 leading-relaxed">
                {presup.recaudado == null
                  ? "el server aún no devuelve el ingreso real"
                  : (presup.faltaCobrar ?? 0) > 0
                    ? `falta cobrar ${formatPesos(presup.faltaCobrar)}`
                    : "todo el mes cobrado"}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">Gastos del mes</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-red-400 tabular-nums">{formatPesos(presup.resultado.gastos)}</p>
              <p className="mt-1 text-xs text-white/60 leading-relaxed">
                {formatPesos(presup.gastosFijos.reduce((a, g) => a + g.monto, 0))} fijos +{" "}
                {formatPesos(presup.gastosExtra.reduce((a, g) => a + g.monto, 0))} extras
              </p>
            </div>
            <div className={cn('card p-4', presup.resultado.balance >= 0 ? 'border-green-500/30 bg-green-500/[0.04]' : 'border-red-500/30 bg-red-500/[0.04]')}>
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">Balance</p>
              <p className={cn('mt-1.5 font-display text-2xl font-bold tabular-nums', presup.resultado.balance >= 0 ? 'text-green-400' : 'text-red-400')}>
                {formatPesos(presup.resultado.balance)}
              </p>
              <p className="mt-1 text-xs">
                <span className={presup.resultado.balance >= 0 ? "text-green-400/80" : "text-red-400/80"}>
                  {presup.resultado.balance >= 0 ? "▲ superávit" : "▼ déficit"}
                </span>
                <span className="text-white/60"> del mes</span>
              </p>
            </div>
            <div className="card p-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">Balance real</p>
              {presup.recaudado != null ? (
                <>
                  <p className={cn('mt-1.5 font-display text-2xl font-bold tabular-nums', presup.recaudado - presup.resultado.gastos >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {formatPesos(presup.recaudado - presup.resultado.gastos)}
                  </p>
                  <p className="mt-1 text-xs text-white/60">con lo que realmente entró</p>
                </>
              ) : (
                <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-white/30">—</p>
              )}
            </div>
            <div className="card p-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">Cuota recomendada</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-primary-light tabular-nums">
                {presup.resultado.recomendacionSana ? formatPesos(presup.resultado.cuotaRecomendada) : "—"}
              </p>
              <p className="mt-1 text-xs text-white/60 leading-relaxed">
                {presup.resultado.recomendacionSana
                  ? `mínima ${formatPesos(presup.resultado.cuotaMinima)} + 10% margen`
                  : "cargá gastos y jugadores para calcularla"}
              </p>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => { setQuotaInput(presup.cuota != null ? String(presup.cuota) : ""); setShowQuotaModal(true); }}
              className="btn bg-primary text-white hover:bg-primary-light active:scale-95"
            >
              {presup.cuota != null ? `Cambiar cuota · ${formatPesos(presup.cuota)}` : "Cargar cuota"}
            </button>
            <button
              onClick={() => openGastoModal("fijo")}
              className="btn bg-surface-1 text-white/80 border border-outline hover:bg-surface-2 active:scale-95"
            >
              + Gasto fijo
            </button>
            <button
              onClick={() => openGastoModal("extra")}
              className="btn bg-surface-1 text-white/80 border border-outline hover:bg-surface-2 active:scale-95"
            >
              + Gasto extra
            </button>
          </div>

          {/* Listas de gastos */}
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-outline overflow-hidden">
              <div className="px-4 py-3 border-b border-outline bg-surface-1 flex items-center justify-between">
                <h3 className="font-display font-bold text-sm flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-primary" />
                  Gastos fijos
                </h3>
                <span className="text-xs font-mono text-white/50 bg-surface-2 px-2 py-0.5 rounded-full">
                  {presup.gastosFijos.length} · {formatPesos(presup.gastosFijos.reduce((a, g) => a + g.monto, 0))}
                </span>
              </div>
              <ul className="divide-y divide-outline/60">
                {presup.gastosFijos.length === 0 && (
                  <li className="px-4 py-6 text-sm text-white/40 text-center">
                    Sin gastos fijos cargados. Se repiten todos los meses (cancha, árbitros...).
                  </li>
                )}
                {presup.gastosFijos.map((g) => (
                  <li key={g.id} className="px-4 py-2.5 flex items-center justify-between gap-2 group hover:bg-surface-2/50 transition-colors">
                    <span className="text-sm">{g.nombre}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-sm text-white/70 tabular-nums font-mono">{formatPesos(g.monto)}</span>
                      <button
                        onClick={() => borrarGasto("fijo", g.id)}
                        className="text-xs text-red-400/50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar gasto"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-outline overflow-hidden">
              <div className="px-4 py-3 border-b border-outline bg-surface-1 flex items-center justify-between">
                <h3 className="font-display font-bold text-sm flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-amber-300/60" />
                  Extras de {monthShort(presupMes)}
                </h3>
                <span className="text-xs font-mono text-white/50 bg-surface-2 px-2 py-0.5 rounded-full">
                  {presup.gastosExtra.length} · {formatPesos(presup.gastosExtra.reduce((a, g) => a + g.monto, 0))}
                </span>
              </div>
              <ul className="divide-y divide-outline/60">
                {presup.gastosExtra.length === 0 && (
                  <li className="px-4 py-6 text-sm text-white/40 text-center">
                    Sin gastos puntuales en este mes (cancha por lluvia, etc.).
                  </li>
                )}
                {presup.gastosExtra.map((g) => (
                  <li key={g.id} className="px-4 py-2.5 flex items-center justify-between gap-2 group hover:bg-surface-2/50 transition-colors">
                    <span className="text-sm">{g.nombre}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-sm text-white/70 tabular-nums font-mono">{formatPesos(g.monto)}</span>
                      <button
                        onClick={() => borrarGasto("extra", g.id)}
                        className="text-xs text-red-400/50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar gasto"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ===== TOTAL DEL CLUB (ADMIN) ===== */}
          {verTotal && (
            <div className="mt-8">
              {totalError && <p className="text-red-400 text-sm">{totalError}</p>}
              {totalLoading && <p className="text-white/50">Cargando total del club...</p>}
              {!totalLoading && totalData && (
                <>
                  {/* Tarjetas de totales (siempre disponibles) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="card p-4">
                      <p className="text-xs text-white/50">Jugadores que pagan</p>
                      <p className="mt-1 text-2xl font-bold">{totalData.totales.jugadores}</p>
                    </div>
                    <div className="card p-4">
                      <p className="text-xs text-white/50">Ingreso total (estimado)</p>
                      <p className="mt-1 text-2xl font-bold text-green-400">{formatPesos(totalData.totales.ingreso)}</p>
                    </div>
                    <div className="card p-4">
                      <p className="text-xs text-white/50">Gastos totales</p>
                      <p className="mt-1 text-2xl font-bold text-red-400">{formatPesos(totalData.totales.gastos)}</p>
                    </div>
                    <div className="card p-4">
                      <p className="text-xs text-white/50">Deuda total</p>
                      <p className="mt-1 text-2xl font-bold text-amber-300">{formatPesos(totalData.totales.deuda)}</p>
                    </div>
                  </div>

                  {/* Solo si el server ya devuelve el ingreso real (desplegado) */}
                  {totalData.totales.recaudado != null && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="card p-4">
                        <p className="text-xs text-white/50">Ingreso real cobrado</p>
                        <p className="mt-1 text-2xl font-bold text-green-400">{formatPesos(totalData.totales.recaudado)}</p>
                        <p className="mt-1 text-[11px] text-white/50">
                          {totalData.totales.faltaCobrar != null && totalData.totales.faltaCobrar > 0
                            ? `falta cobrar ${formatPesos(totalData.totales.faltaCobrar)}`
                            : "todo el mes cobrado"}
                        </p>
                      </div>
                      <div className="card p-4">
                        <p className="text-xs text-white/50">Balance estimado</p>
                        <p className={cn('mt-1 text-2xl font-bold', totalData.totales.balance >= 0 ? 'text-green-400' : 'text-red-400')}>
                          {formatPesos(totalData.totales.balance)}
                        </p>
                      </div>
                      <div className="card p-4">
                        <p className="text-xs text-white/50">Balance real</p>
                        <p className={cn('mt-1 text-2xl font-bold', totalData.totales.recaudado - totalData.totales.gastos >= 0 ? 'text-green-400' : 'text-red-400')}>
                          {formatPesos(totalData.totales.recaudado - totalData.totales.gastos)}
                        </p>
                        <p className="mt-1 text-[11px] text-white/50">con lo que realmente entró</p>
                      </div>
                      <div className="card p-4">
                        <p className="text-xs text-white/50">Cobrado del mes</p>
                        <p className="mt-1 text-2xl font-bold text-primary-light">
                          {totalData.totales.ingreso > 0
                            ? Math.round((totalData.totales.recaudado / totalData.totales.ingreso) * 100) + "%"
                            : "—"}
                        </p>
                        <p className="mt-1 text-[11px] text-white/50">de lo estimado</p>
                      </div>
                    </div>
                  )}

                  <div className={cn('mt-3 card p-4', totalData.totales.balance >= 0 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5')}>
                    <p className="text-xs text-white/50">Balance total del club</p>
                    <p className={cn('mt-1 text-2xl font-bold', totalData.totales.balance >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {formatPesos(totalData.totales.balance)}
                    </p>
                    <p className="mt-1 text-xs text-white/60">
                      {totalData.totales.balance >= 0 ? "superávit" : "déficit"} de {monthShort(totalData.mes)} — el ingreso real es mayor: sumá la deuda ({formatPesos(totalData.totales.deuda)}) a cobrar
                    </p>
                  </div>

                  {/* Gimnasio: gasto variable por jugador que va + lo recaudado */}
                  {totalData.gym && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="card p-4">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">Gym · jugadores</p>
                        <p className="mt-1.5 text-2xl font-bold tabular-nums">{totalData.gym.jugadores}</p>
                        <p className="mt-1 text-xs text-white/60">van al gym {formatPesos(totalData.gym.precio)} c/u (global)</p>
                      </div>
                      <div className="card p-4">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">Gym · gasto (variable)</p>
                        <p className="mt-1.5 text-2xl font-bold text-red-400 tabular-nums">{formatPesos(totalData.gym.gasto)}</p>
                        <p className="mt-1 text-xs text-white/60">lo que cuesta el gym por los que van</p>
                      </div>
                      <div className="card p-4">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">Gym · recaudado</p>
                        <p className="mt-1.5 text-2xl font-bold text-green-400 tabular-nums">{formatPesos(totalData.gym.recaudado)}</p>
                        <p className="mt-1 text-xs text-white/60">lo que pagaron los que van</p>
                      </div>
                      <div className={cn('card p-4', totalData.gym.faltaCobrar > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-green-500/30 bg-green-500/5')}>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">Gym · falta cobrar</p>
                        <p className={cn('mt-1.5 text-2xl font-bold tabular-nums', totalData.gym.faltaCobrar > 0 ? 'text-amber-300' : 'text-green-400')}>
                          {formatPesos(totalData.gym.faltaCobrar)}
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          {totalData.gym.faltaCobrar > 0 ? "quedan cuotas de gym por cobrar" : "todo el gym cobrado"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tabla por equipo, ordenada por pérdida */}
                  <div className="mt-4 overflow-x-auto rounded-lg border border-outline">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-1/60 text-left text-white/60">
                        <tr>
                          <th className="p-3">Equipo</th>
                          <th className="p-3">Jugadores</th>
                          <th className="p-3">Cuota</th>
                          <th className="p-3">Estimado</th>
                          <th className="p-3">Real</th>
                          <th className="p-3">Gastos</th>
                          <th className="p-3">Balance</th>
                          <th className="p-3">Deuda</th>
                          <th className="p-3">Recomendada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {totalData.porEquipo.map((e) => {
                          const recomendada = e.jugadores > 0
                            ? Math.ceil((e.gastos / e.jugadores) * 1.1 / 500) * 500
                            : 0;
                          return (
                            <tr key={e.teamId} className={cn('border-t border-outline/60', e.balance < 0 ? 'bg-red-500/5' : '')}>
                              <td className="p-3 font-semibold">
                                {e.categoria}
                                <span className={cn('ml-2 px-1.5 py-0.5 rounded text-[10px]', e.tipo === "FORMATIVA" ? 'bg-primary/20 text-primary-light' : 'bg-surface-2 text-white/60')}>
                                  {e.tipo === "FORMATIVA" ? "formativa" : "primera"}
                                </span>
                              </td>
                              <td className="p-3 text-white/70">{e.jugadores}</td>
                              <td className="p-3 text-white/70">{e.cuota ? formatPesos(e.cuota) : "—"}</td>
                              <td className="p-3 text-white/70">{formatPesos(e.ingreso)}</td>
                              <td className="p-3 text-white/70">
                                {formatPesos(e.recaudado)}
                                {(e.faltaCobrar ?? 0) > 0 && (
                                  <span className="block text-[10px] text-amber-300/80">falta {formatPesos(e.faltaCobrar)}</span>
                                )}
                              </td>
                              <td className="p-3 text-white/70">{formatPesos(e.gastos)}</td>
                              <td className={cn('p-3 font-semibold', e.balance >= 0 ? 'text-green-400' : 'text-red-400')}>
                                {formatPesos(e.balance)}
                              </td>
                              <td className={cn('p-3', e.deuda > 0 ? 'text-amber-300' : 'text-white/40')}>{formatPesos(e.deuda)}</td>
                              <td className="p-3 text-white/60">{recomendada > 0 ? formatPesos(recomendada) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-white/40">
                    Orden alfabético por categoría. "Estimado" = jugadores × cuota; "Real" = lo que realmente pagaron.
                    La cuota recomendada por equipo = gastos ÷ jugadores + 10% margen, redondeada a $500.
                  </p>

                  {/* Serie por mes del año: estimado vs real (acumulado) */}
                  {totalData.porMes && totalData.porMes.length > 0 && (
                    <div className="mt-4 overflow-x-auto rounded-lg border border-outline">
                      <table className="w-full text-sm">
                        <thead className="bg-surface-1/60 text-left text-white/60">
                          <tr>
                            <th className="p-3">Mes</th>
                            <th className="p-3">Estimado</th>
                            <th className="p-3">Real cobrado</th>
                            <th className="p-3">% cobrado</th>
                            <th className="p-3">Acumulado real del año</th>
                          </tr>
                        </thead>
                        <tbody>
                          {totalData.porMes.map((m) => {
                            const pct = m.estimado > 0 ? Math.round((m.recaudado / m.estimado) * 100) : 0;
                            return (
                              <tr key={m.mes} className="border-t border-outline/60">
                                <td className="p-3 font-semibold">{monthShort(m.mes)} {m.mes.slice(0, 4)}</td>
                                <td className="p-3 text-white/70">{formatPesos(m.estimado)}</td>
                                <td className="p-3 text-green-400">{formatPesos(m.recaudado)}</td>
                                <td className="p-3 text-white/70">{m.estimado > 0 ? pct + "%" : "—"}</td>
                                <td className={cn('p-3 font-semibold', m.acumulado > 0 ? 'text-green-400' : 'text-white/40')}>
                                  {formatPesos(m.acumulado)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}