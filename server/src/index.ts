// Entry point local: arranca el servidor en el puerto configurado.
// En Vercel no se usa esto — la app se importa desde api/index.ts
import { app } from "./app.js";
import { PORT, prisma } from "./config.js";

app.listen(PORT, () => {
  console.log(`API futsal-club corriendo en http://localhost:${PORT}`);
});

// Cierre limpio
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});