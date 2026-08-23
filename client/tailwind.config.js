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
      fontSize: {
        'fluid-xs': ['clamp(0.7rem, 0.65rem + 0.25vw, 0.8rem)', { lineHeight: '1.4' }],
        'fluid-sm': ['clamp(0.8rem, 0.75rem + 0.25vw, 0.9rem)', { lineHeight: '1.5' }],
        'fluid-base': ['clamp(0.9rem, 0.85rem + 0.25vw, 1rem)', { lineHeight: '1.6' }],
        'fluid-lg': ['clamp(1.05rem, 1rem + 0.25vw, 1.15rem)', { lineHeight: '1.5' }],
        'fluid-xl': ['clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem)', { lineHeight: '1.4' }],
        'fluid-2xl': ['clamp(1.5rem, 1.35rem + 0.75vw, 2rem)', { lineHeight: '1.3' }],
        'fluid-3xl': ['clamp(1.875rem, 1.65rem + 1.125vw, 2.5rem)', { lineHeight: '1.2' }],
        'fluid-4xl': ['clamp(2.25rem, 1.9rem + 1.75vw, 3.5rem)', { lineHeight: '1.1' }],
        'fluid-5xl': ['clamp(3rem, 2.5rem + 2.5vw, 4.5rem)', { lineHeight: '1.1' }],
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
        "bounce-x": {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(4px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
        "bounce-x": "bounce-x 1.5s ease-in-out infinite",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".scrollbar-none": {
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": { display: "none" },
        },
        // Touch targets estándar 44×44dp
        ".touch-target": {
          "min-height": "44px",
          "min-width": "44px",
        },
        ".touch-target-lg": {
          "min-height": "48px",
          "min-width": "48px",
        },
        // Safe area insets (notch/Dynamic Island)
        ".pt-safe": { "padding-top": "env(safe-area-inset-top)" },
        ".pb-safe": { "padding-bottom": "env(safe-area-inset-bottom)" },
        ".px-safe": { "padding-left": "env(safe-area-inset-left)", "padding-right": "env(safe-area-inset-right)" },
        // Scroll hint visual
        ".scroll-hint-x": {
          "&::after": {
            content: '"→"',
            position: "absolute",
            right: "0.5rem",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "0.75rem",
            color: "rgb(255 255 255 / 0.3)",
            animation: "bounce-x 1.5s infinite",
          },
        },
        // Table → Cards en móvil (< 640px)
        "@media (max-width: 639px)": {
          ".table-to-cards thead": { display: "none" },
          ".table-to-cards tbody": { display: "block" },
          ".table-to-cards tr": {
            display: "block",
            marginBottom: "1rem",
            border: "1px solid rgb(51 53 53)",
            borderRadius: "0.5rem",
            padding: "1rem",
            backgroundColor: "rgb(30 32 32)",
          },
          ".table-to-cards td": {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.5rem 0",
            borderBottom: "1px solid rgb(51 53 53 / 0.5)",
          },
          ".table-to-cards td:last-child": { borderBottom: "none" },
          ".table-to-cards td::before": {
            content: 'attr(data-label)',
            fontWeight: "600",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "rgb(255 255 255 / 0.5)",
          },
        },
        // Carrusel preset (para presupuesto total club)
        ".carousel": {
          display: "flex",
          gap: "0.75rem",
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: "1rem",
          scrollSnapType: "x mandatory",
        },
        ".carousel::-webkit-scrollbar": { display: "none" },
        ".carousel > *": {
          flexShrink: "0",
          width: "calc(100% - 2rem)",
          scrollSnapAlign: "start",
        },
        "@media (min-width: 640px)": {
          ".carousel > *": { width: "calc(50% - 0.75rem)" },
        },
        "@media (min-width: 1024px)": {
          ".carousel > *": { width: "calc(25% - 0.5625rem)" },
        },
      });
    },
  ],
};