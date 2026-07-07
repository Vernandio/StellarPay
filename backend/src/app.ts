import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { globalRateLimiter } from "./middlewares/rateLimiter";
import { errorHandler } from "./middlewares/errorHandler";

import healthRoutes from "./routes/healthRoutes";
import authRoutes from "./routes/authRoutes";
import pinRoutes from "./routes/pinRoutes";
import qrRoutes from "./routes/qrRoutes";

const app: Application = express();

// Global Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(globalRateLimiter);

// Routes
app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/pin", pinRoutes);
app.use("/api/qr", qrRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
