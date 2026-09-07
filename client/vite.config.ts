import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Durante el dev, el servidor corre en :4000 y el cliente en :5173
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});