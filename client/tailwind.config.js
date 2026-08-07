/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta del club
        primary: "#1d4ed8", // azul
        accent: "#FBBF24",  // dorado
        fossil: "#121212",
      },
      fontFamily: {
        display: ["Epilogue", "sans-serif"],
        body: ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};