import { useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { usePageMeta } from "../lib/usePageMeta";

export default function Historia() {
  usePageMeta({
    title: "Historia",
    description: "Conocé la historia del Club José Hernández: desde 2010 en el barrio hasta los títulos de Copa de Oro, Elite y 1ra Femenina.",
  });
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const hitos = [
    { año: "30 de abril de 2010", descripcion: "Fundación del club en el barrio José Hernández", icon: "🏠" },
    { año: "2015", descripcion: "Primer título: Juvenil Clausura", icon: "🥇" },
    { año: "2016", descripcion: "Campeones de la Copa de Oro Norte (Local, Provincial y Nacional)", icon: "🏆" },
    { año: "2017", descripcion: "JH campeón del Apertura de Elite (masculino) y JH Femenino campeón del Apertura de ascenso (4-3 vs Oro Verde)", icon: "🏆" },
    { año: "2019", descripcion: "Reconocimiento: Único campeón local, provincial y nacional", icon: "⭐" },
    { año: "2022", descripcion: "JH Elite campeón del Clausura (División Elite)", icon: "🏅" },
    { año: "2023", descripcion: "1ra Femenina campeona del Torneo Apertura APFS", icon: "👩‍🏫" },
    { año: "2024", descripcion: "JH C campeón del Clausura (B) / Tercera División", icon: "🏆" },
    { año: "2025", descripcion: "JH Negro campeón del Clausura (Segunda División) y José Hernández campeón del Apertura C23", icon: "🏆" },
    { año: "2026", descripcion: "C11 y C13 campeones del Apertura", icon: "🌟" },
  ];

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
      {/* Encabezado con gradiente */}
      <div className="relative bg-gradient-to-b from-primary-dark to-surface overflow-hidden border-b border-outline">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 110%, rgba(0,147,66,0.30) 0%, rgba(0,99,43,0.12) 38%, transparent 72%)",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-28 text-center">
          <h1 className="font-display text-5xl md:text-6xl font-bold">
            Nuestra <span className="text-primary-light">historia</span>
          </h1>
          <p className="mt-4 text-white/80 text-lg max-w-2xl mx-auto leading-relaxed">
            Conocé el camino del Club José Hernández: desde sus orígenes en el barrio
            hasta los títulos que nos llenan de orgullo.
          </p>
          <div className="mt-6 flex justify-center gap-4 text-sm text-white/50">
            <span>🏠 2010</span>
            <span>·</span>
            <span>🏆 2016</span>
            <span>·</span>
            <span>🥇 2023</span>
            <span>·</span>
            <span>🌟 2026</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Historia completa */}
        <section className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="font-display text-2xl font-bold flex items-center gap-3">
              <span className="inline-block w-1.5 h-7 bg-primary rounded-full" />
              Cómo empezó todo
            </h2>
            <div className="mt-4 space-y-3 text-white/70 leading-relaxed">
              <p className="text-lg text-white/80">
                Somos el Club José Hernández. Nacimos el <span className="text-primary-light font-semibold">30 de abril de 2010</span> en el <span className="text-white font-semibold">barrio José Hernández</span>, con una pelota y un sueño. Perdimos finales, pero nunca bajamos los brazos.
              </p>
              <p>
                En <span className="text-primary-light font-semibold">2015</span> llegó el primer título: la Juvenil Clausura. Un año después, en <span className="text-primary-light font-semibold">2016</span>, dimos la vuelta: campeones de la <span className="text-white font-semibold">Copa de Oro Norte en Corrientes</span>, siendo el único club de la ciudad con un campeonato local, provincial y nacional.
              </p>
              <p>
                El <span className="text-primary-light font-semibold">2017</span> fue un año histórico: <span className="text-white font-semibold">JH masculino campeón del Apertura de Elite</span> (venciendo a Paracao 2-1) y <span className="text-white font-semibold">JH Femenino campeón del Apertura de ascenso</span> (4-3 vs Oro Verde). <span className="text-primary-light font-semibold">¡Los dos equipos salieron campeones el mismo año!</span> En <span className="text-primary-light font-semibold">2022</span>, JH Elite repitió en el Clausura de la División Elite. En <span className="text-primary-light font-semibold">2023</span>, nuestra <span className="text-white font-semibold">1ra Femenina</span> levantó el Torneo Apertura APFS. En <span className="text-primary-light font-semibold">2024</span>, JH C fue campeón del Clausura en la "B". En <span className="text-primary-light font-semibold">2025</span>, JH Negro fue campeón del Clausura en Segunda División. Y este <span className="text-primary-light font-semibold">2026</span>, nuestras C11 y C13 salieron campeonas del Apertura.
              </p>
              <p className="text-white/80">
                Hoy somos <span className="text-white font-semibold">10 equipos</span>, más de <span className="text-white font-semibold">100 jugadores</span>, y seguimos siendo un club de barrio: <span className="text-white font-semibold">familia, esfuerzo y pasión</span> por la camiseta verde. <span className="text-primary-light font-semibold">Somos JH Futsal.</span>
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://www.instagram.com/josehernandezfs/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center gap-2"
              >
                📸 Seguinos en Instagram
              </a>
              <Link
                to="/"
                className="btn bg-surface-2 border border-outline text-white hover:border-primary/40 hover:bg-surface-1 inline-flex items-center gap-2"
              >
                ← Volver al inicio
              </Link>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden border border-outline bg-surface-1 aspect-[4/3]">
            <img
              src="/images/historia-2.jpg"
              alt="Historia del Club José Hernández"
              className="w-full h-full object-cover"
            />
          </div>
        </section>

        {/* Línea de tiempo */}
        <section className="mt-20">
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <span className="inline-block w-1.5 h-7 bg-primary rounded-full" />
            Línea de tiempo
          </h2>
          <div className="mt-8 space-y-6">
            {hitos.map((hito, index) => (
              <div
                key={index}
                className="flex items-start gap-6 border-l-2 border-primary/40 pl-6 pb-6 last:pb-0"
              >
                <span className="shrink-0 text-3xl">{hito.icon}</span>
                <div>
                  <span className="font-display text-2xl font-bold text-primary-light tabular-nums block">
                    {hito.año}
                  </span>
                  <p className="text-white/70">{hito.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Galería */}
        <section className="mt-20">
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <span className="inline-block w-1.5 h-7 bg-primary rounded-full" />
            Galería de fotos
          </h2>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="aspect-square rounded-xl overflow-hidden border border-outline bg-surface-1 hover:border-primary/40 transition-colors">
              <img src="/images/historia-1.jpg" alt="Historia del club 1" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-square rounded-xl overflow-hidden border border-outline bg-surface-1 hover:border-primary/40 transition-colors">
              <img src="/images/historia-2.jpg" alt="Historia del club 2" className="w-full h-full object-cover" />
            </div>
            {[3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-xl border border-outline bg-surface-1 flex items-center justify-center hover:border-primary/40 transition-colors"
              >
                <span className="text-5xl">🏆</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-white/50 text-center">
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
        <section className="mt-20">
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
                <p className="text-xs text-white/50">{t.rol}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cierre con redes */}
        <section className="mt-20 border-t border-outline pt-12 text-center">
          <p className="text-white/70 text-sm">
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
        </section>
      </div>
    </Layout>
  );
}