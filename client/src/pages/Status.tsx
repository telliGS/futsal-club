import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface StatusResult {
  fullName: string;
  teams: string[];
  currentMonth: string;
  isPaid: boolean;
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <Link to="/" className="self-start text-sm text-white/50 hover:text-white mb-6">← Volver al inicio</Link>

      <h1 className="font-display text-3xl font-bold text-center">Consulta tu cuota</h1>
      <p className="text-white/60 mt-2 text-center max-w-sm">
        Ingresá tu DNI y te mostramos si estás al día con el club.
      </p>

      <form onSubmit={buscar} className="mt-8 flex gap-3 w-full max-w-sm">
        <input
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          placeholder="Ej: 42206899"
          inputMode="numeric"
          className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:border-accent text-lg"
        />
        <button type="submit" disabled={loading} className="px-5 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-light disabled:opacity-50">
          Buscar
        </button>
      </form>

      {error && <p className="mt-6 text-red-400 text-center">{error}</p>}

      {result && (
        <div className={`mt-8 w-full max-w-md rounded-2xl p-6 border ${result.isPaid ? "bg-green-950/60 border-green-500/40" : "bg-red-950/60 border-red-500/40"}`}>
          <p className="font-display text-2xl font-bold">{result.fullName}</p>
          <p className="text-sm text-white/60 mb-4">{result.teams.join(" · ")}</p>

          {result.isPaid ? (
            <div>
              <p className="text-green-400 font-semibold text-xl">✓ Estás al día ({result.currentMonth})</p>
              {result.lastPayment && (
                <p className="text-sm text-white/60 mt-2">
                  Último pago registrado: {result.lastPayment.month}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-red-400 font-semibold text-xl">✗ Tenés deuda registrada</p>
              {result.unpaidMonths.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-white/80">
                  {result.unpaidMonths.map((u) => (
                    <li key={u.month}>
                      {monthLabel(u.month)} · ${u.amount.toLocaleString("es-AR")}
                    </li>
                  ))}
                </ul>
              )}
              {result.totalDeuda > 0 && (
                <p className="mt-3 font-semibold text-red-300">
                  Total: ${result.totalDeuda.toLocaleString("es-AR")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}