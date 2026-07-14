import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { globalRateLimiter } from "./middlewares/rateLimiter";
import { errorHandler } from "./middlewares/errorHandler";

import healthRoutes from "./routes/healthRoutes";
import authRoutes from "./routes/authRoutes";
import pinRoutes from "./routes/pinRoutes";
import qrRoutes from "./routes/qrRoutes";
import ratesRoutes from "./routes/ratesRoutes";
import ocrRoutes from "./routes/ocrRoutes";

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
app.use("/api/rates", ratesRoutes);
app.use("/api/ocr", ocrRoutes);

// Stellar.toml configuration endpoint for SEP-10 & SEP-24 validation
app.get("/.well-known/stellar.toml", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(`ACCOUNTS = []
VERSION = "0.1.0"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
SIGNING_KEY="GD5NUMEX7LYHXGXCAD4PGW7JDMOUY2DKRGY5XZHJS5IONVHDKCJYGVCL"

WEB_AUTH_ENDPOINT="https://extstellar.moneygram.com/stellaradapterservice/auth"
TRANSFER_SERVER_SEP0024="https://extstellar.moneygram.com/stellaradapterservice/sep24"

[[CURRENCIES]]
code="USDC"
issuer="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
is_asset_anchored=true
anchor_asset_type="fiat"
anchor_asset="USD"
attestation_of_reserve="https://www.centre.io/usdc-transparency"
redemption_instructions="Redeemable through a Circle account at https://circle.com"
name="USD Coin"
desc="USDC is a fully collateralized US Dollar stablecoin, based on the open source fiat stablecoin framework developed by Centre."
image="https://www.centre.io/images/usdc/usdc-icon-86074d9d49.png"

[DOCUMENTATION]
ORG_NAME = "MoneyGram"
ORG_URL = "https://www.moneygram.com"
ORG_DESCRIPTION = "Cash in and out of USDC at participating MoneyGram locations."
ORG_LOGO="https://stellar.moneygram.com/assets/images/moneygram-logo.jpg"
ORG_SUPPORT_EMAIL="customerservice@moneygram.com"`);
});

// Global Error Handler
app.use(errorHandler);

export default app;
