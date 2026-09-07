import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { usePageMeta } from "../lib/usePageMeta";

export default function Terminos() {
  usePageMeta({
    title: "Términos y Condiciones",
    description: "Términos y condiciones de uso del sitio del Club Social y Deportivo José Hernández.",
  });

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16 animate-fade-up">
        <p className="font-mono text-xs tracking-widest text-primary-light uppercase mb-2">
          Legal · Actualizado 28/08/2026
        </p>
        <h1 className="font-display text-4xl font-bold">Términos y condiciones</h1>
        <p className="mt-3 text-white/60 text-sm">Uso del sitio jh-futsal.vercel.app del Club Social y Deportivo José Hernández.</p>

        <div className="mt-8 space-y-8 text-white/80 leading-relaxed">
          <section>
            <h2 className="font-display font-bold text-xl text-white">1. Objeto</h2>
            <p className="text-sm">
              Este sitio informa sobre el Club Social y Deportivo José Hernández, su historia,
              cronograma y permite consultar el estado de
              cuota (/mi-cuota) y gestionar planteles en el panel de delegados (/delegado).
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white">2. Uso correcto</h2>
            <p className="text-sm">Te comprometés a usar el sitio sin intentar vulnerar accesos, inyectar código o sobrecargar el servicio. El panel es solo para delegados autorizados.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white">3. Consulta de cuota</h2>
            <p className="text-sm">
              La info de /mi-cuota es orientativa y refleja lo cargado por los delegados. Si hay
              diferencias, prevalece el registro del club. Ante dudas escribí a{" "}
              <a href="mailto:contacto@josehernandez.futbol" className="text-primary-light hover:underline">
                contacto@josehernandez.futbol
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white">4. Propiedad intelectual</h2>
            <p className="text-sm">Escudo, fotos y textos del club son propiedad del Club Social y Deportivo José Hernández. No los uses sin permiso.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white">5. Disponibilidad</h2>
            <p className="text-sm">El sitio se ofrece “tal cual”. Puede haber cortes por mantenimiento o sync con TIMBO/APFS. No garantizamos disponibilidad 100%.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white">6. Enlaces externos</h2>
            <p className="text-sm">Links a Instagram, Facebook o APFS son de terceros; no somos responsables por su contenido.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white">7. Transparencia sobre IA</h2>
            <p className="text-sm">
              Parte del contenido y de las imágenes del sitio fue generado o asistido por inteligencia
              artificial y revisado por el club. El uso de IA se informa por transparencia conforme a
              buenas prácticas y no afecta tus derechos.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white">8. Ley aplicable</h2>
            <p className="text-sm">Estos términos se rigen por leyes de la República Argentina. Jurisdicción: Tribunales de Paraná, Entre Ríos.</p>
          </section>
        </div>

        <div className="mt-10 flex gap-3">
          <Link to="/privacidad" className="text-sm text-primary-light hover:underline">
            Ver política de privacidad →
          </Link>
          <span className="text-white/20">·</span>
          <Link to="/" className="text-sm text-white/60 hover:text-white">
            Volver al inicio
          </Link>
        </div>
      </div>
    </Layout>
  );
}
