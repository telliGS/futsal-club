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
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="font-mono text-sm tracking-widest text-[#008f39] mb-3">ERROR 404</p>
        <h1 className="font-epilogue font-extrabold text-4xl md:text-5xl text-white mb-4">
          Página no encontrada
        </h1>
        <p className="text-neutral-400 max-w-md mb-8">
          La página que buscás no existe o fue movida. Volvé al inicio y seguí alentando al Verde.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full bg-[#008f39] px-8 py-3 font-semibold text-white hover:bg-[#007a31] transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </Layout>
  );
}
