import { useState } from "react";
import * as XLSX from "xlsx";
import { apiFetch } from "../../lib/api";
import { Team, GymFilaCompleta, GymFilaCambio } from "../../lib/panel-types";
import { cn } from "../../lib/cn";

interface GymModalProps {
  show: boolean;
  setShow: (b: boolean) => void;
  esAdmin: boolean;
  teams: Team[];
  teamId: string;
  token: string | null;
  precioGlobal: number | null;
  setPrecioGlobal: (p: number) => void;
  onExportado: () => void;
  onMsg: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
}

const mesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function GymModal({
  show,
  setShow,
  esAdmin,
  teams,
  teamId,
  token,
  precioGlobal,
  setPrecioGlobal,
  onExportado,
  onMsg,
}: GymModalProps) {
  const [scope, setScope] = useState<"club" | "teamId">("club");
  const [scopeTeamId, setScopeTeamId] = useState(teamId);
  const [tipo, setTipo] = useState<"completa" | "altas" | "bajas">("completa");
  const [mes, setMes] = useState(mesActual());
  const [exportando, setExportando] = useState(false);
  const [precioInput, setPrecioInput] = useState(precioGlobal != null ? String(precioGlobal) : "");
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);

  if (!show) return null;

  const equipos = teams.length > 0 ? teams : [];
  const equipoSeleccionado = equipos.find((t) => t.id === scopeTeamId) ?? equipos[0] ?? null;

  const estadoGymLabel = (e: string) =>
    e === "PAGO" ? "Pagó" : e === "DEBE" ? "Debe" : "Pendiente";
  const estadoCuotaLabel = (e: string) =>
    e === "AL_DIA" ? "Al día" : e === "DEBE" ? "Debe" : "Pendiente";

  async function exportar() {
    if (!token) return;
    setExportando(true);
    try {
      const qs = new URLSearchParams({ scope: scope === "club" ? "club" : "teamId", tipo, mes });
      if (scope === "teamId") {
        const e = equipoSeleccionado ?? { id: teamId };
        qs.set("teamId", e.id);
      }
      const data = await apiFetch<GymFilaCompleta[] | GymFilaCambio[]>(`/gym/lista?${qs}`, {}, token);
      if (!data || data.length === 0) {
        onMsg(tipo === "completa" ? "No hay jugadores que vayan al gym para exportar" : "No hay cambios de ese tipo pendientes", "warning");
        return;
      }

      const filas =
        tipo === "completa"
          ? (data as GymFilaCompleta[]).map((p) => ({
              "DNI": p.document,
              "Apellido": p.lastName,
              "Nombre": p.firstName,
              "Fecha nacimiento": p.birthDate ?? "",
              "Equipos": p.equipos.join(", "),
              "Gym del mes": estadoGymLabel(p.gymEstado),
              "Monto gym": p.gymMonto > 0 ? "$" + p.gymMonto.toLocaleString("es-AR") : "",
              "Nota gym": p.gymNota ?? "",
              "Cuota del mes": estadoCuotaLabel(p.cuotaEstado),
              "Monto cuota": p.cuotaMonto > 0 ? "$" + p.cuotaMonto.toLocaleString("es-AR") : "",
            }))
          : (data as GymFilaCambio[]).map((c) => ({
              "Cambio": c.tipo === "ALTA" ? "Alta" : "Baja",
              "Fecha": c.fecha,
              "DNI": c.document,
              "Apellido": c.lastName,
              "Nombre": c.firstName,
              "Fecha nacimiento": c.birthDate ?? "",
              "Equipo": c.equipo,
            }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filas);
      const hoja = tipo === "completa" ? "Gym" : tipo === "altas" ? "Altas gym" : "Bajas gym";
      XLSX.utils.book_append_sheet(wb, ws, hoja);
      const ambito = scope === "club" ? "Club" : (equipoSeleccionado?.name ?? "Equipo");
      const fecha = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `JH_Gym_${ambito}_${hoja}_${mes}_${fecha}.xlsx`);

      // Al exportar la lista completa, los cambios ya están incluidos → se resuelven.
      if (tipo === "completa") {
        await apiFetch("/gym/avisos/resolver", { method: "POST" }, token);
        onExportado();
      }
      onMsg(`Exportados ${filas.length} registros`, "success");
      setShow(false);
    } catch (e) {
      onMsg("Error al exportar: " + (e as Error).message, "error");
    } finally {
      setExportando(false);
    }
  }

  async function guardarPrecio() {
    if (!token || !esAdmin) return;
    const n = Number(precioInput.replace(/[^\d]/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      onMsg("Ingresá un monto válido para el precio del gym.", "warning");
      return;
    }
    setGuardandoPrecio(true);
    try {
      await apiFetch("/gym/config", { method: "PUT", body: JSON.stringify({ precio: n }) }, token);
      setPrecioGlobal(n);
      onMsg(`Precio global del gym actualizado: $${n.toLocaleString("es-AR")}`, "success");
    } catch (e) {
      onMsg("Error al guardar el precio: " + (e as Error).message, "error");
    } finally {
      setGuardandoPrecio(false);
    }
  }

  const opcionBtn = (activo: boolean) =>
    `flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
      activo ? "bg-primary text-white" : "bg-surface-1 border border-outline text-white/70 hover:text-white"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-outline bg-surface-2 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold">Gimnasio</h2>
            <p className="text-xs text-white/50 mt-1">
              Lista de jugadores que van al gym + sus pagos mensuales (discriminados por mes).
            </p>
          </div>
          <button onClick={() => setShow(false)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Precio global del gym (solo ADMIN) */}
        {esAdmin && (
          <div className="mt-4 rounded-lg border border-outline bg-surface-1 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex-1 min-w-[140px]">
                <span className="text-xs text-white/60">Precio global del gym (por mes)</span>
                <input
                  type="number"
                  min="0"
                  value={precioInput}
                  onChange={(e) => setPrecioInput(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder={precioGlobal != null ? `$${precioGlobal.toLocaleString("es-AR")}` : "Ej: 18000"}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-2 border border-outline text-sm"
                />
              </label>
              <button
                onClick={guardarPrecio}
                disabled={guardandoPrecio}
                className="mt-5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-light disabled:opacity-50"
              >
                {guardandoPrecio ? "Guardando..." : "Guardar"}
              </button>
            </div>
            <p className="text-[10px] text-white/40 mt-2">
              Es el costo mensual por jugador que va. Si un jugador paga distinto (ej. va pocos días), se carga su
              monto propio en el jugador o al registrar el pago del mes.
            </p>
          </div>
        )}

        {/* Ámbito */}
        <label className="block mt-4">
          <span className="text-xs text-white/60">Ámbito</span>
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={() => setScope("club")}
              disabled={!esAdmin}
              className={cn(opcionBtn(scope === "club"), 'disabled:opacity-40 disabled:cursor-not-allowed')}
              title={esAdmin ? "Todo el club, sin repetidos por DNI" : "Solo el administrador exporta el club completo"}
            >
              Todo el club
            </button>
            <button type="button" onClick={() => setScope("teamId")} className={opcionBtn(scope === "teamId")}>
              Un equipo
            </button>
          </div>
        </label>

        {scope === "teamId" && (
          <label className="block mt-3">
            <span className="text-xs text-white/60">Equipo</span>
            <select
              value={equipoSeleccionado?.id ?? ""}
              onChange={(e) => setScopeTeamId(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm"
            >
              {equipos.map((t) => (
                <option key={t.id} value={t.id} className="bg-surface-1">
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Mes */}
        <label className="block mt-3">
          <span className="text-xs text-white/60">Mes</span>
          <input
            type="month"
            value={mes}
            max={mesActual()}
            onChange={(e) => setMes(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-1 border border-outline text-sm [color-scheme:dark]"
          />
        </label>

        {/* Tipo de export */}
        <label className="block mt-4">
          <span className="text-xs text-white/60">Qué exportar</span>
          <div className="mt-1.5 flex gap-2">
            <button type="button" onClick={() => setTipo("completa")} className={opcionBtn(tipo === "completa")}>
              Completa
            </button>
            <button type="button" onClick={() => setTipo("altas")} className={opcionBtn(tipo === "altas")}>
              Solo altas
            </button>
            <button type="button" onClick={() => setTipo("bajas")} className={opcionBtn(tipo === "bajas")}>
              Solo bajas
            </button>
          </div>
        </label>

        <p className="text-xs text-white/40 mt-3 leading-relaxed">
          {tipo === "completa"
            ? "Todos los que van al gym, con su estado del mes (Pagó/Debe/Pendiente), el monto, la nota y la cuota del mes. Al exportarla se limpian los avisos pendientes."
            : `Solo los cambios (${tipo === "altas" ? "los que empezaron a ir" : "los que dejaron de ir"}) desde la última exportación de la lista completa.`}
        </p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setShow(false)}
            className="flex-1 px-4 py-2 rounded-xl bg-surface-1 border border-outline text-white/70 text-sm font-semibold hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={exportar}
            disabled={exportando}
            className="flex-1 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
          >
            {exportando ? "Exportando..." : "Exportar Excel"}
          </button>
        </div>
      </div>
    </div>
  );
}