const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const env = require("./config/env");
const apiRoutes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const ApiError = require("./utils/ApiError");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded product images.
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Basic rate limiter for the API surface.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

app.get("/", (req, res) => {
  res.json({ message: "Inventory Management API", version: "1.0.0" });
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/v1", apiRoutes);

// 404 for unmatched routes.
app.use((req, res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`)));

app.use(errorHandler);

module.exports = app;
