// Convierte un File a base64 con chunks de 0x8000. Es la codificación usada
// por el server para recibir archivos (documentos de jugadores e importación
// de Excel). Evita duplicar el mismo bloque en cada consumidor.
export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}