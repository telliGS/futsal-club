import { Link, NavLink, useLocation } from "react-router-dom";

// Header/nav + footer comunes a todas las páginas públicas.
// Estilo mate, sin neon: fondo sólido oscuro, escudo + enlaces con
// subrayado que crece, y footer con columnas (club, accesos, categorías).
export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const esPanel = pathname.startsWith("/delegado");

  return (
    <div className="min-h-screen flex flex-col">
      {/* ============================ NAV ============================ */}
      <header className="sticky top-0 z-40 border-b border-outline bg-surface/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group" aria-label="Inicio — Club José Hernández">
            <img
              src="/escudo-jh.png"
              alt="Escudo Club José Hernández"
              className="w-10 h-10 transition-transform duration-300 ease-out-soft group-hover:scale-110 group-hover:-rotate-3"
            />
            <div className="leading-tight">
              <p className="font-display font-bold text-sm md:text-base">Club José Hernández</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">
                Futsal · Paraná
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-1 md:gap-2 text-sm" aria-label="Navegación principal">
            {!esPanel && (
              <>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `link-underline px-3 py-2 rounded-lg ${isActive ? "active text-white" : "text-white/60 hover:text-white"}`
                  }
                >
                  Inicio
                </NavLink>
                <NavLink
                  to="/mi-cuota"
                  className={({ isActive }) =>
                    `link-underline px-3 py-2 rounded-lg ${isActive ? "active text-white" : "text-white/60 hover:text-white"}`
                  }
                >
                  Mi cuota
                </NavLink>
                <NavLink
                  to="/ingresar"
                  className={({ isActive }) =>
                    `link-underline px-3 py-2 rounded-lg ${isActive ? "active text-white" : "text-white/60 hover:text-white"}`
                  }
                >
                  Delegados
                </NavLink>
              </>
            )}
            {esPanel && (
              <Link to="/" className="link-underline px-3 py-2 rounded-lg text-white/60 hover:text-white">
                ← Volver al sitio
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* =========================== CONTENIDO =========================== */}
      <main className="flex-1">{children}</main>

      {/* ============================ FOOTER ============================ */}
      <footer className="border-t border-outline mt-16 bg-surface-1">
        <div className="max-w-5xl mx-auto px-6 py-10 grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <img
                src="/escudo-jh.png"
                alt=""
                className="w-9 h-9"
              />
              <p className="font-display font-bold">Club José Hernández</p>
            </div>
            <p className="mt-3 text-sm text-white/50 leading-relaxed">
              Futsal de Paraná, Entre Ríos. Participando en la Competencia Oficial APFS
              con formativas y equipos de primera división.
            </p>
          </div>

          <div>
            <p className="font-display font-semibold text-sm uppercase tracking-wider text-white/70">
              Accesos
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li><Link className="link-underline text-white/60 hover:text-white" to="/">Inicio</Link></li>
              <li><Link className="link-underline text-white/60 hover:text-white" to="/mi-cuota">Consultar mi cuota</Link></li>
              <li><Link className="link-underline text-white/60 hover:text-white" to="/ingresar">Área de delegados</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-display font-semibold text-sm uppercase tracking-wider text-white/70">
              Categorías
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-white/50">
              <li>C11 · C13 · C15 · C17 · C20 · C20 FEM</li>
              <li>Primera Femenina · Jh C · JH NEGRO · JH ELITE</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-outline py-5 text-center text-xs text-white/30">
          <p>Club José Hernández · Futsal · Paraná, Entre Ríos · © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}