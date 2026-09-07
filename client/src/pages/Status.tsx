import { useState } from "react";
import { apiFetch } from "../lib/api";
import Layout from "../components/Layout";
import { cn } from "../lib/cn";
import { usePageMeta } from "../lib/usePageMeta";

interface IStatusResult {
  fullName: string;
  teams: string[];
  currentMonth: string;
  isPaid: boolean;
  pendiente: boolean;
  deudor: boolean;
  esTecnico?: boolean;
  sinCuota?: boolean;
  diasParaPagar: number;
  deadline: number;
  totalDeuda: number;
  unpaidMonths: Array<{ month: string; amount: number }>;
  lastPayment: { month: string } | null;
}

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  const names = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return `${names[Number(m)]} ${y}`;
}

export default function Status() {
  usePageMeta({
    title: "Mi Cuota",
    description: "Consultá con tu DNI si estás al día con la cuota del Club José Hernández. Estado, deuda y plazo para pagar.",
  });
  const [dni, setDni] = useState("");
  const [result, setResult] = useState<IStatusResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const r = await apiFetch<IStatusResult>(`/public/status?document=${encodeURIComponent(dni.trim())}`);
      setResult(r);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
        <div className="rounded-lg border border-outline bg-surface-1 overflow-hidden grid md:grid-cols-2 animate-fade-up">
          {/* ======== Panel izquierdo ======== */}
          <div className="relative bg-surface p-8 md:p-10 text-white overflow-hidden border-b md:border-b-0 md:border-r border-outline">
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 90% at 50% 110%, rgba(0,147,66,0.30) 0%, rgba(0,99,43,0.12) 38%, transparent 72%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute right-[-7rem] bottom-[-7rem] w-[22rem] h-[22rem] rounded-full border border-white/[0.05]"
            />
            <div
              aria-hidden="true"
              className="absolute right-[-5rem] bottom-[-5rem] w-[12rem] h-[12rem] rounded-full border border-white/[0.05]"
            />
            <div className="relative">
              <div className="flex items-center gap-3">
                <img src="/escudo-jh.png" alt="Escudo Club José Hernández" className="w-14 h-14" />
                <div>
                  <p className="font-display font-bold text-lg leading-tight">Mi cuota</p>
                  <p className="text-xs font-mono uppercase tracking-widest text-primary-light mt-0.5">
                    José Hernández Futsal
                  </p>
                </div>
              </div>

              <h2 className="font-display text-2xl md:text-3xl font-bold mt-8 leading-snug">
                ¿Estás al día con el club?
              </h2>
              <p className="text-white/80 text-sm mt-3 leading-relaxed">
                Ingresá tu DNI y mirá en segundos tu estado de cuota y si podés jugar
                este fin de semana.
              </p>

              <div className="mt-8 space-y-3 text-sm">
                <div className="flex items-center gap-3 rounded-lg bg-surface-2 border border-outline px-4 py-3">
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-primary/25 border border-primary/40 flex items-center justify-center text-primary-light">✓</span>
                  <p className="text-white/85 text-xs leading-relaxed">
                    <span className="font-semibold text-white">Al día:</span> pagaste la cuota del mes en curso.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-surface-2 border border-outline px-4 py-3">
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-amber-500/25 border border-amber-500/40 flex items-center justify-center text-amber-300">⏳</span>
                  <p className="text-white/85 text-xs leading-relaxed">
                    <span className="font-semibold text-white">En plazo:</span> la cuota tiene un día límite por jugador (por defecto el 10). Si no pagaste todavía y estás dentro de esos días, estás a tiempo.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-surface-2 border border-outline px-4 py-3">
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-red-500/25 border border-red-500/40 flex items-center justify-center text-red-300">✕</span>
                  <p className="text-white/85 text-xs leading-relaxed">
                    <span className="font-semibold text-white">Con deuda:</span> para jugar tenés que regularizar.
                  </p>
                </div>
              </div>

              {/* Frase cálida */}
              <div className="mt-8 border-t border-white/10 pt-6 text-sm text-white/50 italic">
                “La cuota es el corazón del club. Con tu aporte, seguimos creciendo.”
              </div>
            </div>
          </div>

          {/* ======== Panel derecho ======== */}
          <div className="p-8 md:p-10 flex items-center">
            <div className="w-full max-w-sm mx-auto">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary-light text-[10px] font-mono uppercase tracking-wider border border-primary/30 mb-4">
                Consulta pública
              </span>
              <h1 className="font-display text-2xl font-bold">Consultar mi cuota</h1>
              <p className="text-white/70 text-sm mt-1 mb-6">
                Solo necesitás tu DNI. Te mostramos al instante tu estado.
              </p>

              <form onSubmit={buscar} className="space-y-4">
                <div className="relative">
                  <label htmlFor="dni-input" className="sr-only">DNI</label>
                  <input
                    id="dni-input"
                    name="dni"
                    autoComplete="off"
                    inputMode="numeric"
                    aria-label="DNI para consultar cuota"
                    required
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="DNI · Ej: 12345678"
                    className="w-full pl-11 pr-4 py-3 rounded-lg bg-surface-1 border border-outline text-white placeholder-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-surface-2 transition-colors"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg">🔍</span>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn w-full bg-primary text-white hover:bg-primary-light disabled:opacity-50 text-base py-3 min-h-[44px] active:scale-[0.98]"
                >
                  {loading ? "Buscando..." : "Buscar mi estado"}
                </button>
              </form>

              {error && (
                <p role="alert" className="mt-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  {error}
                </p>
              )}

              {result && (
                <div
                  className={cn('mt-6 rounded-2xl p-6 border bg-surface-1 animate-fade-up',
                    result.esTecnico
                      ? 'border-outline'
                      : result.isPaid
                        ? 'border-primary/40'
                        : result.pendiente
                          ? 'border-amber-500/40'
                          : 'border-red-500/40'
                  )}
                >
                  {/* Badge de estado grande */}
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={cn('shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold',
                        result.esTecnico
                          ? 'bg-surface-2 text-white/70'
                          : result.isPaid
                            ? 'bg-primary/20 text-primary-light'
                            : result.pendiente
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-red-500/20 text-red-400'
                      )}
                    >
                      {result.esTecnico ? "—" : result.isPaid ? "✓" : result.pendiente ? "⏳" : "✕"}
                    </span>
                    <div>
                      <p className="font-display text-xl font-bold truncate">{result.fullName}</p>
                      <p className="text-sm text-white/70 truncate">{result.teams.join(" · ")}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    {result.esTecnico ? (
                      <div className="bg-surface-2 rounded-lg p-4 text-sm text-white/70">
                        <p className="font-semibold text-white/90">Integrante del cuerpo técnico</p>
                        <p className="mt-1 text-xs">La cuota no aplica para técnicos.</p>
                      </div>
                    ) : result.isPaid ? (
                      <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                        <p className="text-primary-light font-semibold text-lg">✅ Estás al día</p>
                        <p className="text-sm text-white/70">Cuota de {result.currentMonth} pagada</p>
                        <div className="mt-2 text-xs text-white/60 bg-surface-2 rounded-lg px-3 py-2">
                          {result.lastPayment ? (
                            <>Último pago: <span className="text-white/85 font-semibold">{monthLabel(result.lastPayment.month)}</span></>
                          ) : (
                            "Sin pagos registrados todavía"
                          )}
                        </div>
                      </div>
                    ) : result.pendiente ? (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <p className="text-amber-300 font-semibold text-lg">⏳ Todavía no pagaste</p>
                        <p className="text-sm text-white/70">Cuota de {result.currentMonth} pendiente</p>
                        <p className="mt-2 text-xs text-white/80 leading-relaxed">
                          Estás dentro del plazo (hasta el día {result.deadline}).{" "}
                          {result.diasParaPagar > 0 ? (
                            <>
                              Te quedan{" "}
                              <span className="font-semibold text-amber-300">
                                {result.diasParaPagar} {result.diasParaPagar === 1 ? "día" : "días"}
                              </span>{" "}
                              para ponerte al día.
                            </>
                          ) : (
                            <span className="font-semibold text-amber-300">Hoy es el último día del plazo.</span>
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <p className="text-red-400 font-semibold text-lg">❌ Tenés deuda</p>
                        <p className="text-sm text-white/70">No podés jugar hasta regularizar</p>
                        {result.unpaidMonths.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {result.unpaidMonths.map((u) => (
                              <li key={u.month} className="flex items-center justify-between text-sm bg-surface-2 rounded-lg px-3 py-2">
                                <span className="text-white/80">{monthLabel(u.month)}</span>
                                <span className="text-red-300 font-semibold tabular-nums">
                                  ${u.amount.toLocaleString("es-AR")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {result.totalDeuda > 0 && (
                          <p className="mt-3 text-sm font-bold text-red-300">
                            Total adeudado: ${result.totalDeuda.toLocaleString("es-AR")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {!result.esTecnico && (
                    <button
                      onClick={() => {
                        const estadoTexto = result.isPaid
                          ? "¡Estoy al día! ✅"
                          : result.pendiente
                            ? `⏳ Pendiente - me quedan ${result.diasParaPagar} ${result.diasParaPagar === 1 ? "día" : "días"} (hasta el ${result.deadline})`
                            : `❌ Con deuda - $${result.totalDeuda.toLocaleString("es-AR")} (${result.unpaidMonths.length} ${result.unpaidMonths.length === 1 ? "mes" : "meses"})`;
                        const mensaje = `Hola! Soy ${result.fullName} (${result.teams.join(", ")}) y mi cuota en el Club Social y Deportivo José Hernández está ${estadoTexto}. Consultá tu estado acá: https://jh-futsal.vercel.app/mi-cuota`;
                        if (navigator.share) {
                          navigator.share({ title: "Mi cuota - C.S.D. José Hernández", text: mensaje });
                        } else {
                          navigator.clipboard.writeText(mensaje).then(() => {
                            alert("¡Copiado al portapapeles! Compartilo con quien quieras.");
                          });
                        }
                      }}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm bg-primary/20 text-primary-light border border-primary/30 hover:bg-primary/30 transition-colors font-semibold"
                    >
                      📤 Compartir mi estado
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}