import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, setToken } from "../lib/api";

interface LoginResponse {
  token: string;
  user: { role: string };
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await apiFetch<LoginResponse>("/auth/login", {
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
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="text-sm text-white/50 hover:text-accent">← Volver</Link>
        <h1 className="font-display text-2xl font-bold mt-4">Área de delegados</h1>
        <p className="text-white/60 text-sm mt-1 mb-8">Ingresá con tu cuenta para gestionar tu equipo.</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm text-white/70">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:border-accent"
              required
            />
          </div>
          <div>
            <label className="text-sm text-white/70">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:border-accent"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-accent text-black font-semibold hover:bg-yellow-400 disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}