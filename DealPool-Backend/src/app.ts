import express from "express";
import cookieParser from "cookie-parser";
import path from "path";

import authRoutes from "./routes/auth.route";
import { errorHandler } from "./middleware/error.middleware";
import { requestLogger } from "./middleware/requestlogger.middleware";

import { corsConfig } from "./config/cors";
import {
    apiRateLimiter,
    authRateLimiter,
} from "./config/ratelimit";
import adminRoutes from "./routes/admin.route";
import dealRoutes from "./routes/deal.route";
import offerRoutes from "./routes/offer.route";
import resourceRoutes from "./routes/resource.route";
import transactionRoutes from "./routes/transaction.route";
import discoveryRoutes from "./routes/discovery.route";
import walletRoutes from "./routes/wallet.route";
import contractRoutes from "./routes/contract.route";
import reportRoutes from "./routes/report.route";

const app = express();
app.use(corsConfig);

// Security Headers Middleware
app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.use(requestLogger);

// Serve interactive test UI dashboard (in development/test environments)
if (process.env.NODE_ENV !== "production") {
    const testsDir = path.join(process.cwd(), "tests");
    app.use("/tests", express.static(testsDir));
    app.get("/test-dashboard", (_req, res) => {
        res.sendFile(path.join(testsDir, "index.html"));
    });
}

app.use(apiRateLimiter);

app.use(
    "/api/auth",
    authRateLimiter,
    authRoutes
);

app.use("/api/admin", adminRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/discovery", discoveryRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api", (_req, res) => {
    res.status(200).json({
        success: true,
        data: null,
    });
});

app.use(errorHandler);

export default app;