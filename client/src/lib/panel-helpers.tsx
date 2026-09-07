import { IEstadoUnTipo } from "./panel-types";

export const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Rango de meses desde enero del año actual hasta enero del próximo (13 columnas)
export function monthRange(): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), i, 1); // Ene(0) -> Ene(12)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function monthShort(m: string) {
  const [, mo] = m.split("-");
  return MONTHS[Number(mo) - 1];
}

export function labelTipo(t: string): string {
  switch (t) {
    case "FICHA_MEDICA": return "Ficha médica";
    case "ELECTROCARDIOGRAMA": return "Electro";
    case "ERGONOMETRIA": return "Ergo";
    case "OTRO": return "Doc";
    default: return t;
  }
}

// ¿La categoría es de mayores (C20+, PRIMERA, 1ra, ELITE...)? — misma regla que el server
export function esCategoriaMayor(cat?: string | null): boolean {
  return /^C2[0-9]|^C9[0-9]|^PRIMERA|^1ra|^1er|ELITE|SENIOR|LIBRE|^MASC/i.test(cat ?? "");
}

// Tipos que bloquean según la categoría: mayores → ergo, menores → electro
export function tiposBloqueantes(cat?: string | null): string[] {
  return esCategoriaMayor(cat) ? ["ERGONOMETRIA"] : ["ELECTROCARDIOGRAMA"];
}

// Badge compacto del estado de un tipo de documento
export function BadgeFicha({ st }: { st: IEstadoUnTipo | undefined }) {
  if (!st) return <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-surface-2 text-white/45">—</span>;
  switch (st.estado) {
    case "VIGENTE":
      return <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-primary/20 text-primary-light">OK</span>;
    case "PROXIMO_A_VENCER":
      return <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-500/20 text-amber-300">pronto vence</span>;
    case "VENCIDO":
      return <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-red-500/20 text-red-400">vencido</span>;
    case "SIN_CARGAR":
      return <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-surface-2 text-white/45">sin cargar</span>;
  }
}

// ---------- Iconos SVG del panel (stroke, monocromo, iguales en cualquier SO) ----------
export const ICONS = {
  doc: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </>
  ),
  edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </>
  ),
  pause: (
    <>
      <rect x="7" y="4" width="3.5" height="16" rx="1" />
      <rect x="13.5" y="4" width="3.5" height="16" rx="1" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5-11-6.5Z" />,
  check: <path d="M4.5 12.5l5 5L19.5 7" />,
  nulo: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6.5 6.5l11 11" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 20h16" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  gym: (
    <>
      <path d="M2.5 17v-6.5M4 17V8M8 17v-3M5.5 9.5l6.5-4.5 6.5 4.5" />
      <path d="M12 15.5V5" />
      <path d="M9.5 17h5" />
      <path d="M20 17v-6.5M21.5 17V8" />
      <circle cx="12" cy="17" r="1" />
    </>
  ),
} as const;

export function Icon({ name, className = "w-4 h-4" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}