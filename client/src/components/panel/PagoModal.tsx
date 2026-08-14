import { useState } from "react";
import { monthShort } from "../../lib/panel-helpers";
import { Player } from "../../lib/panel-types";

export interface PagoModalState {
  player: Player;
  month: string;
}

interface PagoModalProps {
  modal: PagoModalState | null;
  setModal: (v: PagoModalState | null) => void;
  cuotaSugerida: number | null; // cuota de la categoría (default del monto)
  saving: boolean;
  guardarPago: (amount: number, note: string) => void;
  quitarPago: () => void;
  ponerNulo: () => void;
}

export default function PagoModal({
  modal,
  setModal,
  cuotaSugerida,
  saving,
  guardarPago,
  quitarPago,
  ponerNulo,
}: PagoModalProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  if (!modal) return null;
  const { player, month } = modal;
  const yaPago = player.payments.some((x) => x.month === month && x.paid);
  const registro = player.payments.find((x) => x.month === month);
  const defaultAmount = registro ? String(registro.amount) : cuotaSugerida != null ? String(cuotaSugerida) : "";
  const monto = amount || defaultAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-lg border border-outline bg-surface-2 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold">Pago de cuota</h2>
          <button onClick={() => setModal(null)} className="text-white/50 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>
        <p className="text-xs text-white/50 mt-1">
          {monthShort(month)} · {player.firstName} {player.lastName}
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs text-white/60">Monto pagado</span>
            <input
              type="number"
              min="0"
              step="100"
              value={monto}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              placeholder={cuotaSugerida != null ? `Sugerido: ${cuotaSugerida}` : "Monto de la cuota"}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
            />
            <span className="text-[10px] text-white/40 mt-0.5 block">
              {cuotaSugerida != null
                ? `Cuota de la categoría: $${cuotaSugerida.toLocaleString("es-AR")}. Podés cargar un pago parcial.`
                : "Sin cuota cargada en esta categoría: cargá el monto que pagó."}
            </span>
          </label>

          <label className="block">
            <span className="text-xs text-white/60">Detalle (opcional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: pagó la mitad, resta el resto"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
            />
          </label>
        </div>

        <div className="mt-5 space-y-2">
          {yaPago ? (
            <>
              <button
                onClick={() => guardarPago(Number(monto) || 0, note.trim())}
                disabled={saving}
                className="w-full px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Actualizar pago"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={quitarPago}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-red-500/30 text-red-300 text-sm hover:bg-red-500/10 disabled:opacity-50"
                >
                  Quitar (impago)
                </button>
                {registro && (
                  <button
                    onClick={ponerNulo}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg border border-outline text-white/60 text-sm hover:bg-surface-1 disabled:opacity-50"
                  >
                    Poner nulo
                  </button>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={() => guardarPago(Number(monto) || 0, note.trim())}
              disabled={saving}
              className="w-full px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Registrar pago"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}