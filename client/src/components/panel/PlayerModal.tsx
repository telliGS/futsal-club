import { Player } from "../../lib/panel-types";

interface PlayerEncontrado {
  id: string;
  firstName: string;
  lastName: string;
  equipos: { name: string; type: string }[];
}

export interface PlayerFormState {
  lastName: string;
  firstName: string;
  document: string;
  birthDate: string;
  role: string;
  position: string;
  jersey: string;
  hasInsurance: boolean;
}

interface PlayerModalProps {
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  editing: Player | null;
  form: PlayerFormState;
  setForm: (f: PlayerFormState) => void;
  saving: boolean;
  formError: string;
  foundPlayer: PlayerEncontrado | null;
  buscandoDni: boolean;
  cuentaPresupuesto: boolean;
  setCuentaPresupuesto: (v: boolean) => void;
  savePlayer: () => void;
}

export default function PlayerModal({
  showForm,
  setShowForm,
  editing,
  form,
  setForm,
  saving,
  formError,
  foundPlayer,
  buscandoDni,
  cuentaPresupuesto,
  setCuentaPresupuesto,
  savePlayer,
}: PlayerModalProps) {
  if (!showForm) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-outline bg-surface-2 p-6">
        <h2 className="font-display text-lg font-bold">
          {editing ? `Editar: ${editing.firstName} ${editing.lastName}` : "Nuevo jugador / técnico"}
        </h2>
        <p className="text-xs text-white/50 mt-1">
          Cargar por DNI: si el jugador ya existe en otro equipo, solo se vincula acá.
        </p>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-white/60">Apellido *</span>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                placeholder="Pérez"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/60">Nombre *</span>
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                placeholder="Juan"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/60">DNI *</span>
              <input
                value={form.document}
                onChange={(e) => setForm({ ...form, document: e.target.value.replace(/\D/g, "") })}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                placeholder="12345678"
              />
            </label>
            {buscandoDni && (
              <p className="text-xs text-white/40">Buscando DNI...</p>
            )}
            {!buscandoDni && foundPlayer && (
              <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-xs col-span-2">
                <p className="text-primary-light font-semibold">
                  ✓ DNI ya registrado: {foundPlayer.firstName} {foundPlayer.lastName}
                </p>
                <p className="text-white/70 mt-1 leading-relaxed">
                  Se va a <span className="font-semibold text-white">vincular</span> a este equipo, sin duplicar datos.
                  {foundPlayer.equipos.length > 0 && (
                    <>
                      {" "}Ya figura en:{" "}
                      <span className="font-semibold text-white">
                        {foundPlayer.equipos
                          .map((e) => `${e.name} (${e.type === "FORMATIVA" ? "Formativa" : "Primera"})`)
                          .join(", ")}
                      </span>
                      .
                    </>
                  )}
                </p>
              </div>
            )}
            <label className="block">
              <span className="text-xs text-white/60">Fecha de nacimiento</span>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm [color-scheme:dark]"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/60">Rol</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
              >
                <option value="JUGADOR" className="bg-surface-2">Jugador</option>
                <option value="DT" className="bg-surface-2">DT</option>
                <option value="AT" className="bg-surface-2">AT</option>
                <option value="PF" className="bg-surface-2">PF</option>
                <option value="DEL" className="bg-surface-2">Delegado</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-white/60">Posición</span>
              <input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                placeholder="Ala, Cierre..."
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/60">N° camiseta</span>
              <input
                value={form.jersey}
                onChange={(e) => setForm({ ...form, jersey: e.target.value.replace(/\D/g, "") })}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
                placeholder="10"
              />
            </label>
            <label className="flex items-end gap-2 pb-2">
              <input
                type="checkbox"
                checked={form.hasInsurance}
                onChange={(e) => setForm({ ...form, hasInsurance: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-xs text-white/60">Tiene seguro/ficha hoy</span>
            </label>
          </div>

          {editing && form.role === "JUGADOR" && (
            <label className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-surface-1 border border-outline cursor-pointer hover:bg-surface-2 transition-colors">
              <input
                type="checkbox"
                checked={cuentaPresupuesto}
                onChange={(e) => setCuentaPresupuesto(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-xs text-white/70">
                Cuenta para el <span className="text-primary-light font-semibold">presupuesto</span> (paga cuota)
              </span>
            </label>
          )}

          {formError && <p className="text-red-400 text-sm">{formError}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2 rounded-lg border border-outline text-sm hover:bg-surface-2"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={savePlayer}
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
            >
              {saving ? "Guardando..." : editing ? "Guardar cambios" : foundPlayer ? "Vincular a este equipo" : "Agregar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}