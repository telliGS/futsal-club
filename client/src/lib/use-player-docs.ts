import { Dispatch, SetStateAction, useState } from "react";
import { API, apiFetch } from "./api";
import { IDocItem, IFichaEstado, IPlayer } from "./panel-types";
import type { DocFormState } from "../components/panel/FichasModal";

const emptyDocForm = (): DocFormState => ({
  tipo: "FICHA_MEDICA",
  descripcion: "",
  fechaEmision: "",
  file: null,
});

/**
 * Fichas / documentos médicos de un jugador: abrir, subir, descargar y borrar.
 * Tras borrar un doc refresca el estado del jugador en la tabla del plantel
 * (por eso recibe `onPlayersChange`).
 */
export function usePlayerDocs(
  token: string | null,
  teamId: string,
  categoriaActual: string | null,
  onPlayersChange: Dispatch<SetStateAction<IPlayer[]>>
) {
  const [docsPlayer, setdocsPlayer] = useState<IPlayer | null>(null);
  const [docsList, setDocsList] = useState<IDocItem[]>([]);
  const [docsEstado, setDocsEstado] = useState<IFichaEstado | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsMsg, setDocsMsg] = useState("");
  const [docForm, setDocForm] = useState<DocFormState>(emptyDocForm());

  async function openDocs(p: IPlayer) {
    if (!token) return;
    setdocsPlayer(p);
    setDocsMsg("");
    setDocForm(emptyDocForm());
    setDocsLoading(true);
    try {
      const res = await apiFetch<{ documentos: IDocItem[]; estado: IFichaEstado }>(
        `/players/${p.id}/documents`, {}, token
      );
      setDocsList(res.documentos);
      setDocsEstado(res.estado);
    } catch (e) {
      setDocsMsg((e as Error).message);
    } finally {
      setDocsLoading(false);
    }
  }

  async function subirDoc() {
    if (!token || !docsPlayer || !docForm.file) {
      setDocsMsg("Elegí un archivo para subir.");
      return;
    }
    if (docForm.file.size > 2 * 1024 * 1024) {
      setDocsMsg("El archivo supera los 2 MB.");
      return;
    }
    setDocsLoading(true);
    setDocsMsg("");
    try {
      const buf = await docForm.file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      const b64 = btoa(binary);
      const res = await apiFetch<{ documento: IDocItem; estado: IFichaEstado }>(
        `/players/${docsPlayer.id}/documents`,
        {
          method: "POST",
          body: JSON.stringify({
            tipo: docForm.tipo,
            descripcion: docForm.descripcion.trim() || null,
            fileName: docForm.file.name,
            mime: docForm.file.type || "application/octet-stream",
            dataBase64: b64,
            fechaEmision: docForm.fechaEmision ? new Date(docForm.fechaEmision).toISOString() : null,
            categoria: categoriaActual,
          }),
        },
        token
      );
      setDocsList((prev) => [res.documento, ...prev]);
      setDocsEstado(res.estado);
      setDocForm(emptyDocForm());
      setDocsMsg("Documento subido ✓");
    } catch (e) {
      setDocsMsg((e as Error).message);
    } finally {
      setDocsLoading(false);
    }
  }

  async function borrarDoc(doc: IDocItem) {
    if (!token || !docsPlayer) return;
    const ok = window.confirm(`¿Eliminar "${doc.fileName}"?`);
    if (!ok) return;
    try {
      await apiFetch(`/players/${docsPlayer.id}/documents/${doc.id}`, { method: "DELETE" }, token);
      setDocsList((prev) => prev.filter((d) => d.id !== doc.id));
      const res = await apiFetch<{ estado: IFichaEstado }>(
        `/players/${docsPlayer.id}/documents`, {}, token
      );
      setDocsEstado(res.estado);
      // Refrescar el estado del jugador en la tabla
      try {
        const updated = await apiFetch<IPlayer[]>(`/teams/${teamId}/players`, {}, token);
        onPlayersChange(updated);
      } catch { /* noop */ }
    } catch (e) {
      setDocsMsg((e as Error).message);
    }
  }

  async function descargarDoc(doc: IDocItem) {
    if (!token || !docsPlayer) return;
    try {
      const res = await fetch(`${API}/players/${docsPlayer.id}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("No se pudo descargar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDocsMsg((e as Error).message);
    }
  }

  return {
    docsPlayer,
    setdocsPlayer,
    docsList,
    docsEstado,
    docsLoading,
    docsMsg,
    docForm,
    setDocForm,
    openDocs,
    subirDoc,
    borrarDoc,
    descargarDoc,
  };
}