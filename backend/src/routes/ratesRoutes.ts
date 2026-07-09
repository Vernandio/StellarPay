import { Router } from "express";
import { getRates } from "../controllers/ratesController";

const router = Router();

// Expose public endpoint for exchange rates
router.get("/", getRates);

export default router;
