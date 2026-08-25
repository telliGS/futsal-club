import { cn } from "../../lib/cn";

interface CredMsg {
  ok: boolean;
  text: string;
}

export interface CredFormState {
  email: string;
  password: string;
  currentPassword: string;
}

interface CredencialesModalProps {
  show: boolean;
  setShow: (v: boolean) => void;
  credForm: CredFormState;
  setCredForm: (f: CredFormState) => void;
  credSaving: boolean;
  credMsg: CredMsg | null;
  guardarCredenciales: () => void;
}

export default function CredencialesModal({
  show,
  setShow,
  credForm,
  setCredForm,
  credSaving,
  credMsg,
  guardarCredenciales,
}: CredencialesModalProps) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-outline bg-surface-2 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold">Cambiar mis credenciales</h2>
          <button onClick={() => setShow(false)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-white/50 mt-1">
          Es tu único cambio de email/contraseña. Después, si necesitás otro, pedilo al administrador.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); guardarCredenciales(); }}
          className="mt-5 space-y-4"
        >
          <div>
            <label className="text-xs text-white/70 block mb-1">Email de acceso</label>
            <input
              type="email"
              value={credForm.email}
              onChange={(e) => setCredForm({ ...credForm, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-white/70 block mb-1">Contraseña actual</label>
            <input
              type="password"
              value={credForm.currentPassword}
              onChange={(e) => setCredForm({ ...credForm, currentPassword: e.target.value })}
              placeholder="Necesaria para cambiar la contraseña"
              className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
              minLength={1}
            />
          </div>
          <div>
            <label className="text-xs text-white/70 block mb-1">
              Contraseña nueva (dejala vacía para no cambiarla)
            </label>
            <input
              type="password"
              value={credForm.password}
              onChange={(e) => setCredForm({ ...credForm, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
              minLength={6}
            />
          </div>

          {credMsg && (
            <p className={cn('text-sm', credMsg.ok ? "text-emerald-400" : "text-red-400")}>{credMsg.text}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={credSaving}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {credSaving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => setShow(false)}
              className="px-4 py-2 rounded-lg border border-outline text-sm text-white/70 hover:bg-surface-2 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}