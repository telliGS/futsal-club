import { useState } from "react";
import * as XLSX from "xlsx";
import { apiFetch } from "../../lib/api";
import { Team, SeguroFilaCompleta, SeguroFilaCambio } from "../../lib/panel-types";

interface SeguroModalProps {
  show: boolean;
  setShow: (b: boolean) => void;
  esAdmin: boolean;
  teams: Team[];
  teamId: string;
  token: string | null;
  onExportado: () => void;
  onMsg: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
}

export default function SeguroModal({
  show,
  setShow,
  esAdmin,
  teams,
  teamId,
  token,
  onExportado,
  onMsg,
}: SeguroModalProps) {
  const [scope, setScope] = useState<"club" | "teamId">("club");
  const [scopeTeamId, setScopeTeamId] = useState(teamId);
  const [tipo, setTipo] = useState<"completa" | "altas" | "bajas">("completa");
  const [exportando, setExportando] = useState(false);

  if (!show) return null;

  const equipos = teams.length > 0 ? teams : [];
  const equipoSeleccionado = equipos.find((t) => t.id === scopeTeamId) ?? equipos[0] ?? null;

  async function exportar() {
    if (!token) return;
    setExportando(true);
    try {
      const qs = new URLSearchParams({
        scope: scope === "club" ? "club" : "teamId",
        tipo,
      });
      if (scope === "teamId") {
        const e = equipoSeleccionado ?? { id: teamId };
        qs.set("teamId", e.id);
      }
      const data = await apiFetch<SeguroFilaCompleta[] | SeguroFilaCambio[]>(
        `/seguro/lista?${qs}`,
        {},
        token
      );
      if (!data || data.length === 0) {
        onMsg(tipo === "completa" ? "No hay asegurados activos para exportar" : "No hay cambios de ese tipo pendientes", "warning");
        return;
      }

      const filas =
        tipo === "completa"
          ? (data as SeguroFilaCompleta[]).map((p) => ({
              "DNI": p.document,
              "Apellido": p.lastName,
              "Nombre": p.firstName,
              "Fecha nacimiento": p.birthDate ?? "",
              "Estado": p.estado === "ACTIVO" ? "Activo" : p.estado === "DEUDA" ? "Activo (debe)" : p.estado,
              "Equipos": p.equipos.join(", "),
            }))
          : (data as SeguroFilaCambio[]).map((c) => ({
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
      const hoja = tipo === "completa" ? "Asegurados" : tipo === "altas" ? "Altas" : "Bajas";
      XLSX.utils.book_append_sheet(wb, ws, hoja);
      const ambito = scope === "club" ? "Club" : (equipoSeleccionado?.name ?? "Equipo");
      const fecha = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `JH_Seguro_${ambito}_${hoja}_${fecha}.xlsx`);

      // Al exportar la lista completa, los cambios ya están incluidos → se resuelven.
      if (tipo === "completa") {
        await apiFetch("/seguro/avisos/resolver", { method: "POST" }, token);
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

  const opcionBtn = (activo: boolean) =>
    `flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
      activo ? "bg-primary text-white" : "bg-surface-1 border border-outline text-white/70 hover:text-white"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-outline bg-surface-2 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold">Lista de asegurados</h2>
            <p className="text-xs text-white/50 mt-1">
              Exportá la lista para el seguro (solo jugadores activos; los que deben también van).
            </p>
          </div>
          <button onClick={() => setShow(false)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Ámbito */}
        <label className="block mt-5">
          <span className="text-xs text-white/60">Ámbito</span>
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={() => setScope("club")}
              disabled={!esAdmin}
              className={`${opcionBtn(scope === "club")} disabled:opacity-40 disabled:cursor-not-allowed`}
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
            ? "Incluye todos los asegurados actuales. Al exportarla, se limpian los avisos de altas/bajas pendientes."
            : `Solo los cambios (${tipo === "altas" ? "jugadores que entraron" : "jugadores que salieron"}) desde la última exportación de la lista completa.`}
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