import { memo } from "react";
import { Link } from "react-router-dom";

export default memo(function SeccionHistoria() {
  return (
    <section className="mt-16 border-t border-outline pt-12">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="font-display text-3xl font-bold flex items-center gap-3">
            <span className="inline-block w-1.5 h-8 bg-primary rounded-full" />
            Nuestra historia
          </h2>
          <div className="mt-4 text-white/80 leading-relaxed space-y-3">
            <p>
              Somos el Club José Hernández. Nacimos el <span className="text-primary-light font-semibold">30 de abril de 2010</span> en el <span className="text-white font-semibold">barrio José Hernández</span>, con una pelota y un sueño. Perdimos finales, pero nunca bajamos los brazos.
            </p>
            <p>
              En <span className="text-primary-light font-semibold">2015</span> llegó el primer título: la Juvenil Clausura. Un año después, en <span className="text-primary-light font-semibold">2016</span>, dimos la vuelta: campeones de la <span className="text-white font-semibold">Copa de Oro Norte en Corrientes</span>, siendo el único club de la ciudad con un campeonato local, provincial y nacional.
            </p>
            <p>
              El <span className="text-primary-light font-semibold">2017</span> fue un año histórico: <span className="text-white font-semibold">JH masculino campeón del Apertura de Elite</span> (venciendo a Paracao 2-1) y <span className="text-white font-semibold">JH Femenino campeón del Apertura de ascenso</span> (4-3 vs Oro Verde). <span className="text-primary-light font-semibold">¡Los dos equipos salieron campeones el mismo año!</span> En <span className="text-primary-light font-semibold">2022</span>, JH Elite repitió en el Clausura de la División Elite. En <span className="text-primary-light font-semibold">2023</span>, nuestra <span className="text-white font-semibold">1ra Femenina</span> levantó el Torneo Apertura APFS. En <span className="text-primary-light font-semibold">2024</span>, JH C fue campeón del Clausura en la "B". En <span className="text-primary-light font-semibold">2025</span>, JH Negro fue campeón del Clausura en Segunda División. Y este <span className="text-primary-light font-semibold">2026</span>, nuestras C11 y C13 salieron campeonas del Apertura.
            </p>
            <p>
              Hoy somos <span className="text-white font-semibold">10 equipos</span>, más de <span className="text-white font-semibold">100 jugadores</span>, y seguimos siendo un club de barrio: <span className="text-white font-semibold">familia, esfuerzo y pasión</span> por la camiseta verde. <span className="text-primary-light font-semibold">Somos JH Futsal.</span>
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link to="/historia" className="btn-primary inline-flex items-center gap-2">
              Conocé más
              <span aria-hidden>→</span>
            </Link>
            <a
              href="https://www.instagram.com/josehernandezfs/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center gap-2"
            >
              📸 Seguinos en Instagram
            </a>
          </div>
        </div>
        <div className="rounded-xl overflow-hidden border border-outline bg-surface-1 aspect-[4/3]">
          <img
            src="/images/galeria-historica/clausura-2025-01.jpg"
            alt="José Hernández Negro celebrando el título del Clausura 2025 en el polideportivo"
            loading="lazy"
            decoding="async"
            width="1066"
            height="1066"
            className="w-full h-full object-cover outline outline-1 outline-white/10"
          />
        </div>
      </div>
    </section>
  );
});