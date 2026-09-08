import { useState } from "react";
import { API, apiFetch } from "./api";
import { downloadAuthFile } from "./download";
import type { ImportMsgState } from "../components/panel/ImportModal";

/**
 * Importación masiva desde Excel, descarga de plantilla y exportación del
 * plantel. Necesita `onRefreshPlantel` para recargar los jugadores luego de
 * importar y `onError` para errores de red (se muestran en el panel).
 */
export function useExcel(
  token: string | null,
  teamId: string,
  onRefreshPlantel: () => Promise<void>,
  onError: (msg: string) => void,
  onToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void
) {
  const [exporting, setExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<ImportMsgState | null>(null);

  async function descargarPlantilla() {
    if (!token || !teamId) return;
    setExporting(true);
    try {
      const res = await fetch(`${API}/teams/${teamId}/template`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo descargar la plantilla");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function importarExcel() {
    if (!token || !teamId || !importFile) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const buf = await importFile.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      const res = await apiFetch<{
        creados: number;
        actualizados: number;
        vinculados: number;
        errores: Array<{ fila: number; motivo: string }>;
      }>(
        `/teams/${teamId}/import`,
        { method: "POST", body: JSON.stringify({ dataBase64: btoa(binary), fileName: importFile.name }) },
        token
      );
      setImportMsg({ ...res, error: undefined });
      await onRefreshPlantel();
    } catch (e) {
      setImportMsg({ creados: 0, actualizados: 0, vinculados: 0, errores: [], error: (e as Error).message });
    } finally {
      setImporting(false);
      setImportFile(null);
    }
  }

  const exportarExcel = async () => {
    if (!token || !teamId) return;
    try {
      setExporting(true);
      await downloadAuthFile(`/teams/${teamId}/export/players`, token, "equipo.xlsx");
      onToast("Jugadores exportados", "success");
    } catch (e) {
      onToast("Error al exportar: " + (e as Error).message, "error");
    } finally {
      setExporting(false);
    }
  };

  return {
    exporting,
    showImport,
    setShowImport,
    importFile,
    setImportFile,
    importing,
    importMsg,
    setImportMsg,
    descargarPlantilla,
    importarExcel,
    exportarExcel,
    setExporting,
  };
}