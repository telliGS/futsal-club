import { monthShort, Icon } from "../../lib/panel-helpers";
import { Player } from "../../lib/panel-types";
import { cn } from "../../lib/cn";

interface CalendarioViewProps {
  plantel: Player[];
  months: string[];
  currentMonth: string;
  abrirPago: (p: Player, month: string) => void;
  estadoLocal: (p: Player, now?: Date) => NonNullable<Player["estadoCuota"]>;
}

export default function CalendarioView({ plantel, months, currentMonth, abrirPago, estadoLocal }: CalendarioViewProps) {
  return (
    <div className="mt-6">
      {/* Header + leyenda */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Calendario de cuotas</h2>
          <p className="text-xs text-white/50 mt-1">
            Tocá una celda para marcar o desmarcar el pago. Solo se editan los meses hasta{" "}
            {monthShort(currentMonth)}.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-white/50">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-md bg-green-500/30 border border-green-500/40" /> Pagó
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-md bg-red-500/25 border border-red-500/40" /> Debe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-md bg-surface-2 border border-outline" /> Sin cargar
          </span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-outline">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="panel-th sticky left-0 z-20 min-w-[220px]">Jugador</th>
              {months.map((m) => (
                <th
                  key={m}
                  className={cn('panel-th text-center min-w-[60px]', m === currentMonth ? "text-primary-light" : "")}
                >
                  {m === currentMonth && (
                    <span className="block text-[9px] text-primary-light mb-0.5 tracking-widest">
                      AHORA
                    </span>
                  )}
                  {monthShort(m)}
                  <span className="block text-[9px] opacity-60">{m.slice(2, 4)}</span>
                </th>
              ))}
              <th className="panel-th text-center min-w-[80px]">Debe</th>
            </tr>
          </thead>
          <tbody>
            {[
              ...plantel.filter((x) => x.status !== "INACTIVO"),
              ...plantel.filter((x) => x.status === "INACTIVO"),
            ].map((p) => {
              const ec = p.estadoCuota ?? estadoLocal(p);
              return (
                <tr key={p.id} className={cn('panel-tr', p.status === "INACTIVO" ? "opacity-60" : ec.deudor ? "bg-red-500/[0.04]" : "")}>
                  <td className="px-3 py-2 sticky left-0 z-10 bg-surface-1">
                    <div className="flex items-center gap-2.5">
                      <span className="avatar w-7 h-7 text-xs">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight truncate">
                          {p.firstName} {p.lastName}
                        </p>
                        {p.status === "INACTIVO" ? (
                          <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                            inactivo · hasta {p.inactiveSince ? `${monthShort(p.inactiveSince.slice(0, 7))} ${p.inactiveSince.slice(0, 4)}` : "hoy"}
                          </p>
                        ) : ec.deudor && (
                          <p className="text-[10px] text-red-400 font-mono uppercase tracking-wider">
                            ✕ no juega
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  {months.map((m) => {
                    const pay = p.payments.find((x) => x.month === m);
                    const esFuturo = m > currentMonth;
                    const paid = pay?.paid ?? false;
                    const marcado = pay !== undefined;
                    return (
                      <td key={m} className={cn('p-1 text-center', esFuturo ? "opacity-25" : "")}>
                        <button
                          disabled={esFuturo}
                          onClick={() => abrirPago(p, m)}
                          title={
                            esFuturo
                              ? "Mes futuro"
                              : marcado
                                ? `Ver / cambiar pago de ${monthShort(m)}`
                                : `Marcar pago de ${monthShort(m)}`
                          }
                          className={cn('w-full h-8 inline-flex items-center justify-center rounded-md text-xs font-bold transition-all duration-150 active:scale-95',
                            esFuturo
                              ? 'bg-surface-1/50 text-white/20 cursor-default'
                              : paid
                                ? 'bg-green-500/25 text-green-300 border border-green-500/30 hover:bg-green-500/40'
                                : marcado
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                                  : 'bg-surface-1 text-white/35 border border-transparent hover:bg-surface-2 hover:text-white/60'
                          )}
                        >
                          {esFuturo ? "·" : paid ? <Icon name="check" className="w-3.5 h-3.5" /> : marcado ? <Icon name="nulo" className="w-3.5 h-3.5" /> : "·"}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    <span
                      className={cn('inline-block px-2 py-0.5 rounded-md text-xs font-mono',
                        ec.mesesDebe > 0
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-green-500/15 text-green-400 border border-green-500/25'
                      )}
                    >
                      {ec.mesesDebe > 0 ? `${ec.mesesDebe} ${ec.mesesDebe === 1 ? "mes" : "meses"}` : "OK"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {plantel.length === 0 && (
              <tr>
                <td colSpan={months.length + 2} className="p-6 text-center text-white/40">
                  Sin jugadores en este equipo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}