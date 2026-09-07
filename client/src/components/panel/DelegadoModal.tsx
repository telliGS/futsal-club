import { ITeam } from "../../lib/panel-types";
import { cn } from "../../lib/cn";

export interface DelegadoFormState {
  fullName: string;
  email: string;
  password: string;
  role: "DELEGADO" | "ADMIN";
  teamIds: string[];
}

interface IDelegadoModalProps {
  show: boolean;
  setShow: (v: boolean) => void;
  editingId: string | null;
  form: DelegadoFormState;
  setForm: (f: DelegadoFormState) => void;
  allTeams: ITeam[];
  error: string;
  saving: boolean;
  save: (e: React.FormEvent) => void;
}

export default function DelegadoModal({
  show,
  setShow,
  editingId,
  form,
  setForm,
  allTeams,
  error,
  saving,
  save,
}: IDelegadoModalProps) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-outline bg-surface-2 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold">
            {editingId ? "Editar delegado" : "Nuevo delegado"}
          </h2>
          <button onClick={() => setShow(false)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-white/50 mt-1">
          {editingId
            ? "Cambiá los datos y guardá. Dejá la contraseña vacía para no modificarla."
            : "Creá una cuenta para que el delegado gestione sus equipos."}
        </p>

        <form onSubmit={save} className="mt-5 space-y-4">
          <div>
            <label className="text-xs text-white/70 block mb-1">Nombre y apellido</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Ej: Juan Pérez"
              className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-white/70 block mb-1">Email de acceso</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="delegado@josehernandez.futbol"
              className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-white/70 block mb-1">
              Contraseña {editingId && "(dejala vacía para no cambiarla)"}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editingId ? "••••••••" : "Mínimo 6 caracteres"}
              className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
              required={!editingId}
              minLength={6}
            />
          </div>
          <div>
            <label className="text-xs text-white/70 block mb-1.5">Tipo de cuenta</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, role: "DELEGADO" })}
                className={cn('flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95',
                  form.role === "DELEGADO" ? "bg-primary text-white" : "bg-surface-1 border border-outline text-white/70 hover:text-white"
                )}
              >
                Delegado
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, role: "ADMIN" })}
                className={cn('flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95',
                  form.role === "ADMIN" ? "bg-primary text-white" : "bg-surface-1 border border-outline text-white/70 hover:text-white"
                )}
              >
                Admin (acceso total)
              </button>
            </div>
            <p className="text-[11px] text-white/40 mt-1.5">
              {form.role === "ADMIN"
                ? "Ve y gestiona TODO el club (todos los equipos, seguro y cuentas)."
                : "Ve solo los equipos que le asignás."}
            </p>
          </div>
          {form.role === "DELEGADO" && (
            <div>
              <label className="text-xs text-white/70 block mb-1.5">Equipos asignados</label>
              <p className="text-[11px] text-white/40 mb-2">
                Marcá las categorías que va a poder gestionar.
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto rounded-lg border border-outline bg-surface-1 p-2">
                {allTeams.length === 0 && (
                  <p className="text-xs text-white/40 col-span-2 p-2">Cargando equipos...</p>
                )}
                {allTeams.map((team) => {
                  const checked = form.teamIds.includes(team.id);
                  return (
                    <label
                      key={team.id}
                      className={cn('flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer text-sm transition-colors',
                        checked ? 'bg-primary/15 text-white border border-primary/30' : 'hover:bg-surface-2 text-white/80 border border-transparent'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setForm({
                            ...form,
                            teamIds: e.target.checked
                              ? [...form.teamIds, team.id]
                              : form.teamIds.filter((id) => id !== team.id),
                          });
                        }}
                        className="accent-primary"
                      />
                      {team.name}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
            >
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : form.role === "ADMIN" ? "Crear admin" : "Crear delegado"}
            </button>
            <button
              type="button"
              onClick={() => setShow(false)}
              className="px-4 py-2 rounded-lg border border-outline text-white/70 text-sm hover:bg-surface-1"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}