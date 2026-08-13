export interface ImportMsgState {
  creados: number;
  actualizados: number;
  vinculados: number;
  errores: Array<{ fila: number; motivo: string }>;
  error?: string;
}

interface ImportModalProps {
  show: boolean;
  close: () => void;
  importFile: File | null;
  setImportFile: (f: File | null) => void;
  importMsg: ImportMsgState | null;
  setImportMsg: (m: ImportMsgState | null) => void;
  importing: boolean;
  importarExcel: () => void;
  descargarPlantilla: () => void;
}

export default function ImportModal({
  show,
  close,
  importFile,
  setImportFile,
  importMsg,
  setImportMsg,
  importing,
  importarExcel,
  descargarPlantilla,
}: ImportModalProps) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-lg border border-outline bg-surface-2 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold">Importar plantel desde Excel</h2>
            <p className="text-xs text-white/50 mt-1">
              Descargá la <button className="underline text-primary-light" onClick={descargarPlantilla}>plantilla</button>,
              completala y subila acá. El DNI es la clave: los jugadores ya existentes se actualizan y vinculan.
            </p>
          </div>
          <button onClick={close} className="text-white/50 hover:text-white text-xl leading-none">×</button>
        </div>

        {!importMsg && (
          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="text-xs text-white/60">Archivo .xlsx (máx 5 MB) *</span>
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                className="mt-1 w-full text-sm text-white/70 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-sm file:font-semibold file:cursor-pointer"
              />
            </label>
            <button
              onClick={importarExcel}
              disabled={importing || !importFile}
              className="w-full px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
            >
              {importing ? "Importando..." : "Importar"}
            </button>
          </div>
        )}

        {importMsg && (
          <div className="mt-5 space-y-3">
            {importMsg.error ? (
              <p className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {importMsg.error}
              </p>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
                {importMsg.creados} creados · {importMsg.actualizados} actualizados · {importMsg.vinculados} vinculados
              </div>
            )}
            {importMsg.errores.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm max-h-40 overflow-y-auto">
                <p className="font-semibold mb-1">Filas con errores ({importMsg.errores.length}):</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {importMsg.errores.map((e, i) => (
                    <li key={i}>fila {e.fila}: {e.motivo}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={() => { close(); setImportMsg(null); }}
              className="w-full px-4 py-2 rounded-lg border border-outline text-sm hover:bg-surface-2"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}