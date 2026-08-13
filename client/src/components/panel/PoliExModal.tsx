import { PoliBloque, Team } from "../../lib/panel-types";

export interface PoliExFormState {
  teamId: string;
  place: string;
  startTime: string;
  endTime: string;
  canceled: boolean;
  note: string;
}

interface PoliExModalProps {
  modal: { fecha: string; bloque?: PoliBloque } | null;
  setModal: (m: { fecha: string; bloque?: PoliBloque } | null) => void;
  form: PoliExFormState;
  setForm: (f: PoliExFormState) => void;
  esAdmin: boolean;
  equiposPoliEditables: Team[];
  error: string;
  saving: boolean;
  save: (e: React.FormEvent) => void;
}

export default function PoliExModal({
  modal,
  setModal,
  form,
  setForm,
  esAdmin,
  equiposPoliEditables,
  error,
  saving,
  save,
}: PoliExModalProps) {
  if (!modal) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-outline bg-surface-2 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold">
            {modal.bloque ? "Cambiar entrenamiento del día" : "Agregar entrenamiento puntual"}
          </h2>
          <button onClick={() => setModal(null)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-white/50 mt-1">
          {modal.bloque
            ? <>Aplica solo al <span className="text-white capitalize">{modal.fecha}</span>. Si cancelás, ese día no se entrena.</>
            : <>Entrenamiento único para el <span className="text-white capitalize">{modal.fecha}</span> (no se repite las semanas siguientes).</>}
        </p>

        <form onSubmit={save} className="mt-5 space-y-4">
          {modal.bloque && (
            <div className="rounded-lg bg-surface-1 border border-outline p-3 text-sm">
              <p className="text-white/80">
                <span className="text-white/50">De: </span>{modal.bloque.team?.name ?? "Actividad libre"}
                <span className="text-white/40"> · </span>{modal.bloque.startTime}–{modal.bloque.endTime}
                <span className="text-white/40"> · </span>{modal.bloque.place}
              </p>
            </div>
          )}

          {modal.bloque && (
            <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={form.canceled}
                onChange={(e) => setForm({ ...form, canceled: e.target.checked })}
                className="accent-red-500 w-4 h-4"
              />
              Cancelar el entrenamiento este día
            </label>
          )}

          {!modal.bloque && (
            <div>
              <label className="text-xs text-white/70 block mb-1">Equipo / actividad</label>
              <select
                value={form.teamId}
                onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                disabled={form.canceled}
                className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm disabled:opacity-50"
              >
                {esAdmin && <option value="">Actividad libre (sin equipo)</option>}
                {equiposPoliEditables.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/70 block mb-1">Lugar</label>
              <select
                value={form.place}
                onChange={(e) => setForm({ ...form, place: e.target.value })}
                disabled={form.canceled}
                className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm disabled:opacity-50"
              >
                <option value="">Sin cambio</option>
                <option>Polideportivo</option>
                <option>La Toma</option>
                <option>Palermo</option>
                <option>Borja</option>
                <option>Gimnasio</option>
                <option>Cancha de césped</option>
                <option>Otro</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-white/70 block mb-1">Desde</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  disabled={form.canceled}
                  className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-white/70 block mb-1">Hasta</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  disabled={form.canceled}
                  className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm disabled:opacity-50"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/70 block mb-1">Nota (opcional)</label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Ej: cancha ocupada por lluvia"
              className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="px-4 py-2 rounded-lg border border-outline text-white/70 text-sm hover:bg-surface-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
            >
              {saving ? "Guardando..." : modal.bloque ? "Aplicar cambio" : "Agregar entrenamiento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}