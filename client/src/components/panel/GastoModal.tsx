import { monthShort } from "../../lib/panel-helpers";

export interface GastoFormState {
  nombre: string;
  monto: string;
}

interface IGastoModalProps {
  modal: null | { tipo: "fijo" | "extra"; mes?: string };
  setModal: (m: null | { tipo: "fijo" | "extra"; mes?: string }) => void;
  form: GastoFormState;
  setForm: (f: GastoFormState) => void;
  saving: boolean;
  mesActual: () => string;
  save: () => void;
}

export default function GastoModal({
  modal,
  setModal,
  form,
  setForm,
  saving,
  mesActual,
  save,
}: IGastoModalProps) {
  if (!modal) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-lg border border-outline bg-surface-2 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold">
            {modal.tipo === "fijo" ? "Nuevo gasto fijo" : `Gasto extra de ${monthShort(modal.mes ?? mesActual())}`}
          </h2>
          <button onClick={() => setModal(null)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-white/50 mt-1">
          {modal.tipo === "fijo"
            ? "Se repite todos los meses (cancha, árbitros, viáticos...)."
            : "Gasto puntual solo de este mes (cancha extra por lluvia, etc.)."}
        </p>
        <div className="mt-4 space-y-3">
          <input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Nombre (ej: Cancha)"
            className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
          />
          <input
            type="number"
            min="0"
            value={form.monto}
            onChange={(e) => setForm({ ...form, monto: e.target.value })}
            placeholder="Monto (ej: 45000)"
            className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="mt-4 w-full px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Agregar gasto"}
        </button>
      </div>
    </div>
  );
}