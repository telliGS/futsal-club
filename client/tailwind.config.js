/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta "Pitch Dominance" armonizada (design system 10/08)
        // High-Contrast Modernism: fondo midnight, superficies sólidas por
        // niveles, verde forest como señal de acción. El neón (action-green)
        // queda reservado EXCLUSIVAMENTE al indicador "live/activo".
        primary: "#008f39",        // Forest Green JH institucional (acciones primarias)
        "primary-dark": "#006e2a", // verde profundo (hero / hover profundos)
        "primary-light": "#00a342", // verde claro sólido (hovers)
        "pitch-deep": "#00632b",  // verde cancha (detalles profundos / focos)
        "action-green": "#00ff66", // neón reservado al indicador "EN VIVO"
        accent: "#FFFFFF",        // blanco (detalle del escudo)
        // Tangibles de superficie (levels por tonalidad, sin sombras):
        // Negro con leve tinte (Pitch Dominance v2): menos "opaco" que el
        // #0b0b0b puro — se siente profundo sin chocar.
        surface: "#121414",        // level 0 — fondo (leve tinte, sin negro puro)
        "surface-1": "#1e2020",    // level 1 — cards / inputs
        "surface-2": "#282a2b",    // level 2 — modales / hover de filas
        outline: "#333535",        // bordes low-contrast (más visibles que el negro)
        fossil: "#121414",         // alias legacy → mismo fondo
      },
      fontFamily: {
        display: ["Epilogue", "sans-serif"],
        body: ["Montserrat", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"], // labels / datos técnicos (pro-stats)
      },
      // Animaciones sutiles y mates (sin neon/glow): entrada suave y micro-interacciones
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};