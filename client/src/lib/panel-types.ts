export interface Team {
  id: string;
  name: string;
  gender: string;
  type: string;
  category?: string | null;
  tier?: string | null;
}

// ---------- Fichas médicas / estudios ----------
export type EstadoFicha = "VIGENTE" | "PROXIMO_A_VENCER" | "VENCIDO" | "SIN_CARGAR";

export interface EstadoUnTipo {
  tipo: string;
  estado: EstadoFicha;
  vence?: string | null;
  hayDoc: boolean;
}

export interface FichaEstado {
  porTipo: Record<string, EstadoUnTipo>;
  aptoFichas: boolean;
  faltantes: string[];
  bloqueantes: string[];
  resumen: string;
}

export interface DocItem {
  id: string;
  tipo: string;
  descripcion?: string | null;
  fileName: string;
  mime: string;
  size: number;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  subidoPorId?: string | null;
  createdAt: string;
}

export interface Player {
  id: string;
  lastName: string;
  firstName: string;
  document: string;
  birthDate?: string | null;
  status: string;
  inactiveSince?: string | null; // hasta dónde jugó (ISO) — inactivo
  role: string;
  position?: string | null;
  jersey?: number | null;
  cuentaPresupuesto?: boolean;
  // Regla nativo/formativa: el jugador paga la cuota en este equipo (true)
  // o en su categoría formativa (false — aparece pero sin opciones de pago)
  esFormativos?: boolean;
  pagaAca?: boolean;
  categoriaPago?: string[];
  hasInsurance?: boolean;
  // Gimnasio: va al gym y paga su cuota de gym mensual. gymPrecio = costo
  // propio por mes (si es null se usa el precio global de GymConfig).
  vaAlGym?: boolean;
  gymPrecio?: number | null;
  deadline?: number; // día límite para pagar la cuota del mes (default 10)
  payments: Array<{ month: string; paid: boolean; amount: number; note?: string | null }>;
  gymPayments?: Array<{ month: string; paid: boolean; amount: number; note?: string | null }>;
  estadoCuota?: {
    deudor: boolean;
    alDia: boolean;
    pendiente: boolean;
    puedeJugar: boolean;
    mesesDebe: number;
  };
  fichas?: FichaEstado;
  apto?: { puedeJugar: boolean; razones: string[] };
}

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

export interface MeData {
  id: string;
  fullName: string;
  email: string;
  role: string;
  canChangeCredentials?: boolean;
  teams: Team[];
}

export interface DelegadoAdmin {
  id: string;
  fullName: string;
  email: string;
  role: string;
  active: boolean;
  canChangeCredentials?: boolean;
  teamAccess: Array<{ team: Team }>;
}

// ---------- Poli (cronograma de entrenamiento) ----------
export interface PoliSlot {
  id: string;
  dayOfWeek: number; // 1=lun ... 7=dom
  startTime: string;
  endTime: string;
  place: string;
  teamId: string | null;
  responsable: string | null;
  note: string | null;
  active: boolean;
  team: { id: string; name: string } | null;
}

export interface PoliBloque {
  id: string;
  tipo: "PLANTILLA" | "EXTRA";
  startTime: string;
  endTime: string;
  place: string;
  team: { id: string; name: string } | null;
  responsable?: string | null;
  note?: string | null;
  excepcion?: {
    id: string;
    canceled: boolean;
    place?: string;
    startTime?: string;
    endTime?: string;
    note?: string;
    slotId: string | null;
  } | null;
}

export interface PoliPartido {
  id: string;
  time: string;
  rival: string;
  isHome: boolean;
  venue: string;
  team: { id: string; name: string };
}

export interface PoliDia {
  fecha: string;
  dia: string;
  bloques: PoliBloque[];
  partidos: PoliPartido[];
}

export interface PoliSemana {
  from: string;
  to: string;
  semana: PoliDia[];
  hoy?: string;
}

// ---------- Presupuesto ----------
export interface GastoItem {
  id: string;
  nombre: string;
  monto: number;
  mes?: string | null;
}

export interface PresupuestoData {
  teamId: string;
  categoria: string;
  mes: string;
  jugadores: number;
  cuota: number | null;
  jugadoresExcluidos: number;
  gastosFijos: GastoItem[];
  gastosExtra: GastoItem[];
  resultado: {
    ingreso: number;
    gastos: number;
    balance: number;
    cuotaMinima: number | null;
    cuotaRecomendada: number | null;
    recomendacionSana: boolean;
  };
}

// Total del club (ADMIN): un renglón por equipo + totales
export interface TotalEquipo {
  teamId: string;
  categoria: string;
  tipo: string;
  jugadores: number;
  cuota: number;
  ingreso: number;
  gastosFijos: number;
  gastosExtra: number;
  gastos: number;
  balance: number;
  deuda: number;
}

export interface TotalPresupuesto {
  mes: string;
  porEquipo: TotalEquipo[];
  totales: {
    jugadores: number;
    ingreso: number;
    gastos: number;
    deuda: number;
    balance: number;
  };
  // Gimnasio: gasto variable por jugador que va + lo recaudado de sus cuotas
  gym: {
    precio: number;
    jugadores: number;
    gasto: number;
    recaudado: number;
    faltaCobrar: number;
  };
}

// ---------- Seguro (lista de asegurados + avisos de altas/bajas) ----------
export interface AvisoSeguro {
  id: string;
  playerId?: string | null;
  tipo: "ALTA" | "BAJA";
  document: string;
  lastName: string;
  firstName: string;
  birthDate?: string | null;
  teamId?: string | null;
  creadoPorId?: string | null;
  createdAt: string;
  resueltoAt?: string | null;
}

export interface SeguroAvisos {
  total: number;
  altas: number;
  bajas: number;
  avisos: AvisoSeguro[];
}

export interface SeguroFilaCompleta {
  document: string;
  lastName: string;
  firstName: string;
  birthDate?: string | null;
  estado: string;
  equipos: string[];
}

export interface SeguroFilaCambio {
  tipo: "ALTA" | "BAJA";
  fecha: string;
  document: string;
  lastName: string;
  firstName: string;
  birthDate?: string | null;
  equipo: string;
}

// ---------- Gimnasio (lista de los que van + avisos de altas/bajas) ----------
export interface AvisoGym {
  id: string;
  playerId?: string | null;
  tipo: "ALTA" | "BAJA";
  document: string;
  lastName: string;
  firstName: string;
  birthDate?: string | null;
  teamId?: string | null;
  creadoPorId?: string | null;
  createdAt: string;
  resueltoAt?: string | null;
}

export interface GymAvisos {
  total: number;
  altas: number;
  bajas: number;
  avisos: AvisoGym[];
}

// Una fila del export del gym (lista completa): datos del jugador + estado
// del gym del mes + estado de la cuota del mes (para saber quién debe qué).
export interface GymFilaCompleta {
  document: string;
  lastName: string;
  firstName: string;
  birthDate?: string | null;
  estado: string;
  gymEstado: "PAGO" | "DEBE" | "PENDIENTE";
  gymMonto: number;
  gymNota?: string | null;
  cuotaEstado: "AL_DIA" | "DEBE" | "PENDIENTE";
  cuotaMonto: number;
  equipos: string[];
}

export interface GymFilaCambio {
  tipo: "ALTA" | "BAJA";
  fecha: string;
  document: string;
  lastName: string;
  firstName: string;
  birthDate?: string | null;
  equipo: string;
}