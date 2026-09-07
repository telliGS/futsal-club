import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { loginLimiter } from "../middlewares/rate-limit.js";
import {
  login, getMe, createDelegado, updateCredentials,
  updateDelegado, getDelegados, deleteAllDelegados, deleteDelegado
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", loginLimiter, login);
router.get("/me", requireAuth, getMe);
router.post("/delegados", requireAuth, requireAdmin, createDelegado);
router.patch("/me/credentials", requireAuth, updateCredentials);
router.patch("/delegados/:id", requireAuth, requireAdmin, updateDelegado);
router.get("/delegados", requireAuth, requireAdmin, getDelegados);
router.delete("/delegados", requireAuth, requireAdmin, deleteAllDelegados);
router.delete("/delegados/:id", requireAuth, requireAdmin, deleteDelegado);

export default router;
