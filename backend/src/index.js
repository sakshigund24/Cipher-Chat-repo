import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

import { connectDB } from "./lib/db.js";
import { app, server } from "./lib/socket.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/group.route.js";
import searchRoutes from "./routes/search.route.js";
import callRoutes from "./routes/call.route.js";

dotenv.config();

const PORT = process.env.PORT || 5001;

// ─── SECURITY MIDDLEWARE ───────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(mongoSanitize());

// ─── RATE LIMITING ─────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { message: "Too many requests, please try again later." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);

const generalLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 200 });
app.use(generalLimiter);

// ─── GENERAL MIDDLEWARE ────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
const allowedOrigins = [
  "http://localhost:5173",
  "https://cipher-chat-repo.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── ROUTES ────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/calls", callRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SecureChat Backend is Running 🚀",
  });
});

// ─── HEALTH CHECK ──────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date() }));

// ─── GLOBAL ERROR HANDLER ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

// ─── START SERVER ──────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  connectDB();
});
