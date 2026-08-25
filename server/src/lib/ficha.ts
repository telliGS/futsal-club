// ============================================================
// Lógica central de ficha médica / estudios (fuente de verdad)
// ------------------------------------------------------------
// La web SOLO compara fechas contra hoy:
//   - SIN_CARGAR        → no se subió ningún documento del tipo
//   - VIGENTE           → vence en el futuro (más allá del aviso)
//   - PROXIMO_A_VENCER  → vence dentro de <= DIAS_AVISO días
//   - VENCIDO           → vence hoy o antes
//
// REGLA DEL CLUB POR CATEGORÍA:
//   - Mayores (C20 en adelante, PRIMERA, 1ra, ELITE...):
//       exigen ERGOMETRÍA para jugar (bloquea apto).
//       NO tienen electro (no bloquea ni se exige).
//   - Menores (C19 para abajo: C11, C13, C15, C17...):
//       exigen ELECTROCARDIOGRAMA para jugar (bloquea apto).
//       NO tienen ergo (no bloquea ni se exige).
//   - Un jugador en varias categorías: manda la categoría MENOR
//     (ej. C17 + C20 → solo electro).
//   - FICHA_MEDICA: vence a los 2 años de la emisión.
//   - OTRO: solo referencia, nunca bloquean.
// VENCIMIENTO (siempre automático, sin depender de categoría):
//   - ERGONOMETRIA → emisión + 2 años
//   - ELECTROCARDIOGRAMA → emisión + 1 año
//   - FICHA_MEDICA / OTRO → sin vencimiento (referencia permanente)
// ============================================================

export const DIAS_AVISO = 30; // días de anticipación para "PRÓXIMO A VENCER"

export type TipoDocumento = "FICHA_MEDICA" | "ELECTROCARDIOGRAMA" | "ERGONOMETRIA" | "OTRO";
export const TIPOS_DOCUMENTO = ["FICHA_MEDICA", "ELECTROCARDIOGRAMA", "ERGONOMETRIA", "OTRO"] as const;
export const MAX_DOC_BYTES = 2 * 1024 * 1024; // 2 MB

// Vigencia por tipo desde la fecha de emisión:
//   - Ficha médica: 2 años
//   - Ergo: 2 años
//   - Electro: 1 año
//   - OTRO: sin vencimiento (referencia)
export const VIGENCIA_EMISION: Partial<Record<TipoDocumento, number>> = {
  FICHA_MEDICA: 2, // años
  ERGONOMETRIA: 2, // años
  ELECTROCARDIOGRAMA: 1, // año
};

/** ¿La categoría es de mayores (C20+, PRIMERA, 1ra, ELITE...)? */
export function esCategoriaMayor(categoria: string | null | undefined): boolean {
  return /^C2[0-9]|^C9[0-9]|^PRIMERA|^1ra|^1er|ELITE|SENIOR|LIBRE|^MASC/i.test(categoria ?? "");
}

/**
 * Tipos de documento que BLOQUEAN según la categoría:
 * mayores → ergo; menores → electro.
 */
export function tiposBloqueantes(categoria: string | null | undefined): TipoDocumento[] {
  return esCategoriaMayor(categoria) ? ["ERGONOMETRIA"] : ["ELECTROCARDIOGRAMA"];
}

/**
 * Bloqueantes para un jugador que juega en varias categorías.
 * REGLA DEL CLUB: manda la categoría MENOR del jugador.
 * Si está en cualquier categoría de menores (C17 o abajo) → exige
 * electro; solo si TODAS sus categorías son de mayores (C20+, PRIMERA)
 * → exige ergo. (Ej: C17 + C20 → solo electro.)
 */
export function tiposBloqueantesMulti(categorias: Array<string | null | undefined>): TipoDocumento[] {
  const hayCategoriaMenor = categorias.some((c) => c && !esCategoriaMayor(c));
  return hayCategoriaMenor ? ["ELECTROCARDIOGRAMA"] : ["ERGONOMETRIA"];
}

/** Suma años sin tocar el día/mes (28/06/2026 +2 → 28/06/2028). */
export function sumarAños(d: Date, años: number): Date {
  const out = new Date(d);
  out.setFullYear(out.getFullYear() + años);
  // setFullYear con día 29 de febrero en año no bisiesto salta al 1/03; lo corregimos:
  if (d.getMonth() !== out.getMonth()) out.setDate(0);
  return out;
}

/**
 * Calcula el vencimiento automático según la regla del club.
 * ERGO → emisión + 2 años; ELECTRO → emisión + 1 año.
 * Se aplica SIEMPRE que haya fecha de emisión, sin depender de la categoría.
 * Devuelve null si no aplica (tipo sin regla o falta la fecha de emisión).
 */
export function vencimientoPorRegla(
  tipo: TipoDocumento,
  fechaEmision: Date | null,
  _categoria?: string | null | undefined
): Date | null {
  if (!fechaEmision) return null;
  const vigencia = VIGENCIA_EMISION[tipo];
  if (!vigencia) return null;
  return sumarAños(fechaEmision, vigencia);
}

export type EstadoFicha = "VIGENTE" | "PROXIMO_A_VENCER" | "VENCIDO" | "SIN_CARGAR";

