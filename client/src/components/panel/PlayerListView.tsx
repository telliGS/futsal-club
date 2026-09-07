import { monthShort, tiposBloqueantes, labelTipo, BadgeFicha, Icon } from "../../lib/panel-helpers";
import { IPlayer } from "../../lib/panel-types";
import { cn } from "../../lib/cn";

interface IPlayerListViewProps {
  jugadoresBusqueda: IPlayer[];
  jugadoresFiltrados: IPlayer[];
  plantel: IPlayer[];
  plantelSinCuota: IPlayer[];
  busqueda: string;
  setBusqueda: (v: string) => void;
  filtroEstado: string;
  setFiltroEstado: (v: string) => void;
  currentMonth: string;
  categoriaActual: string | null;
  abrirPago: (p: IPlayer, month: string) => void;
  abrirPagoGym: (p: IPlayer, month: string) => void;
  abrirInactivo: (p: IPlayer) => void;
  reactivar: (p: IPlayer) => void;
  openDocs: (p: IPlayer) => void;
  openEditar: (p: IPlayer) => void;
  removePlayer: (p: IPlayer) => void;
}

export default function PlayerListView({
  jugadoresBusqueda,
  jugadoresFiltrados,
  plantel,
  plantelSinCuota,
  busqueda,
  setBusqueda,
  filtroEstado,
  setFiltroEstado,
  currentMonth,
  categoriaActual,
  abrirPago,
  abrirPagoGym,
  abrirInactivo,
  reactivar,
  openDocs,
  openEditar,
  removePlayer,
}: IPlayerListViewProps) {
  return (
    <>
      {/* ===== RESUMEN EJECUTIVO ===== */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Jugadores activos */}
        <div className="card p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-lg">⚽</span>
          <div>
            <p className="font-display font-bold text-xl leading-none">
              {jugadoresBusqueda.filter((p) => p.status !== "INACTIVO").length}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">Jugadores activos</p>
          </div>
        </div>

        {/* Con deuda */}
        <div className="card p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center text-lg">🔴</span>
          <div>
            <p className="font-display font-bold text-xl leading-none text-red-400">
              {jugadoresBusqueda.filter((p) => p.estadoCuota?.deudor && p.status !== "INACTIVO").length}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">Con deuda</p>
          </div>
        </div>

        {/* Sin fichas */}
        <div className="card p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-lg">📄</span>
          <div>
            <p className="font-display font-bold text-xl leading-none text-amber-300">
              {jugadoresBusqueda.filter((p) => p.fichas && !p.fichas.aptoFichas && p.status !== "INACTIVO").length}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">Sin fichas</p>
          </div>
        </div>

        {/* Inactivos */}
        <div className="card p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-surface-2 border border-outline flex items-center justify-center text-lg">⏸️</span>
          <div>
            <p className="font-display font-bold text-xl leading-none text-white/60">
              {jugadoresBusqueda.filter((p) => p.status === "INACTIVO").length}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">Inactivos</p>
          </div>
        </div>
      </div>

      {/* ===== BÚSQUEDA Y FILTROS ===== */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar jugador por nombre o DNI..."
          className="px-3 py-1.5 rounded-lg bg-surface-1 border border-outline text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary transition-colors flex-1 min-w-[180px]"
        />
        <label className="text-sm text-white/70">Estado:</label>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-surface-1 border border-outline text-sm focus:outline-none focus:border-primary transition-colors"
        >
          <option value="todos">Todos</option>
          <option value="al_dia">Al día</option>
          <option value="pendiente">Pendiente</option>
          <option value="deudor">Deudor</option>
          <option value="inactivo">Inactivo</option>
        </select>
        {filtroEstado !== "todos" && (
          <button
            onClick={() => setFiltroEstado("todos")}
            className="text-xs text-white/50 hover:text-white underline transition-colors"
          >
            Limpiar filtro
          </button>
        )}
        <span className="text-xs text-white/30 ml-auto">
          {jugadoresBusqueda.length} {jugadoresBusqueda.length === 1 ? "jugador" : "jugadores"}
        </span>
      </div>

      {/*
        ===== PLANTEL: UNA SOLA TABLA (árbol único) =====
        En móvil (< md) cada fila se apila como tarjeta con sus etiquetas
        (clases drow/dcell/dlabel + media query en index.css). En md+ es
        una tabla normal. No hay cards duplicadas: una sola iteración y
        una sola fuente de estado.
      */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-outline">
        <table className="w-full text-sm">
          <thead className="hidden md:table-header-group">
            <tr>
              <th className="panel-th">Jugador</th>
              <th className="panel-th">Estado de cuota</th>
              <th className="panel-th">Pago {monthShort(currentMonth)}</th>
              <th className="panel-th">Gym {monthShort(currentMonth)}</th>
              <th className="panel-th">Fichas</th>
              <th className="panel-th">Deuda</th>
              <th className="panel-th text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {[
              ...jugadoresFiltrados.filter((x) => x.status !== "INACTIVO"),
              ...jugadoresFiltrados.filter((x) => x.status === "INACTIVO"),
            ].map((p) => {
              const thisMonth = p.payments.find((x) => x.month === currentMonth);
              const ec = p.estadoCuota;
              return (
                <tr key={p.id} className={cn("panel-tr drow block md:table-row", p.status === "INACTIVO" ? "opacity-60" : ec.deudor ? "bg-red-500/[0.04]" : "")}>
                  {/* Jugador */}
                  <td data-label="Jugador" className="dlabel dcell block md:table-cell px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="avatar">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {p.firstName} {p.lastName}
                        </p>
                        <p className="text-[11px] text-white/40 truncate">
                          {p.role === "JUGADOR" ? "Jugador" : p.role}
                          {p.position && ` · ${p.position}`}
                          {p.jersey != null && <span className="font-mono"> · #{p.jersey}</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  {/* Estado */}
                  <td data-label="Estado" className="dlabel dcell block md:table-cell px-3 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {p.status === "INACTIVO" ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-surface-2 text-white/50 font-semibold">
                          Inactivo{p.inactiveSince ? ` · ${monthShort(p.inactiveSince.slice(0, 7))} ${p.inactiveSince.slice(0, 4)}` : ""}
                        </span>
                      ) : ec.deudor ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-red-500/20 text-red-400 font-semibold">
                          Deudor
                        </span>
                      ) : (
                        <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold", ec.pendiente ? "bg-amber-500/20 text-amber-300" : "bg-primary/20 text-primary-light")}>
                          {ec.pendiente ? "Pendiente" : "Al día"}
                        </span>
                      )}
                      {p.fichas && !p.fichas.aptoFichas && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-orange-500/20 text-orange-300 font-semibold">
                          Sin fichas
                        </span>
                      )}
                    </div>
                  </td>
                  {/* Pago mes */}
                  <td data-label={`Pago ${monthShort(currentMonth)}`} className="dlabel dcell block md:table-cell px-3 py-2.5">
                    {p.status === "INACTIVO" ? (
                      <span className="text-[11px] text-white/30">sin cuota</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => abrirPago(p, currentMonth)}
                          className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95",
                            thisMonth?.paid
                              ? "bg-primary/25 text-primary-light hover:bg-primary/35"
                              : "bg-surface-2 text-white/70 hover:bg-primary/25 hover:text-primary-light"
                          )}
                        >
                          <Icon name="check" className="w-3.5 h-3.5" />
                          {thisMonth?.paid ? "Pagado" : "Pagar"}
                        </button>
                        {thisMonth && (
                          <button
                            onClick={() => abrirPago(p, currentMonth)}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-surface-2 transition-colors"
                            title="Ver / cambiar el pago del mes"
                          >
                            <Icon name="nulo" className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  {/* Gym */}
                  <td data-label={`Gym ${monthShort(currentMonth)}`} className="dlabel dcell block md:table-cell px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {p.vaAlGym ? (
                        <button
                          onClick={() => abrirPagoGym(p, currentMonth)}
                          className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95",
                            p.estadoGym === "PAGO"
                              ? "bg-primary/25 text-primary-light hover:bg-primary/35"
                              : p.estadoGym === "DEBE"
                                ? "bg-red-500/15 text-red-300 hover:bg-red-500/25"
                                : "bg-surface-2 text-white/70 hover:bg-primary/25 hover:text-primary-light"
                          )}
                          title="Pago del gimnasio del mes"
                        >
                          <Icon name="gym" className="w-3.5 h-3.5" />
                          {p.estadoGym === "PAGO" ? "Gym pago" : p.estadoGym === "DEBE" ? "Gym debe" : "Gym"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-white/25">—</span>
                      )}
                    </div>
                  </td>
                  {/* Fichas */}
                  <td data-label="Fichas" className="dlabel dcell block md:table-cell px-3 py-2.5">
                    <span className="flex flex-col gap-0.5" title={p.fichas?.resumen ?? "Sin datos de fichas"}>
                      <span className="flex items-center gap-1.5 flex-wrap">
                        {(p.fichas?.bloqueantes ?? tiposBloqueantes(categoriaActual)).map((t) => (
                          <span key={t} className="flex items-center gap-1">
                            <span className="text-[10px] text-white/40">{labelTipo(t)}</span>
                            <BadgeFicha st={p.fichas?.porTipo[t]} />
                          </span>
                        ))}
                      </span>
                    </span>
                  </td>
                  {/* Deuda */}
                  <td data-label="Deuda" className="dlabel dcell block md:table-cell px-3 py-2.5 text-xs tabular-nums">
                    {ec.mesesDebe > 0 ? (
                      <span className="inline-flex items-center gap-1 text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/30">
                        🔴 {ec.mesesDebe} {ec.mesesDebe === 1 ? "mes" : "meses"}
                      </span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  {/* Acciones */}
                  <td data-label="Acciones" className="dlabel dcell block md:table-cell px-3 py-2.5">
                    <div className="row-actions">
                      <button
                        onClick={() => abrirInactivo(p)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 transition-colors active:scale-90 group relative"
                        title={p.status === "INACTIVO" ? "Ajustar mes de corte" : "Pasar a inactivo"}
                      >
                        <Icon name="pause" className="w-4 h-4" />
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-2 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {p.status === "INACTIVO" ? "Ajustar inactivo" : "Inactivar"}
                        </span>
                      </button>
                      {p.status === "INACTIVO" && (
                        <button
                          onClick={() => reactivar(p)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 transition-colors active:scale-90 group relative"
                          title="Reactivar jugador"
                        >
                          <Icon name="play" className="w-4 h-4" />
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-2 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Reactivar
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => openDocs(p)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 transition-colors active:scale-90 group relative"
                        title="Fichas y estudios"
                      >
                        <Icon name="doc" className="w-4 h-4" />
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-2 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          Fichas
                        </span>
                      </button>
                      <button
                        onClick={() => openEditar(p)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 transition-colors active:scale-90 group relative"
                        title="Editar jugador"
                      >
                        <Icon name="edit" className="w-4 h-4" />
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-2 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          Editar
                        </span>
                      </button>
                      <button
                        onClick={() => removePlayer(p)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors active:scale-90 group relative"
                        title="Quitar del equipo"
                      >
                        <Icon name="trash" className="w-4 h-4" />
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-2 text-red-400 text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          Eliminar
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {plantel.length === 0 && (
              <tr>
                <td colSpan={7} className="block md:table-cell p-8 text-center text-white/40">
                  Sin jugadores en este equipo. Usá "+ Agregar" o importá desde Excel.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ====== JUGADORES DE FORMATIVA (pagan en su categoría, sin cuota acá) ====== */}
      {plantelSinCuota.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-white/80 mb-2 flex items-center gap-2">
            <span className="inline-block w-1.5 h-5 bg-amber-500/80 rounded" />
            Pagan en su categoría formativa
            <span className="text-xs font-mono text-white/40">({plantelSinCuota.length})</span>
          </h2>
          <p className="text-xs text-white/50 mb-3">
            Aparecen en este plantel pero la cuota la pagan en su categoría: no cuentan para el presupuesto ni registran pagos acá.
          </p>
          <div className="overflow-x-auto rounded-lg border border-outline">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="panel-th">Jugador</th>
                  <th className="panel-th">Paga en</th>
                  <th className="panel-th">Fichas</th>
                  <th className="panel-th text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plantelSinCuota.map((p) => (
                  <tr key={p.id} className="panel-tr">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="avatar">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</span>
                        <div className="min-w-0">
                          <p className="font-semibold truncate flex items-center gap-2">
                            {p.firstName} {p.lastName}
                            <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] bg-amber-500/15 text-amber-300 font-mono uppercase tracking-wide">
                              formativa
                            </span>
                          </p>
                          <p className="text-[11px] text-white/40 truncate">{p.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-md text-xs bg-primary/15 text-primary-light font-mono">
                        {p.categoriaPago?.length ? p.categoriaPago.join(" · ") : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex flex-col gap-0.5" title={p.fichas?.resumen ?? "Sin datos de fichas"}>
                        <span className="flex items-center gap-1.5 flex-wrap">
                          {(p.fichas?.bloqueantes ?? tiposBloqueantes(categoriaActual)).map((t) => (
                            <span key={t} className="flex items-center gap-1.5">
                              <span className="text-[10px] text-white/40">{labelTipo(t)}</span>
                              <BadgeFicha st={p.fichas?.porTipo[t]} />
                            </span>
                          ))}
                        </span>
                        <span className="text-[10px] text-white/40">
                          {p.fichas?.aptoFichas ? "Fichas al día" : "Bloquea jugar ✕"}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="row-actions">
                        <button
                          onClick={() => openDocs(p)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 transition-colors active:scale-90"
                          title="Fichas y estudios del jugador"
                        >
                          <Icon name="doc" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditar(p)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 transition-colors active:scale-90"
                          title="Editar"
                        >
                          <Icon name="edit" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removePlayer(p)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors active:scale-90"
                          title="Quitar del equipo"
                        >
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}