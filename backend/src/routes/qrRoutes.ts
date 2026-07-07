import { Router } from "express";
import { decodeQRFromImage } from "../controllers/qrController";

const router = Router();

router.post("/decode", decodeQRFromImage);

export default router;
