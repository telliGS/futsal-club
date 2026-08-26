import { Router } from "express";
import { syncTimbo, getLastSync, runTimboSync } from "../controllers/sync.controller.js";

const router = Router();

router.post("/timbo", syncTimbo);
router.get("/timbo/last", getLastSync);

export { runTimboSync };
export default router;
