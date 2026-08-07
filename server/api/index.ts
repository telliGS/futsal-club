// Handler serverless para Vercel.
// El front llama a /api/*; Vercel enruta este archivo y delega en Express.
import { app } from "../src/app.js";

export default app;