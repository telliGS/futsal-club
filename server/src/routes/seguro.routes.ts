import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { getAvisos, resolverAvisos, getLista } from "../controllers/seguro.controller.js";
import { exportSeguro } from "../controllers/export.controller.js";

const router = Router();

router.get("/seguro/avisos", requireAuth, getAvisos);
router.post("/seguro/avisos/resolver", requireAuth, resolverAvisos);
router.get("/seguro/lista", requireAuth, getLista);
router.get("/seguro/export", requireAuth, exportSeguro);

export default router;
