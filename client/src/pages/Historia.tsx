import { Link } from "react-router-dom";
import Layout from "../components/Layout";

export default function Historia() {
  // Datos de ejemplo para la línea de tiempo
  const hitos = [
    { año: "1985", descripcion: "Fundación del club en el barrio de la Toma" },
    { año: "2016", descripcion: "Campeones de la Copa de Oro Norte en Corrientes" },
    { año: "2023", descripcion: "Campeones del Torneo Apertura APFS" },
    { año: "2024", descripcion: "Segundo título oficial y consagración" },
    { año: "2026", descripcion: "10 equipos, más de 100 jugadores y creciendo" },
  ];

  // Testimonios (podés reemplazarlos con reales después)
  const testimonios = [
    {
      nombre: "Juan Pérez",
      rol: "Jugador de JH ELITE",
      texto: "JH es mi segunda familia. Acá aprendí a jugar y a crecer como persona.",
    },
    {
      nombre: "Marcos Ruiz",
      rol: "Delegado de 1ra Fem",
      texto: "Lo que más valoro es el compromiso de todos: jugadores, padres y cuerpo técnico.",
    },
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
        {/* Encabezado */}
        <div className="mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold flex items-center gap-3">
            <span className="inline-block w-2 h-10 bg-primary rounded-full" />
            Nuestra historia
          </h1>
          <p className="mt-4 text-white/70 text-lg max-w-2xl leading-relaxed">
            Conocé el camino del Club José Hernández: desde sus orígenes en el barrio
            hasta los títulos que nos llenan de orgullo.
          </p>
        </div>

        {/* Historia completa */}
        <section className="prose prose-invert max-w-none">
          <p className="text-white/80 leading-relaxed text-lg">
            Somos el Club José Hernández. Nacimos en un barrio de Paraná, con una
            pelota y un sueño. Perdimos finales, pero nunca bajamos los brazos.
            En 2016 dimos la vuelta: campeones de la Copa de Oro Norte en Corrientes.
            Después llegaron el Apertura, el segundo título oficial, y más festejos.
            Hoy somos 10 equipos, más de 100 jugadores, y seguimos siendo un club
            de barrio: familia, esfuerzo y pasión por la camiseta verde. Somos JH Futsal.
          </p>
        </section>

        {/* Línea de tiempo */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <span className="inline-block w-1.5 h-7 bg-primary rounded-full" />
            Línea de tiempo
          </h2>
          <div className="mt-6 space-y-4">
            {hitos.map((hito, index) => (
              <div
                key={index}
                className="flex items-start gap-4 border-l-2 border-primary/40 pl-6 pb-6 last:pb-0"
              >
                <span className="shrink-0 font-display text-2xl font-bold text-primary-light tabular-nums">
                  {hito.año}
                </span>
                <p className="text-white/70">{hito.descripcion}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Galería (placeholder) */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <span className="inline-block w-1.5 h-7 bg-primary rounded-full" />
            Galería de fotos
          </h2>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-xl border border-outline bg-surface-1 flex items-center justify-center"
              >
                <span className="text-4xl">🏆</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-white/40 text-center">
            Pronto más fotos del club. Seguinos en{" "}
            <a
              href="https://www.instagram.com/josehernandezfs/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-light hover:underline"
            >
              Instagram
            </a>{" "}
            para verlas primero.
          </p>
        </section>

        {/* Testimonios */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <span className="inline-block w-1.5 h-7 bg-primary rounded-full" />
            Lo que dicen de nosotros
          </h2>
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            {testimonios.map((t, index) => (
              <div
                key={index}
                className="card p-6 animate-fade-up"
                style={{ animationDelay: `${0.05 * index}s` }}
              >
                <p className="text-white/80 leading-relaxed">"{t.texto}"</p>
                <p className="mt-3 font-semibold text-sm">{t.nombre}</p>
                <p className="text-xs text-white/40">{t.rol}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Redes y llamado a la acción */}
        <section className="mt-16 border-t border-outline pt-12 text-center">
          <p className="text-white/60 text-sm">
            Seguinos en nuestras redes para estar al día con todo lo que pasa en el club.
          </p>
          <div className="mt-4 flex justify-center gap-6 text-3xl">
            <a
              href="https://www.instagram.com/josehernandezfs/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-primary-light transition-colors"
              aria-label="Instagram"
            >
              📸
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=100006680010803"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-primary-light transition-colors"
              aria-label="Facebook"
            >
              👍
            </a>
          </div>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 btn bg-surface-2 border border-outline text-white hover:border-primary/40 hover:bg-surface-1"
          >
            ← Volver al inicio
          </Link>
        </section>
      </div>
    </Layout>
  );
}