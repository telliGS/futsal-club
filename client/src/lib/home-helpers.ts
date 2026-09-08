// ---------- Tipos del sitio público (Home) ----------

export interface IMatch {
  id: string;
  dateTime: string;
  venue: string;
  isHome: boolean;
  rival: string;
  team: { name: string };
  clubGoals?: number | null;
  rivalGoals?: number | null;
}

export interface IEquipoPublico {
  id: string;
  name: string;
  type: string;
}

export interface IStats {
  jugadores: number;
  equipos: number;
  partidosProximos: number;
}

export type MatchEstado = "proximo" | "en_curso" | "terminado";

export const EN_CURSO_WINDOW_MS = 90 * 60_000; // 1:30h = duración aprox. de un partido de futsal

export function estadoPartido(m: IMatch, ahora: number = Date.now()): MatchEstado {
  const inicio = new Date(m.dateTime).getTime();
  if (ahora < inicio) return "proximo";
  if (ahora - inicio < EN_CURSO_WINDOW_MS) return "en_curso";
  return "terminado";
}

// El server guarda instantes absolutos en UTC. La hora del evento se muestra
// en hora de Argentina (UTC-3, sin DST) calculada directamente sobre UTC,
// sin re-format por zona local del navegador (evita doble conversión).
export function formatHora(iso: string): string {
  const d = new Date(iso);
  const hora = (d.getUTCHours() - 3 + 24) % 24;
  const min = d.getUTCMinutes();
  return `${String(hora).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function formatDia(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { weekday: "long" });
}

export function formatFechaLegible(iso: string) {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  return `${dia} de ${d.getUTCFullYear()}`;
}

export function diaKeyLocal(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function colorEquipo(tipo: string): string {
  return tipo === "FORMATIVA"
    ? "bg-primary/15 text-primary-light border-primary/30"
    : "bg-white/10 text-white/60 border-white/20";
}