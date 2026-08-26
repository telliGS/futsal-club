import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getToken, setToken } from "../lib/api";
import Layout from "../components/Layout";

interface ILoginResponse {
  token: string;
  user: { role: string };
}

const FEATURES = [
  { icon: "📋", text: "Plantel de tu equipo" },
  { icon: "🗓️", text: "Cuotas mes a mes" },
  { icon: "📄", text: "Fichas médicas de tus jugadores" },
  { icon: "💰", text: "Presupuesto de la categoría" },
  { icon: "📥", text: "Importar plantel desde Excel" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (getToken()) navigate("/delegado", { replace: true });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await apiFetch<ILoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(r.token);
      navigate("/delegado");
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
                <img src="/escudo-jh.png" alt="" className="w-14 h-14 drop-shadow-[0_0_28px_rgba(0,255,102,0.25)]" />
                <div>
                  <p className="font-display font-bold text-lg leading-tight">Panel del club</p>
                  <p className="text-xs font-mono uppercase tracking-widest text-primary-light mt-0.5">
                    José Hernández Futsal
                  </p>
                </div>
              </div>

              <h2 className="font-display text-2xl md:text-3xl font-bold mt-8 leading-snug">
                Todo tu equipo,
                <br />
                en un solo lugar
              </h2>
              <p className="text-white/80 text-sm mt-3 leading-relaxed">
                Desde el panel de delegado gestionás el plantel, las cuotas, las
                fichas médicas y el presupuesto de tu categoría.
              </p>

              <ul className="mt-8 space-y-3">
                {FEATURES.map((f) => (
                  <li key={f.text} className="flex items-center gap-3 text-sm">
                    <span className="w-9 h-9 shrink-0 rounded-lg bg-surface-2 border border-outline flex items-center justify-center text-lg">
                      {f.icon}
                    </span>
                    <span className="text-white/80 font-medium">{f.text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 rounded-lg bg-surface-2 border border-outline px-4 py-3 text-xs text-white/70">
                <p className="font-semibold text-white/90">⚠ Solo para delegados</p>
                <p className="mt-1 text-white/70">Si no tenés cuenta, pedile al administrador del club que te la cree.</p>
              </div>
            </div>
          </div>

          {/* ======== Panel derecho ======== */}
          <div className="p-8 md:p-10 flex items-center">
            <div className="w-full max-w-sm mx-auto">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary-light text-[10px] font-mono uppercase tracking-wider border border-primary/30 mb-4">
                Ingreso
              </span>
              <h1 className="font-display text-2xl font-bold">Área de delegados</h1>
              <p className="text-white/70 text-sm mt-1 mb-6">
                Ingresá con tu cuenta para gestionar tu equipo.
              </p>

              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="text-sm text-white/80 block mb-1.5 font-medium">Email</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg">📧</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="delegado@josehernandez.futbol"
                      className="w-full pl-11 pr-4 py-3 rounded-lg bg-surface-1 border border-outline text-white placeholder-white/40 focus:outline-none focus:border-primary focus:bg-surface-2 transition-colors"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-white/80 block mb-1.5 font-medium">Contraseña</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg">🔒</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 rounded-lg bg-surface-1 border border-outline text-white placeholder-white/40 focus:outline-none focus:border-primary focus:bg-surface-2 transition-colors"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn w-full bg-primary text-white hover:bg-primary-light disabled:opacity-50 text-base py-3"
                >
                  {loading ? "Ingresando..." : "Ingresar al panel"}
                </button>
              </form>

              {/* Mensaje adicional */}
              <p className="mt-6 text-center text-xs text-white/40">
                ¿Problemas para ingresar? Contactá al administrador.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}