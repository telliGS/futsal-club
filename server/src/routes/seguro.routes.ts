import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { getAvisos, resolverAvisos, getLista } from "../controllers/seguro.controller.js";

const router = Router();

router.get("/seguro/avisos", requireAuth, getAvisos);
router.post("/seguro/avisos/resolver", requireAuth, resolverAvisos);
router.get("/seguro/lista", requireAuth, getLista);

export default router;
