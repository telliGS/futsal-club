import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <header className="relative bg-surface overflow-hidden border-b border-outline">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 110%, rgba(0,147,66,0.35) 0%, rgba(0,99,43,0.15) 40%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
              linear-gradient(45deg, #ffffff 1px, transparent 1px),
              linear-gradient(-45deg, #ffffff 1px, transparent 1px)
            `,
          backgroundSize: "40px 40px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute right-[-12rem] top-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full border border-white/[0.05]"
      />
      <div
        aria-hidden="true"
        className="absolute right-[-10rem] top-1/2 -translate-y-1/2 w-[24rem] h-[24rem] rounded-full border border-white/[0.05]"
      />

      <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-8 md:gap-12">
          <div className="flex flex-col items-center text-center md:flex-row md:items-center md:text-left gap-4 md:gap-6">
            <div className="logo-hover shrink-0">
              <img
                src="/escudo-jh.png"
                alt="Escudo Club José Hernández"
                className="w-24 h-24 md:w-36 md:h-36"
              />
            </div>
            <div>
              <p className="text-white/60 font-mono text-[10px] uppercase tracking-[0.14em]">
                Club Social y Deportivo
              </p>
              <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold mt-2 leading-[1.1] text-white">
                José Hernández
              </h1>
              <div className="mt-3 flex justify-center md:justify-start">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary-light text-xs font-mono uppercase tracking-wider">
                  Futsal · APFS Paraná
                </span>
              </div>
              <p className="mt-3 text-white/70 text-sm md:text-base max-w-md">
                Más de 100 jugadores en 10 equipos · Desde 2010
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 animate-fade-up md:flex-row md:items-center shrink-0" style={{ animationDelay: "0.1s" }}>
            <Link to="/mi-cuota" className="btn-primary active:scale-[0.96] transition-transform">
              Consultar mi cuota
            </Link>
            <Link to="/ingresar" className="btn-secondary active:scale-[0.96] transition-transform">
              Área delegados
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}