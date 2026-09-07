import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { usePageMeta } from "../lib/usePageMeta";

export default function Privacidad() {
  usePageMeta({
    title: "Privacidad",
    description:
      "Política de privacidad del Club Social y Deportivo José Hernández. Qué datos recolectamos, para qué los usamos y cómo ejercer tus derechos.",
  });

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16 animate-fade-up">
        <p className="font-mono text-xs tracking-widest text-primary-light uppercase mb-2">
          Legal · Actualizado 28/08/2026
        </p>
        <h1 className="font-display text-4xl font-bold">Política de privacidad</h1>
        <p className="mt-3 text-white/60 text-sm">
          Club Social y Deportivo José Hernández — Futsal, Paraná, Entre Ríos. Contacto:{" "}
          <a href="mailto:contacto@josehernandez.futbol" className="text-primary-light hover:underline">
            contacto@josehernandez.futbol
          </a>
        </p>

        <div className="mt-8 space-y-8 text-white/80 leading-relaxed">
          <section>
            <h2 className="font-display font-bold text-xl text-white">1. Qué datos juntamos</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
              <li>
                <span className="text-white font-semibold">Consulta de cuota (/mi-cuota):</span> DNI que
                ingresás para buscar tu estado. No lo almacenamos más allá del log técnico.
              </li>
              <li>
                <span className="text-white font-semibold">Panel de delegados:</span> nombre, DNI, fecha de
                nacimiento, equipo, estado de cuota y fichas médicas que cargan los delegados.
              </li>
              <li>
                <span className="text-white font-semibold">Datos técnicos:</span> IP, user-agent y páginas
                visitadas vía Vercel Analytics (agregado y anónimo).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white">2. Para qué los usamos</h2>
            <p className="text-sm">Solo para gestionar el club: mostrar si estás al día, armar cronogramas, organizar planteles y cumplir con la APFS. No vendemos ni compartimos datos con terceros.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white">3. Base legal y conservación</h2>
            <p className="text-sm">
              Tratamos datos con tu consentimiento y por la relación con el club (Ley 25.326 de Protección
              de Datos Personales, Argentina). Los conservamos mientras seas jugador/técnico o mientras sea
              necesario para la gestión del club. Podés pedir la baja en cualquier momento.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white">4. Tus derechos</h2>
            <p className="text-sm">
              Podés acceder, rectificar, actualizar o suprimir tus datos escribiendo a{" "}
              <a href="mailto:contacto@josehernandez.futbol" className="text-primary-light hover:underline">
                contacto@josehernandez.futbol
              </a>{" "}
              con tu DNI. Respondemos en 10 días hábiles según art. 14 y 16 de la Ley 25.326.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white">5. Seguridad</h2>
            <p className="text-sm">Los datos del panel están protegidos con RLS en PostgreSQL (Supabase) y acceso por roles. Contraseñas hasheadas y sesiones JWT. Solo delegados/admin ven su equipo.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white">6. Cookies y analíticas</h2>
            <p className="text-sm">Usamos solo cookies técnicas y Vercel Analytics sin fingerprinting. No hay publicidad ni trackers de terceros.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white">7. Uso de inteligencia artificial</h2>
            <p className="text-sm">
              Parte del contenido informativo y de las imágenes del sitio fue generado o asistido por
              herramientas de inteligencia artificial y revisado por el club. Tus datos personales no se
              usan para entrenar modelos ni se comparten con proveedores de IA.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white">8. Cambios</h2>
            <p className="text-sm">Si cambiamos esta política la publicamos acá con nueva fecha. Seguí usando el sitio implica aceptación.</p>
          </section>
        </div>

        <div className="mt-10 flex gap-3">
          <Link to="/terminos" className="text-sm text-primary-light hover:underline">
            Ver términos y condiciones →
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
