import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { scanReceipt } from "../controllers/ocrController";

const router = Router();

// OCR receipt scanning — requires authentication
router.post("/scan-receipt", requireAuth, scanReceipt);

export default router;
