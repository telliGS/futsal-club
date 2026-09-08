import { labelTipo } from "../../lib/panel-helpers";
import { IDocItem, IFichaEstado, IPlayer } from "../../lib/panel-types";
import { cn } from "../../lib/cn";

export interface DocFormState {
  tipo: string;
  descripcion: string;
  fechaEmision: string;
  file: File | null;
}

interface IFichasModalProps {
  player: IPlayer | null;
  setPlayer: (p: IPlayer | null) => void;
  estado: IFichaEstado | null;
  form: DocFormState;
  setForm: (f: DocFormState) => void;
  list: IDocItem[];
  loading: boolean;
  msg: string;
  vigenciaHint: (tipo: string) => string;
  subirDoc: () => void;
  descargarDoc: (d: IDocItem) => void;
  borrarDoc: (d: IDocItem) => void;
}

export default function FichasModal({
  player,
  setPlayer,
  estado,
  form,
  setForm,
  list,
  loading,
  msg,
  vigenciaHint,
  subirDoc,
  descargarDoc,
  borrarDoc,
}: IFichasModalProps) {
  if (!player) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-lg border border-outline bg-surface-2 p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold">
              Fichas: {player.firstName} {player.lastName}
            </h2>
            <p className="text-xs text-white/50 mt-1">
              Ergo vence a los 2 años, electro al año de la emisión. Se calcula automáticamente.
            </p>
          </div>
          <button
            onClick={() => setPlayer(null)}
            className="text-white/50 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Estado general */}
        {estado && (
          <div className={cn('mt-4 px-3 py-2 rounded-lg text-sm border', estado.aptoFichas ? 'border-primary/30 bg-primary/10 text-primary-light' : 'border-red-500/30 bg-red-500/10 text-red-300')}>
            {estado.aptoFichas
              ? "Apto por documentación ✓"
              : "Documentación incompleta — no puede jugar ✕"}
            <span className="block text-xs opacity-80 mt-0.5">{estado.resumen}</span>
          </div>
        )}

        {/* Formulario de subida */}
        <div className="mt-5 rounded-lg border border-outline bg-surface-1 p-4 space-y-3">
          <p className="text-sm font-semibold text-white/80">Subir documento</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-white/60">Tipo *</span>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
              >
                <option value="FICHA_MEDICA" className="bg-surface-2">Ficha médica</option>
                <option value="ELECTROCARDIOGRAMA" className="bg-surface-2">Electrocardiograma</option>
                <option value="ERGONOMETRIA" className="bg-surface-2">Ergometría</option>
                <option value="OTRO" className="bg-surface-2">Otro</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-white/60">Fecha de emisión (del papel)</span>
              <input
                type="date"
                value={form.fechaEmision}
                onChange={(e) => setForm({ ...form, fechaEmision: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm [color-scheme:dark]"
              />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-white/40">{vigenciaHint(form.tipo)}</span>
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-white/60">Descripción (opcional)</span>
              <input
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                placeholder="Renovación 2do semestre 2026"
              />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-white/60">Archivo (PDF o imagen, máx 2 MB) *</span>
              <input
                type="file"
                accept=".pdf,image/*,.jpg,.jpeg,.png"
                onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
                className="mt-1 w-full text-sm text-white/70 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-sm file:font-semibold file:cursor-pointer"
              />
            </label>
          </div>
          {msg && <p className="text-sm text-white/60">{msg}</p>}
          <button
            onClick={subirDoc}
            disabled={loading}
            className="w-full px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
          >
            {loading ? "Subiendo..." : "Subir documento"}
          </button>
        </div>

        {/* Lista de documentos cargados */}
        <div className="mt-5">
          <p className="text-sm font-semibold text-white/80 mb-2">Documentos cargados</p>
          {list.length === 0 && (
            <p className="text-sm text-white/40">Todavía no hay documentos cargados.</p>
          )}
          <ul className="space-y-2">
            {list.map((d) => {
              const vence = d.fechaVencimiento ? new Date(d.fechaVencimiento) : null;
              const vencido = vence && vence.getTime() < Date.now();
              return (
                <li key={d.id} className="flex items-center gap-3 rounded-lg border border-outline bg-surface-1 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">
                      <span className="text-white/40 text-xs">{labelTipo(d.tipo)} · </span>
                      {d.fileName}
                    </p>
                    <p className="text-xs text-white/40">
                      {d.descripcion || ""}
                      {d.fechaEmision && (
                        <span className="text-white/40">
                          {" "}· emitido {new Date(d.fechaEmision).toLocaleDateString("es-AR")}
                        </span>
                      )}
                      {vence && (
                        <span className={vencido ? "text-red-400" : "text-white/50"}>
                          {" "}· vence {vence.toLocaleDateString("es-AR")}
                        </span>
                      )}
                      {!vence && " · sin fecha de vencimiento"}
                    </p>
                  </div>
                  <button
                    onClick={() => descargarDoc(d)}
                    className="px-2 py-1 rounded text-xs text-white/60 hover:text-white hover:bg-surface-2"
                  >
                    Descargar
                  </button>
                  <button
                    onClick={() => borrarDoc(d)}
                    className="px-2 py-1 rounded text-xs text-white/60 hover:text-red-400 hover:bg-red-500/10"
                  >
                    Eliminar
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}