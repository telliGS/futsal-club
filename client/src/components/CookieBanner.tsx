import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const KEY = "jh-cookie-consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (!v) setVisible(true);
    } catch {
      // si no hay localStorage, no mostrar para no romper
    }
  }, []);

  function aceptar() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-3 md:p-4">
      <div className="max-w-5xl mx-auto rounded-xl border border-outline bg-surface-2/95 backdrop-blur-md shadow-2xl px-4 py-4 md:py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <p className="text-sm text-white/80 leading-relaxed">
          Usamos cookies técnicas y Vercel Analytics anónimo para mejorar el sitio.{" "}
          <Link to="/privacidad" className="text-primary-light hover:underline underline-offset-2">
            Más info
          </Link>
          .
        </p>
        <button
          onClick={aceptar}
          className="shrink-0 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-light transition-colors"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
