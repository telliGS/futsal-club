import { ITeam } from "../../lib/panel-types";

export interface PoliSlotFormState {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  place: string;
  teamId: string;
  responsable: string;
  note: string;
}

interface IPoliSlotModalProps {
  show: boolean;
  setShow: (v: boolean) => void;
  editingId: string | null;
  form: PoliSlotFormState;
  setForm: (f: PoliSlotFormState) => void;
  esAdmin: boolean;
  equiposPoliEditables: ITeam[];
  error: string;
  saving: boolean;
  save: (e: React.FormEvent) => void;
}

export default function PoliSlotModal({
  show,
  setShow,
  editingId,
  form,
  setForm,
  esAdmin,
  equiposPoliEditables,
  error,
  saving,
  save,
}: IPoliSlotModalProps) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-outline bg-surface-2 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold">
            {editingId ? "Editar bloque semanal" : "Nuevo bloque semanal"}
          </h2>
          <button onClick={() => setShow(false)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-white/50 mt-1">
          Se repite todas las semanas hasta que lo cambies. Para un solo día usá "Cambiar este día" en la grilla.
        </p>

        <form onSubmit={save} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/70 block mb-1">Día</label>
              <select
                value={form.dayOfWeek}
                onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
              >
                <option value={1}>Lunes</option>
                <option value={2}>Martes</option>
                <option value={3}>Miércoles</option>
                <option value={4}>Jueves</option>
                <option value={5}>Viernes</option>
                <option value={6}>Sábado</option>
                <option value={7}>Domingo</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/70 block mb-1">Lugar</label>
              <select
                value={form.place}
                onChange={(e) => setForm({ ...form, place: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
              >
                <option>Polideportivo</option>
                <option>La Toma</option>
                <option>Palermo</option>
                <option>Borja</option>
                <option>Gimnasio</option>
                <option>Cancha de césped</option>
                <option>Otro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/70 block mb-1">Desde</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs text-white/70 block mb-1">Hasta</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/70 block mb-1">Equipo / actividad</label>
            <select
              value={form.teamId}
              onChange={(e) => setForm({ ...form, teamId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
            >
              {esAdmin && <option value="">Actividad libre (sin equipo)</option>}
              {equiposPoliEditables.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/70 block mb-1">Responsable (opcional)</label>
            <input
              value={form.responsable}
              onChange={(e) => setForm({ ...form, responsable: e.target.value })}
              placeholder="Ej: DT Marcos"
              className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-white/70 block mb-1">Nota (opcional)</label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Ej: solo jugadores convocados"
              className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShow(false)}
              className="px-4 py-2 rounded-lg border border-outline text-white/70 text-sm hover:bg-surface-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
            >
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear bloque"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}