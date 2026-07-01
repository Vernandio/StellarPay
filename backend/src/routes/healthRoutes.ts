import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now(),
  };

  try {
    res.status(200).send(healthCheck);
  } catch (error: any) {
    healthCheck.message = error.message;
    res.status(503).send(healthCheck);
  }
});

export default router;
