import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

// Header/nav + footer comunes a todas las páginas públicas.
export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const esPanel = pathname.startsWith("/delegado");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Focus trap para el drawer
  useEffect(() => {
    if (!drawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const navLinks = [
    { to: "/", label: "Inicio", end: true },
    { to: "/mi-cuota", label: "Mi cuota", end: false },
    { to: "/cronograma", label: "Cronograma", end: false },
    { to: "/ingresar", label: "Delegados", end: false },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip link para accesibilidad */}
      <a href="#main" className="skip-link">
        Saltar al contenido principal
      </a>

      {/* ============================ NAV ============================ */}
      <header className="sticky top-0 z-40 border-b border-outline bg-surface/95 backdrop-blur-md pt-safe">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group" aria-label="Inicio — Club José Hernández">
            <img
              src="/escudo-jh.png"
              alt="Escudo Club José Hernández"
              className="w-8 h-8 md:w-10 md:h-10 transition-transform duration-300 ease-out-soft group-hover:scale-110 group-hover:-rotate-3"
            />
            <div className="leading-tight hidden sm:block">
              <p className="font-display font-bold text-sm md:text-base">Club José Hernández</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">
                Futsal · Paraná
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-1 md:gap-2 text-sm" aria-label="Navegación principal">
            {!esPanel && (
              <>
                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-1">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) =>
                        `link-underline px-3 py-2.5 rounded-lg touch-target ${isActive ? "active text-white" : "text-white/60 hover:text-white"}`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>

                {/* Mobile hamburger */}
                <button
                  className="md:hidden touch-target p-2 rounded-lg bg-surface-1 border border-outline text-white/80 hover:bg-surface-2"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Abrir menú"
                  aria-expanded={drawerOpen}
                  aria-controls="mobile-drawer"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              </>
            )}
            {esPanel && (
              <Link to="/" className="link-underline px-3 py-2.5 rounded-lg touch-target text-white/60 hover:text-white">
                ← Volver al sitio
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Mobile Drawer */}
      {!esPanel && drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            id="mobile-drawer"
            className="fixed inset-y-0 right-0 z-50 w-[85vw] max-w-sm bg-surface-1 border-l border-outline transform transition-transform duration-300 ease-out-soft translate-x-0 pt-safe pb-safe"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <div className="flex flex-col h-full">
              {/* Drawer header */}
              <div className="flex items-center justify-between p-4 border-b border-outline">
                <div className="flex items-center gap-3">
                  <img src="/escudo-jh.png" alt="" className="w-10 h-10" />
                  <div>
                    <p className="font-display font-bold text-lg">Club José Hernández</p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">
                      Futsal · Paraná
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="touch-target p-2 rounded-lg bg-surface-2 border border-outline text-white/80 hover:bg-surface-1"
                  aria-label="Cerrar menú"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Drawer nav links */}
              <nav className="flex-1 overflow-y-auto p-4 space-y-2" aria-label="Navegación principal">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg touch-target border transition-colors ${isActive ? "bg-primary/20 border-primary/40 text-white" : "border-outline text-white/80 hover:bg-surface-2 hover:border-primary/30 hover:text-white"}`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>

              {/* Drawer footer - redes sociales */}
              <div className="p-4 border-t border-outline">
                <p className="font-display font-semibold text-sm uppercase tracking-wider text-white/70 mb-3">
                  Seguinos
                </p>
                <div className="flex gap-4">
                  <a
                    href="https://www.instagram.com/josehernandezfs/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="touch-target text-white/60 hover:text-primary-light transition-colors text-2xl"
                    aria-label="Instagram"
                  >
                    📸
                  </a>
                  <a
                    href="https://www.facebook.com/profile.php?id=100006680010803"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="touch-target text-white/60 hover:text-primary-light transition-colors text-2xl"
                    aria-label="Facebook"
                  >
                    👍
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* =========================== CONTENIDO =========================== */}
      <main id="main" className="flex-1">{children}</main>

      {/* ============================ FOOTER ============================ */}
      <footer className="border-t border-outline mt-16 bg-surface-1">
        <div className="max-w-5xl mx-auto px-6 py-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Columna 1: Club */}
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/escudo-jh.png" alt="" className="w-9 h-9" />
              <p className="font-display font-bold">Club José Hernández</p>
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

          {/* Columna 4: Redes sociales */}
          <div>
            <p className="font-display font-semibold text-sm uppercase tracking-wider text-white/70">
              Seguinos
            </p>
            <div className="mt-3 flex gap-4">
              <a
                href="https://www.instagram.com/josehernandezfs/"
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target text-white/60 hover:text-primary-light transition-colors text-xl"
                aria-label="Instagram"
              >
                📸
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=100006680010803"
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target text-white/60 hover:text-primary-light transition-colors text-xl"
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
        <div className="border-t border-outline py-5 text-center text-xs text-white/50">
          <p>Club José Hernández · Futsal · Paraná, Entre Ríos · <span className="text-primary-light font-semibold">Desde 2010</span> · © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}