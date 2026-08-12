import { useState } from "react";
import { apiFetch } from "../lib/api";
import Layout from "../components/Layout";

interface StatusResult {
  fullName: string;
  teams: string[];
  currentMonth: string;
  isPaid: boolean;
  pendiente: boolean;
  deudor: boolean;
  esTecnico?: boolean;
  sinCuota?: boolean;
  diasParaPagar: number;
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
  const [dni, setDni] = useState("");
  const [result, setResult] = useState<StatusResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const r = await apiFetch<StatusResult>(`/public/status?document=${encodeURIComponent(dni.trim())}`);
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
          {/* ======== Panel de marca (izquierda) — noche de estadio ======== */}
          <div className="relative bg-surface p-8 md:p-10 text-white overflow-hidden border-b md:border-b-0 md:border-r border-outline">
            {/* Luz del estadio subiendo desde el piso */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 90% at 50% 110%, rgba(0,147,66,0.30) 0%, rgba(0,99,43,0.12) 38%, transparent 72%)",
              }}
            />
            {/* Círculo central de la cancha, tenue */}
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
                <img src="/escudo-jh.png" alt="" className="w-14 h-14 drop-shadow-[0_0_28px_rgba(0,255,102,0.25)]" />
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
              <p className="text-white/70 text-sm mt-3 leading-relaxed">
                Ingresá tu DNI y mirá en segundos tu estado de cuota y si podés jugar
                este fin de semana.
              </p>

              {/* Regla de pago explicada */}
              <div className="mt-8 space-y-3 text-sm">
                <div className="flex items-center gap-3 rounded-lg bg-surface-2 border border-outline px-4 py-3">
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-green-500/25 border border-green-500/40 flex items-center justify-center text-green-300">✓</span>
                  <p className="text-white/85 text-xs leading-relaxed">
                    <span className="font-semibold text-white">Al día:</span> pagaste la cuota del mes en curso.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-surface-2 border border-outline px-4 py-3">
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-amber-500/25 border border-amber-500/40 flex items-center justify-center text-amber-300">⏳</span>
                  <p className="text-white/85 text-xs leading-relaxed">
                    <span className="font-semibold text-white">En plazo:</span> la cuota se paga del 1 al 10. Si no pagaste todavía y estamos dentro de esos días, estás a tiempo.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-surface-2 border border-outline px-4 py-3">
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-red-500/25 border border-red-500/40 flex items-center justify-center text-red-300">✕</span>
                  <p className="text-white/85 text-xs leading-relaxed">
                    <span className="font-semibold text-white">Con deuda:</span> para jugar tenés que regularizar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ======== Consulta (derecha) ======== */}
          <div className="p-8 md:p-10 flex items-center">
            <div className="w-full max-w-sm mx-auto">
              <p className="text-xs font-mono uppercase tracking-widest text-white/40">Consulta pública</p>
              <h1 className="font-display text-2xl font-bold mt-1">Consultar mi cuota</h1>
              <p className="text-white/60 text-sm mt-1 mb-6">
                Solo necesitás tu DNI.
              </p>

              <form onSubmit={buscar} className="space-y-3">
                <input
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="DNI · Ej: 42206899"
                  inputMode="numeric"
                  className="w-full px-4 py-3 rounded-lg bg-surface-1 border border-outline text-white placeholder-white/30
                             focus:outline-none focus:border-primary focus:bg-surface-2"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn w-full bg-primary text-white hover:bg-primary-light disabled:opacity-50"
                >
                  {loading ? "Buscando..." : "Buscar mi estado"}
                </button>
              </form>

              {error && (
                <p className="mt-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  {error}
                </p>
              )}

              {result && (
                <div
                  className={`mt-6 rounded-2xl p-6 border bg-surface-1 animate-fade-up ${
                    result.esTecnico
                      ? "border-outline"
                      : result.isPaid
                        ? "border-green-500/40"
                        : result.pendiente
                          ? "border-amber-500/40"
                          : "border-red-500/40"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold ${
                        result.esTecnico
                          ? "bg-surface-2 text-white/70"
                          : result.isPaid
                            ? "bg-green-500/20 text-green-400"
                            : result.pendiente
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {result.esTecnico ? "—" : result.isPaid ? "✓" : result.pendiente ? "⏳" : "✕"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-xl font-bold truncate">{result.fullName}</p>
                      <p className="text-sm text-white/60 truncate">{result.teams.join(" · ")}</p>
                    </div>
                  </div>

                  <div className="mt-5">
                    {result.esTecnico ? (
                      <div>
                        <p className="text-white/80 font-semibold">Integrante del cuerpo técnico</p>
                        <p className="mt-2 text-xs text-white/60 leading-relaxed">
                          Estás registrado en {result.teams.join(" · ")} como técnico, no como jugador.
                          La cuota no aplica para el cuerpo técnico, así que no tenés deuda ni estado de pago.
                        </p>
                      </div>
                    ) : result.isPaid ? (
                      <div>
                        <p className="text-green-400 font-semibold">Estás al día ({result.currentMonth})</p>
                        <div className="mt-3 text-xs text-white/60 bg-surface-2 rounded-lg px-3 py-2.5">
                          {result.lastPayment ? (
                            <>Último pago registrado: <span className="text-white/85 font-semibold">{monthLabel(result.lastPayment.month)}</span></>
                          ) : (
                            "Sin pagos registrados todavía"
                          )}
                        </div>
                      </div>
                    ) : result.pendiente ? (
                      <div>
                        <p className="text-amber-300 font-semibold">
                          Todavía no pagaste {result.currentMonth}
                        </p>
                        <p className="mt-2 text-xs text-white/70 leading-relaxed">
                          Estás dentro del plazo (1 al 10).{" "}
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
                      <div>
                        <p className="text-red-400 font-semibold">Tenés deuda registrada</p>
                        {result.unpaidMonths.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {result.unpaidMonths.map((u) => (
                              <li
                                key={u.month}
                                className="flex items-center justify-between text-sm bg-surface-2 rounded-lg px-3 py-2"
                              >
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
                            Total: ${result.totalDeuda.toLocaleString("es-AR")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 🟢 BOTÓN COMPARTIR - NUEVO */}
                  {!result.esTecnico && (
                    <button
                      onClick={() => {
                        const estado = result.isPaid
                          ? "✅ Al día"
                          : result.pendiente
                            ? "⏳ Pendiente"
                            : "❌ Con deuda";
                        const mensaje = `Mi estado de cuota en JH Futsal: ${estado}. Consultalo acá: ${window.location.origin}/mi-cuota`;
                        if (navigator.share) {
                          navigator.share({
                            title: "Mi cuota en JH Futsal",
                            text: mensaje,
                          });
                        } else {
                          navigator.clipboard.writeText(mensaje).then(() => {
                            alert("¡Copiado al portapapeles! Compartilo con quien quieras.");
                          });
                        }
                      }}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm bg-surface-2 border border-outline text-white/70 hover:text-white hover:border-primary/40 transition-colors"
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