import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { usePageMeta } from "../lib/usePageMeta";

export default function NotFound() {
  usePageMeta({
    title: "Página no encontrada",
    description: "La página que buscás no existe. Volvé al inicio del Club José Hernández.",
  });
  return (
    <Layout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-up">
        <p className="font-mono text-sm tracking-widest text-primary-light mb-3">ERROR 404</p>
        <h1 className="font-display text-4xl md:text-5xl text-white font-bold mb-4">
          Página no encontrada
        </h1>
        <p className="text-white/60 max-w-md mb-8">
          La página que buscás no existe o fue movida. Volvé al inicio y seguí alentando al Verde.
        </p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          Volver al inicio
          <span aria-hidden>→</span>
        </Link>
      </div>
    </Layout>
  );
}