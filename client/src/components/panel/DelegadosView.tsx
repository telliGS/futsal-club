import { IDelegadoAdmin } from "../../lib/panel-types";
import { cn } from "../../lib/cn";

interface IDelegadosViewProps {
  delegados: IDelegadoAdmin[];
  delegadosLoading: boolean;
  delegadosError: string;
  delegadoMsg: string;
  eliminarTodosDelegados: () => void;
  openNuevoDelegado: () => void;
  startEditDelegado: (d: IDelegadoAdmin) => void;
  toggleDelegadoActive: (d: IDelegadoAdmin) => void;
  reactivarCredenciales: (d: IDelegadoAdmin) => void;
  eliminarDelegado: (d: IDelegadoAdmin) => void;
}

export default function DelegadosView({
  delegados,
  delegadosLoading,
  delegadosError,
  delegadoMsg,
  eliminarTodosDelegados,
  openNuevoDelegado,
  startEditDelegado,
  toggleDelegadoActive,
  reactivarCredenciales,
  eliminarDelegado,
}: IDelegadosViewProps) {
  return (
    <div className="mt-8 rounded-lg border border-outline bg-surface-1 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Delegados</h2>
          <p className="text-sm text-white/60 mt-1">
            Cada delegado entra al panel con su email y contraseña, y ve solo los equipos que le asignás.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {delegados.length > 0 && (
            <button
              onClick={eliminarTodosDelegados}
              className="btn bg-transparent text-red-400/70 border border-red-400/30 hover:bg-red-400/10 hover:text-red-400 active:scale-95"
            >
              Eliminar todos
            </button>
          )}
          <button
            onClick={openNuevoDelegado}
            className="btn bg-primary text-white hover:bg-primary-light active:scale-95"
          >
            + Nuevo delegado
          </button>
        </div>
      </div>

      {delegadoMsg && (
        <p className="mt-4 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-sm text-primary-light">
          {delegadoMsg}
        </p>
      )}

      {delegadosError && <p className="mt-4 text-sm text-red-400">{delegadosError}</p>}

      {delegadosLoading ? (
        <p className="mt-6 text-white/60">Cargando delegados...</p>
      ) : delegados.length === 0 ? (
        <p className="mt-6 text-sm text-white/40">
          Todavía no hay delegados. Tocá "Nuevo delegado" para crear la primera cuenta.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50">
                <th className="py-2">Nombre</th>
                <th className="py-2">Email</th>
                <th className="py-2">Equipos</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Credenciales</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {delegados.map((d) => (
                <tr key={d.id} className={cn('border-t border-outline/60', d.active ? "" : "opacity-50")}>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span>{d.fullName}</span>
                      {d.role === "ADMIN" && (
                        <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary-light border border-primary/25 text-[10px] font-bold">
                          Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3">{d.email}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {d.role === "ADMIN" ? (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-xs text-primary-light">
                          Todos los equipos
                        </span>
                      ) : d.teamAccess.length === 0 ? (
                        <span className="text-white/40 text-xs">Sin equipos</span>
                      ) : (
                        d.teamAccess.map((a) => (
                          <span key={a.team.id} className="px-2 py-0.5 rounded-full bg-surface-2 border border-outline text-xs">
                            {a.team.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <span
                      className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
                        d.active
                          ? 'bg-primary/10 text-primary-light border border-primary/30'
                          : 'bg-white/5 text-white/50 border border-outline'
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', d.active ? "bg-primary-light" : "bg-white/40")} />
                      {d.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-3">
                    {d.canChangeCredentials ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary-light border border-primary/25 text-xs">
                        Puede autocambiarse
                      </span>
                    ) : (
                      <button
                        onClick={() => reactivarCredenciales(d)}
                        className="px-2.5 py-1 rounded-lg text-xs bg-transparent text-primary-light/80 border border-primary/25 hover:bg-primary/10 transition-colors"
                        title="Volver a permitirle cambiar su email/contraseña una vez"
                      >
                        Reactivar cambio
                      </button>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEditDelegado(d)}
                        className="px-2.5 py-1 rounded-lg text-xs bg-surface-2 border border-outline hover:bg-surface-1 text-white/80 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleDelegadoActive(d)}
                        className={cn('px-2.5 py-1 rounded-lg text-xs border transition-colors',
                          d.active
                            ? 'bg-transparent text-red-400/70 border-red-400/30 hover:bg-red-400/10 hover:text-red-400'
                            : 'bg-primary/10 text-primary-light border-primary/30 hover:bg-primary/20'
                        )}
                      >
                        {d.active ? "Desactivar" : "Reactivar"}
                      </button>
                      <button
                        onClick={() => eliminarDelegado(d)}
                        className="px-2.5 py-1 rounded-lg text-xs bg-transparent text-red-400/40 border border-transparent hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/30 transition-colors"
                        title="Eliminar cuenta (no se puede deshacer)"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-white/40">
        Los admin tienen acceso a todo el club. La cuenta del admin logueado no aparece acá para que no puedas modificarla por error.
      </p>
    </div>
  );
}