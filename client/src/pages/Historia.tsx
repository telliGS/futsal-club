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
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight animate-fade-up">
            Nuestra <span className="text-primary-light">historia</span>
          </h1>
          <p className="mt-4 text-white/80 text-lg max-w-2xl mx-auto leading-relaxed">
            Conocé el camino del Club José Hernández: desde sus orígenes en el barrio
            hasta los títulos que nos llenan de orgullo.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
            {[
              ["🏠", "2010"],
              ["🏆", "2016"],
              ["🥇", "2023"],
              ["🌟", "2026"],
            ].map(([icon, año]) => (
              <span
                key={año}
                className="inline-flex items-center gap-1.5 rounded-full border border-outline bg-surface-1 px-3 py-1 text-white/70"
              >
                <span>{icon}</span>
                <span className="font-mono">{año}</span>
              </span>
            ))}
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
              alt="Jugadores formativos del Club José Hernández en entrenamiento - categorías base C11 a C20"
              loading="lazy"
              decoding="async"
              width="800"
              height="600"
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
          <div className="mt-8 relative" role="list" aria-label="Hitos del club">
            <div
              aria-hidden="true"
              className="absolute left-[15px] top-2 bottom-2 w-px bg-primary/30"
            />
            {hitos.map((hito, index) => (
              <div key={index} role="listitem" className="relative flex items-start gap-5 pb-6 last:pb-0">
                <span className="relative z-10 shrink-0 w-8 h-8 rounded-full bg-surface-2 border border-primary/40 flex items-center justify-center text-sm">
                  {hito.icon}
                </span>
                <div className="pt-1.5">
                  <span className="font-mono text-xs tracking-wide text-primary-light">
                    {hito.año}
                  </span>
                  <p className="mt-1 text-white/75 leading-relaxed">{hito.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Aniversario 2016 - Copa de Oro Norte */}
        <section className="mt-20">
          <div className="rounded-2xl border border-outline bg-surface-1 overflow-hidden">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(90% 110% at 100% 0%, rgba(0,147,66,0.25) 0%, transparent 62%)",
                }}
              />
              <div className="relative px-6 py-10 md:px-10 md:py-12 max-w-3xl">
                <p className="font-mono text-xs tracking-widest text-primary-light uppercase">
                  2016 · 2026 — Diez años de una gesta que no se olvida
                </p>
                <h2 className="mt-2 font-display text-3xl md:text-4xl font-bold leading-tight">
                  Campeón Nacional<br />
                  de la <span className="text-primary-light">Copa de Oro Norte</span>
                </h2>
                <div className="mt-5 space-y-3 text-white/75 leading-relaxed text-[15px]">
                  <p>
                    Diez años de aquella tarde en la que un grupo de pibes de José
                    Hernández se subió a lo más alto y se consagró{" "}
                    <span className="text-white font-semibold">
                      Campeón Nacional de la Copa Oro Norte
                    </span>
                    .
                  </p>
                  <p>
                    No fue solo un título. Fue la realidad de un club de barrio que le
                    compitió de igual a igual a cualquiera, y la alegría inmensa de
                    todos los que hicieron nuestro ese triunfo.
                  </p>
                  <p>
                    Hoy, una década después, ese logro sigue intacto en la memoria de
                    cada uno de los que lo vivió. Porque los colores no se ganan una
                    sola vez:{" "}
                    <span className="text-white font-semibold">
                      se defienden todos los días
                    </span>
                    .
                  </p>
                  <p className="font-display text-white font-bold text-base">
                    🏆 Campeones ayer, hoy y siempre.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-2 md:grid-cols-4 md:gap-3 md:p-3">
              <div className="md:col-span-4 rounded-lg overflow-hidden border border-outline bg-surface-2 flex justify-center p-2 md:p-3">
                <img
                  src="/images/aniversario-2016/gesta-01.jpg"
                  alt="Cartel del décimo aniversario: 10 años Campeón Nacional Copa de Oro Norte 2016 - Club José Hernández"
                  loading="eager"
                  decoding="async"
                  width="1080"
                  height="1350"
                  className="w-full max-w-[520px] h-auto object-contain rounded-md"
                />
              </div>
              {[2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="aspect-[4/5] rounded-lg overflow-hidden border border-outline bg-surface-2 group cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <img
                    src={`/images/aniversario-2016/gesta-${String(i).padStart(2, "0")}.jpg`}
                    alt={`Fotos del décimo aniversario, Campeones Copa de Oro Norte 2016 - Club José Hernández (foto ${i - 1})`}
                    loading="lazy"
                    decoding="async"
                    width="1080"
                    height="1350"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>

            <div className="border-t border-outline px-6 py-8 md:px-10 md:py-10">
              <div className="grid gap-8 md:grid-cols-2 md:gap-10">
                <div>
                  <h3 className="font-display text-xl font-bold flex items-center gap-2 text-primary-light">
                    ⚔️ El camino del campeón
                  </h3>
                  <p className="mt-1 text-sm text-white/50">
                    Copa de Oro Norte · Corrientes, 2016. José Hernández clasificó por
                    acumulación de puntos de la temporada 2015 y se convirtió en el{" "}
                    <span className="text-white/75 font-semibold">
                      primer equipo paranaense en ganar la Copa de Oro
                    </span>
                    .
                  </p>
                  <dl className="mt-5 space-y-4">
                    {[
                      ["Fase de grupos · Zona C", ["4–4 vs Deportivo Estrella", "2–1 vs Pinta Futsal", "5–4 vs Juventud Chaco", "9–1 vs Juventud Chaco"]],
                      ["Octavos de final", ["7–2 vs Deportivo Estrella"]],
                      ["Cuartos de final", ["4–0 vs Pinta Futsal"]],
                      ["Semifinal", ["4–2 vs Deporpisos"]],
                      ["Final", ["4–2 vs Bañado Norte 🏆"]],
                    ].map(([fase, resultados]) => (
                      <div key={String(fase)}>
                        <dt className="font-mono text-[11px] tracking-widest text-white/40 uppercase">
                          {String(fase)}
                        </dt>
                        <dd className="mt-1 grid gap-1">
                          {(resultados as string[]).map((r) => (
                            <span key={String(r)} className="text-white/75 text-sm">
                              JH {String(r)}
                            </span>
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <blockquote className="flex flex-col justify-center rounded-xl border border-outline bg-surface-2 p-6">
                  <span className="font-display text-4xl leading-none text-primary-light" aria-hidden="true">
                    “
                  </span>
                  <p className="font-display text-lg md:text-xl font-semibold leading-snug text-white">
                    Nos metimos en la historia del futsal… el primer equipo paranaense
                    en lograr la Copa de Oro.
                  </p>
                  <footer className="mt-4">
                    <p className="text-sm font-semibold text-primary-light">Mauro Erben</p>
                    <p className="text-xs text-white/50">
                      capitán de José Hernández 2016 · diario UNO
                    </p>
                  </footer>
                </blockquote>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/50 text-center">
            Fotos y texto del décimo aniversario, tomados de la cuenta oficial del club —{" "}
            <a
              href="https://www.instagram.com/p/DcmhKHlFS2H/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-light hover:underline"
            >
              @josehernandezfs
            </a>{" "}
            · fixture y cita del diario{" "}
            <a
              href="https://www.unoentrerios.com.ar/deportes/primeros-ganar-oro-nivel-nacional-n1392651.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-light hover:underline"
            >
              UNO
            </a>{" "}
            · crónica de{" "}
            <a
              href="https://www.ole.com.ar/futsal/chapotearon-felicidad_0_HkF1UW1ine.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-light hover:underline"
            >
              Olé
            </a>
            .
          </p>
        </section>

        {/* Galería histórica */}
        <section className="mt-20">
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <span className="inline-block w-1.5 h-7 bg-primary rounded-full" />
            Galería de fotos
          </h2>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="aspect-square rounded-xl overflow-hidden border border-outline bg-surface-1 hover:border-primary/40 transition-colors">
              <img src="/images/historia-1.jpg" alt="Plantel del Club José Hernández - Campeones Copa de Oro Norte 2016" loading="lazy" decoding="async" width="800" height="800" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-square rounded-xl overflow-hidden border border-outline bg-surface-1 hover:border-primary/40 transition-colors">
              <img src="/images/historia-2.jpg" alt="Equipo femenino del Club José Hernández - Campeonas Apertura APFS 2023" loading="lazy" decoding="async" width="800" height="800" className="w-full h-full object-cover" />
            </div>
            {[
              ["/images/galeria-historica/familia-2021.jpg", "Familia Verdinegra - Festejos y familia del Club José Hernández, 2021"],
              ["/images/galeria-historica/femeninas-2022.jpg", "Femeninas de José Hernández - Campeonas Primera A (ascenso), 2022"],
              ["/images/galeria-historica/tbt-2024.jpg", "TBT - Gol histórico con la hinchada del Club José Hernández, 2024"],
              ["/images/galeria-historica/clausura-2025-01.jpg", "José Hernández Negro - Campeón del Clausura 2025"],
              ["/images/galeria-historica/clausura-2025-02.jpg", "José Hernández Negro - Campeón del Clausura 2025"],
              ["/images/galeria-historica/clausura-2025-03.jpg", "José Hernández Negro - Campeón del Clausura 2025"],
              ["/images/galeria-historica/clausura-2025-04.jpg", "José Hernández Negro - Campeón del Clausura 2025"],
              ["/images/galeria-historica/clausura-2025-05.jpg", "José Hernández Negro - Campeón del Clausura 2025"],
            ].map(([src, alt]) => (
              <div key={src} className="aspect-square rounded-xl overflow-hidden border border-outline bg-surface-1 hover:border-primary/40 transition-colors">
                <img src={src} alt={alt} loading="lazy" decoding="async" width="800" height="800" className="w-full h-full object-cover" />
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
