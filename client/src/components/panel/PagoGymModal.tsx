import { useState } from "react";
import { monthShort } from "../../lib/panel-helpers";
import { IPlayer } from "../../lib/panel-types";

export interface PagoGymModalState {
  player: IPlayer;
  month: string;
}

interface IPagoGymModalProps {
  modal: PagoGymModalState | null;
  setModal: (v: PagoGymModalState | null) => void;
  precioGlobal: number | null; // precio global del gym (default del monto)
  saving: boolean;
  guardarPago: (amount: number, note: string) => void;
  quitarPago: () => void;
  ponerNulo: () => void;
}

export default function PagoGymModal({
  modal,
  setModal,
  precioGlobal,
  saving,
  guardarPago,
  quitarPago,
  ponerNulo,
}: IPagoGymModalProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  if (!modal) return null;
  const { player, month } = modal;
  const yaPago = (player.gymPayments ?? []).some((x) => x.month === month && x.paid);
  const registro = (player.gymPayments ?? []).find((x) => x.month === month);
  const sugerido = player.gymPrecio ?? precioGlobal;
  const defaultAmount = registro ? String(registro.amount) : sugerido != null ? String(sugerido) : "";
  const monto = amount || defaultAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-lg border border-outline bg-surface-2 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold">Pago de gimnasio</h2>
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
              placeholder={sugerido != null ? `Sugerido: ${sugerido}` : "Monto del gym"}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
            />
            <span className="text-[10px] text-white/40 mt-0.5 block">
              {player.gymPrecio != null
                ? `Costo propio del jugador: $${player.gymPrecio.toLocaleString("es-AR")}. Podés cargar un pago parcial.`
                : precioGlobal != null
                  ? `Costo global del gym: $${precioGlobal.toLocaleString("es-AR")}. Podés cargar un pago parcial (ej. si va pocos días).`
                  : "Cargá el monto que pagó por el gym."}
            </span>
          </label>

          <label className="block">
            <span className="text-xs text-white/60">Detalle (opcional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: va 1 día de los 2, paga la mitad"
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