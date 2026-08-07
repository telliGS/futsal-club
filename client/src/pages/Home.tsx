import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface Match {
  id: string;
  dateTime: string;
  venue: string;
  rival: string;
  isHome: boolean;
  team: { name: string; tier?: string | null };
}

function formatFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Match[]>("/matches/upcoming")
      .then((m) => setMatches(m))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-b from-primary-dark to-primary px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <img
            src="/escudo-jh.png"
            alt="Escudo Club José Hernández"
            className="w-16 h-16 md:w-24 md:h-24 drop-shadow-lg"
          />
          <div>
            <p className="text-fossil font-mono text-xs uppercase tracking-widest">Club José Hernández</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
              Futsal de la ciudad
            </h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto flex gap-3 mt-5 text-sm">
          <Link to="/mi-cuota" className="bg-white text-primary-dark px-4 py-2 rounded-lg font-semibold hover:bg-primary-light transition">
            Consultar mi cuota
          </Link>
          <Link to="/ingresar" className="border border-white/30 px-4 py-2 rounded-lg hover:bg-white/10 transition">
            Área delegados
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <span className="inline-block w-2 h-6 bg-primary rounded" />
          Próximos partidos
        </h2>

        {loading && <p className="mt-6 text-white/60">Cargando partidos...</p>}
        {error && <p className="mt-6 text-red-400">No se pudieron cargar los partidos: {error}</p>}

        {!loading && !error && matches.length === 0 && (
          <p className="mt-6 text-white/60">Todavía no hay partidos cargados. Volvé pronto.</p>
        )}

        <div className="mt-6 space-y-4">
          {matches.map((m) => (
            <article key={m.id} className="rounded-xl bg-white/5 border border-white/10 p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="md:w-48">
                <p className="text-primary font-mono text-xs uppercase">{formatFecha(m.dateTime)}</p>
                <p className="text-2xl font-display font-bold">{formatHora(m.dateTime)}</p>
              </div>
              <div className="flex-1">
                <p className="font-semibold">{m.isHome ? "J.H." : m.rival} vs {m.isHome ? m.rival : "J.H."}</p>
                <p className="text-sm text-white/60">{m.team.name} · {m.venue}</p>
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/10 mt-12 py-6 text-center text-sm text-white/40">
        Club José Hernández · Futsal · {new Date().getFullYear()}
      </footer>
    </div>
  );
}