import { Link, NavLink, useLocation } from "react-router-dom";
import CookieBanner from "./CookieBanner";

// Header/nav + footer comunes a todas las páginas públicas.
export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const esPanel = pathname.startsWith("/delegado");

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg">Saltar al contenido</a>
      {/* ============================ NAV ============================ */}
      <header className="sticky top-0 z-40 border-b border-outline bg-surface/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group" aria-label="Inicio — C.S. y D. José Hernández">
            <img
              src="/escudo-jh.png"
              alt="Escudo Club Social y Deportivo José Hernández"
              className="w-10 h-10 transition-transform duration-300 ease-out-soft group-hover:scale-110 group-hover:-rotate-3"
            />
            <div className="leading-tight hidden sm:block">
              <p className="font-display font-bold text-sm md:text-base whitespace-nowrap">C.S. y D. José Hernández</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">
                Futsal de Paraná
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-1 md:gap-2 text-xs sm:text-sm" aria-label="Navegación principal">
            {!esPanel && (
              <>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `link-underline px-1.5 sm:px-3 py-2 rounded-lg ${isActive ? "active text-white" : "text-white/60 hover:text-white"}`
                  }
                >
                  Inicio
                </NavLink>
                <NavLink
                  to="/mi-cuota"
                  className={({ isActive }) =>
                    `link-underline px-1.5 sm:px-3 py-2 rounded-lg ${isActive ? "active text-white" : "text-white/60 hover:text-white"}`
                  }
                >
                  Mi cuota
                </NavLink>
                <NavLink
                  to="/cronograma"
                  className={({ isActive }) =>
                    `link-underline px-1.5 sm:px-3 py-2 rounded-lg ${isActive ? "active text-white" : "text-white/60 hover:text-white"}`
                  }
                >
                  Cronograma
                </NavLink>
                <NavLink
                  to="/historia"
                  className={({ isActive }) =>
                    `link-underline px-1.5 sm:px-3 py-2 rounded-lg ${isActive ? "active text-white" : "text-white/60 hover:text-white"}`
                  }
                >
                  Historia
                </NavLink>
                <NavLink
                  to="/ingresar"
                  className={({ isActive }) =>
                    `link-underline px-1.5 sm:px-3 py-2 rounded-lg ${isActive ? "active text-white" : "text-white/60 hover:text-white"}`
                  }
                >
                  Delegados
                </NavLink>
              </>
            )}
            {esPanel && (
              <Link to="/" className="link-underline px-1.5 sm:px-3 py-2 rounded-lg text-white/60 hover:text-white">
                ← Volver al sitio
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* =========================== CONTENIDO =========================== */}
      <main id="main-content" className="flex-1">{children}</main>

      {/* ============================ FOOTER ============================ */}
      <footer className="border-t border-outline mt-16 bg-surface-1">
        <div className="max-w-5xl mx-auto px-6 py-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Columna 1: Club */}
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/escudo-jh.png" alt="Escudo Club Social y Deportivo José Hernández" className="w-9 h-9" />
              <p className="font-display font-bold leading-tight">Club Social y<br />Deportivo José Hernández</p>
            </div>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Futsal de Paraná, Entre Ríos. Participando en la Competencia Oficial APFS
              con formativas y equipos de primera división.
            </p>
          </div>

          {/* Columna 2: Accesos */}
          <div>
            <p className="font-display font-semibold text-sm uppercase tracking-wider text-white/70">
              Accesos
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li><Link className="link-underline text-white/60 hover:text-white" to="/">Inicio</Link></li>
              <li><Link className="link-underline text-white/60 hover:text-white" to="/mi-cuota">Consultar mi cuota</Link></li>
              <li><Link className="link-underline text-white/60 hover:text-white" to="/cronograma">Cronograma de entrenamiento</Link></li>
              <li><Link className="link-underline text-white/60 hover:text-white" to="/historia">Nuestra historia</Link></li>
              <li><Link className="link-underline text-white/60 hover:text-white" to="/ingresar">Área de delegados</Link></li>
            </ul>
          </div>

          {/* Columna 3: Categorías */}
          <div>
            <p className="font-display font-semibold text-sm uppercase tracking-wider text-white/70">
              Categorías
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-white/60">
              <li>C11 · C13 · C15 · C17 · C20 · C20 FEM</li>
              <li>Primera Femenina · Jh C · JH NEGRO · JH ELITE</li>
            </ul>
          </div>

          {/* Columna 4: Legal + Redes */}
          <div>
            <p className="font-display font-semibold text-sm uppercase tracking-wider text-white/70">
              Legal
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li><Link className="link-underline text-white/60 hover:text-white" to="/privacidad">Privacidad</Link></li>
              <li><Link className="link-underline text-white/60 hover:text-white" to="/terminos">Términos</Link></li>
              <li><a className="link-underline text-white/60 hover:text-white" href="mailto:contacto@josehernandez.futbol">contacto@josehernandez.futbol</a></li>
            </ul>
            <p className="font-display font-semibold text-sm uppercase tracking-wider text-white/70 mt-6">
              Seguinos
            </p>
            <div className="mt-3 flex gap-4">
              <a
                href="https://www.instagram.com/josehernandezfs/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-primary-light transition-colors text-2xl"
                aria-label="Instagram"
              >
                📸
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=100006680010803"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-primary-light transition-colors text-2xl"
                aria-label="Facebook"
              >
                👍
              </a>
            </div>
            <p className="mt-2 text-xs text-white/40">
              Seguinos para enterarte de todo
            </p>
          </div>
        </div>

        {/* Línea inferior con "Desde 2010" */}
        <div className="border-t border-outline py-5 text-center text-xs leading-relaxed text-white/50">
          <p>Club Social y Deportivo José Hernández · Futsal · Paraná, Entre Ríos · <span className="text-primary-light font-semibold">Desde 2010</span> · © {new Date().getFullYear()}</p>
        </div>
      </footer>
      <CookieBanner />
    </div>
  );
}