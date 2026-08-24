import { useState } from "react";
import { Link } from "react-router-dom";
import { useFactory } from "../factories";

// Header/nav + footer comunes a todas las páginas públicas.
export default function Layout({ children }: { children: React.ReactNode }) {
  const { Header, Footer, Container, MobileMenuButton, MobileDrawer, DesktopNav } = useFactory();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navLinks = [
    { to: "/", end: true, children: "Inicio" },
    { to: "/mi-cuota", children: "Mi cuota" },
    { to: "/cronograma", children: "Cronograma" },
    { to: "/ingresar", children: "Delegados" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip link para accesibilidad */}
      <a href="#main" className="skip-link">
        Saltar al contenido principal
      </a>

      {/* ============================ NAV ============================ */}
      <Header>
        {/* Logo + nombre SOLO desktop */}
        <Link to="/" className="flex items-center gap-3 group hidden sm:flex" aria-label="Inicio — Club José Hernández">
          <img
            src="/escudo-jh.png"
            alt="Escudo Club José Hernández"
            className="w-8 h-8 md:w-10 md:h-10 transition-transform duration-300 ease-out-soft group-hover:scale-110 group-hover:-rotate-3"
          />
          <div className="leading-tight">
            <p className="font-display font-bold text-sm md:text-base">Club José Hernández</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">
              Futsal · Paraná
            </p>
          </div>
        </Link>

        <DesktopNav links={navLinks} />
        <MobileMenuButton onClick={() => setDrawerOpen(true)} />
      </Header>

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} links={navLinks} />

      {/* =========================== CONTENIDO =========================== */}
      <Container>{children}</Container>

      {/* ============================ FOOTER ============================ */}
      <Footer>
        <div className="max-w-5xl mx-auto px-6 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="border-t border-outline py-5 text-center text-xs text-white/50">
          <p>Club José Hernández · Futsal · Paraná, Entre Ríos · <span className="text-primary-light font-semibold">Desde 2010</span> · © {new Date().getFullYear()}</p>
        </div>
      </Footer>
    </div>
  );
}