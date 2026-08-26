import { IPlayer } from "../../lib/panel-types";

interface InactivoModalProps {
  player: IPlayer | null;
  setPlayer: (p: IPlayer | null) => void;
  mes: string;
  setMes: (m: string) => void;
  confirmar: (p: IPlayer, mes: string) => void;
}

export default function InactivoModal({
  player,
  setPlayer,
  mes,
  setMes,
  confirmar,
}: InactivoModalProps) {
  if (!player) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-lg border border-outline bg-surface-2 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold">
            {player.status === "INACTIVO" ? "Ajustar mes de corte" : "Pasar a inactivo"}
          </h2>
          <button onClick={() => setPlayer(null)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-white/50 mt-1">
          {player.firstName} {player.lastName} deja de contar la cuota y el presupuesto.
          Su historial de pagos se conserva.
        </p>
        <label className="block mt-4">
          <span className="text-xs text-white/60">Hasta qué mes jugó</span>
          <input
            type="month"
            max={new Date().toISOString().slice(0, 7)}
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
          />
        </label>
        <p className="text-xs text-white/40 mt-2 leading-relaxed">
          Si tardaron en marcarlo (ej. dejó de venir en marzo y lo marcan ahora), elegí el mes en que dejó de jugar:
          la deuda se congela ahí y los meses posteriores no corren cuota.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setPlayer(null)}
            className="flex-1 px-4 py-2 rounded-xl bg-surface-1 border border-outline text-white/70 text-sm font-semibold hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              const p = player;
              setPlayer(null);
              if (p && mes) confirmar(p, mes);
            }}
            className="flex-1 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}