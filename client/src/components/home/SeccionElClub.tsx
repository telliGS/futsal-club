import { IEquipoPublico } from "../../lib/home-helpers";

interface IElClubProps {
  formativas: IEquipoPublico[];
}

export default function SeccionElClub({ formativas }: IElClubProps) {
  return (
    <section className="mt-16">
      <h2 className="font-display text-2xl font-bold flex items-center gap-3 animate-fade-up">
        <span className="inline-block w-1.5 h-7 bg-primary rounded-full" />
        El club
      </h2>
      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <div className="card-static animate-fade-up">
          <span className="w-11 h-11 rounded-xl bg-surface-2 border border-outline flex items-center justify-center text-xl">
            🌱
          </span>
          <h3 className="font-display font-bold mt-4">Semillero de campeones</h3>
          <p className="text-sm text-white/70 mt-2 leading-relaxed">
            {formativas.length} categorías de base (C11 a C20) formando jugadores
            para la primera división del club.
          </p>
        </div>
        <div className="card-static animate-fade-up" style={{ animationDelay: "0.05s" }}>
          <span className="w-11 h-11 rounded-xl bg-surface-2 border border-outline flex items-center justify-center text-xl">
            ⚽
          </span>
          <h3 className="font-display font-bold mt-4">Cuatro equipos de primera</h3>
          <p className="text-sm text-white/70 mt-2 leading-relaxed">
            Primera Femenina, JH C, JH NEGRO y JH ELITE en la Competencia Oficial APFS.
          </p>
        </div>
        <div className="card-static animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <span className="w-11 h-11 rounded-xl bg-surface-2 border border-outline flex items-center justify-center text-xl">
            🏟️
          </span>
          <h3 className="font-display font-bold mt-4">Futsal de Paraná</h3>
          <p className="text-sm text-white/70 mt-2 leading-relaxed">
            Jugamos los fines en las canchas de la ciudad (Berduc, Unión Árabe,
            Toma Vieja) con la APFS.
          </p>
        </div>
      </div>
    </section>
  );
}