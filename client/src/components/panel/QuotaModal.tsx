interface QuotaModalProps {
  show: boolean;
  setShow: (v: boolean) => void;
  categoria: string | null | undefined;
  quotaInput: string;
  setQuotaInput: (v: string) => void;
  saving: boolean;
  save: () => void;
}

export default function QuotaModal({
  show,
  setShow,
  categoria,
  quotaInput,
  setQuotaInput,
  saving,
  save,
}: QuotaModalProps) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-lg border border-outline bg-surface-2 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold">Cuota mensual</h2>
          <button onClick={() => setShow(false)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-white/50 mt-1">
          La cuota por jugador de {categoria}. Dejalo vacío para quitar la cuota cargada.
        </p>
        <input
          type="number"
          min="0"
          step="500"
          value={quotaInput}
          onChange={(e) => setQuotaInput(e.target.value)}
          placeholder="Ej: 30000"
          className="mt-4 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
        />
        <button
          onClick={save}
          disabled={saving}
          className="mt-4 w-full px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar cuota"}
        </button>
      </div>
    </div>
  );
}