/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta del club (extraída del escudo real + Instagram @josehernandezfs)
        primary: "#068938",       // verde JH (color principal del escudo)
        "primary-dark": "#046B27", // verde oscuro para gradientes
        "primary-light": "#0AA547", // verde claro para hovers
        accent: "#FFFFFF",        // blanco (detalle del escudo)
        fossil: "#0D0D0D",        // fondo oscuro
      },
      fontFamily: {
        display: ["Epilogue", "sans-serif"],
        body: ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};