export interface IDocumentoFicha {
  tipo: TipoDocumento | string;
  fechaVencimiento?: Date | string | null;
}

/** Estado de un tipo de documento según su vencimiento frente al día de hoy. */
export function estadoDocumento(doc: IDocumentoFicha | undefined, now: Date): EstadoFicha {
  if (!doc) return "SIN_CARGAR";
  const vence = doc.fechaVencimiento ? new Date(doc.fechaVencimiento) : null;
  if (!vence) return "VIGENTE"; // sin fecha = referencia permanente
  const faltanDias = (vence.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (faltanDias <= 0) return "VENCIDO";
  if (faltanDias <= DIAS_AVISO) return "PROXIMO_A_VENCER";
  return "VIGENTE";
}

/** Etiqueta legible para el tipo de documento. */
export function labelTipo(t: string): string {
  switch (t) {
    case "FICHA_MEDICA": return "Ficha médica";
    case "ELECTROCARDIOGRAMA": return "Electro";
    case "ERGONOMETRIA": return "Ergo";
    case "OTRO": return "Documento";
    default: return "Documento";
  }
}

export interface IEstadoUnTipo {
  tipo: TipoDocumento;
  estado: EstadoFicha;
  vence?: string | null; // ISO de la fecha que manda
  hayDoc: boolean;
}

export interface IEstadoDocumentos {
  porTipo: Record<TipoDocumento, IEstadoUnTipo>;
  /** true si todos los bloqueantes de la categoría están en orden */
  aptoFichas: boolean;
  /** bloqueantes en falta: VENCIDO o SIN_CARGAR (según categoría) */
  faltantes: TipoDocumento[];
  /** tipos que bloquean según la categoría */
  bloqueantes: TipoDocumento[];
  /** resumen legible, ej: "Electro vencido" */
  resumen: string;
}

/**
 * Calcula el estado completo de documentos de un jugador.
 * docs: mínimo {tipo, fechaVencimiento}. Por tipo se toma el
 * documento con la fecha de vencimiento más lejana (el vigente).
 * categoria define qué tipos bloquean (mayores → ergo, menores → electro).
 */
export function calcularDocumentos(
  docs: IDocumentoFicha[],
  now = new Date(),
  categoria?: string | Array<string | null | undefined> | null
): IEstadoDocumentos {
  const porTipo: Record<TipoDocumento, IEstadoUnTipo> = {} as Record<TipoDocumento, IEstadoUnTipo>;

  for (const t of TIPOS_DOCUMENTO) {
    const delTipo = docs.filter((d) => d.tipo === t);
    let vigente: IDocumentoFicha | undefined;
    if (delTipo.length > 0) {
      // la fecha más lejana manda (renovaciones); sin fecha → último subido
      vigente = [...delTipo].sort((a, b) => {
        const fa = a.fechaVencimiento ? new Date(a.fechaVencimiento).getTime() : -Infinity;
        const fb = b.fechaVencimiento ? new Date(b.fechaVencimiento).getTime() : -Infinity;
        return fb - fa;
      })[0];
    }
    const estado = estadoDocumento(vigente, now);
    porTipo[t] = {
      tipo: t,
      estado,
      vence: vigente?.fechaVencimiento ? new Date(vigente.fechaVencimiento).toISOString() : null,
      hayDoc: !!vigente,
    };
  }

  const bloqueantes = Array.isArray(categoria)
    ? tiposBloqueantesMulti(categoria)
    : tiposBloqueantes(categoria);
  const resumen: string[] = [];
  const faltantes: TipoDocumento[] = [];
  for (const t of TIPOS_DOCUMENTO) {
    const st = porTipo[t].estado;
    if (st === "VENCIDO" && bloqueantes.includes(t)) resumen.push(`${labelTipo(t)} vencido`);
    else if (st === "PROXIMO_A_VENCER" && bloqueantes.includes(t)) resumen.push(`${labelTipo(t)} por vencer`);
    else if (st === "SIN_CARGAR" && bloqueantes.includes(t)) resumen.push(`sin ${labelTipo(t)}`);
    if (bloqueantes.includes(t) && (st === "VENCIDO" || st === "SIN_CARGAR")) {
      faltantes.push(t);
    }
  }

  return {
    porTipo,
    aptoFichas: faltantes.length === 0,
    faltantes,
    bloqueantes,
    resumen: resumen.length > 0 ? resumen.join(" · ") : "Documentación al día",
  };
}

/**
 * Apto general = cuota al día Y documentos bloqueantes de su categoría en orden.
 * Recomendado para badges y endpoint público.
 */
export function aptoParaJugar(
  cuotaPuedeJugar: boolean,
  docs: IEstadoDocumentos,
): { puedeJugar: boolean; razones: string[] } {
  const razones: string[] = [];
  if (!cuotaPuedeJugar) razones.push("cuota adeudada");
  for (const t of docs.bloqueantes) {
    const st = docs.porTipo[t].estado;
    if (st === "VENCIDO") razones.push(`${labelTipo(t)} vencido`);
    else if (st === "SIN_CARGAR") razones.push(`sin ${labelTipo(t)}`);
  }
  return { puedeJugar: razones.length === 0, razones };
}