import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import itemsRouter from "./routes/items.js";
import topicsRouter from "./routes/topics.js";
import sourcesRouter from "./routes/sources.js";
import fetchRouter from "./routes/fetch.js";
import knowledgeRouter from "./routes/knowledge.js";
import chatRouter from "./routes/chat.js";
import authRouter from "./routes/auth.js";
import libraryRouter from "./routes/library.js";
import subscribeRouter from "./routes/subscribe.js";
import rssRouter from "./routes/rss.js";
import { startCron } from "./cron.js";

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set");
  process.exit(1);
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Required for Render/cloud reverse proxies — lets express-rate-limit read real client IP from X-Forwarded-For
app.set("trust proxy", 1);

app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "https://devpulse.tatsatpandey.com"],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a moment." },
});

// API Routes
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/library", libraryRouter);
app.use("/api/items", itemsRouter);
app.use("/api/topics", topicsRouter);
app.use("/api/sources", sourcesRouter);
app.use("/api/fetch", fetchRouter);
app.use("/api/knowledge", knowledgeRouter);
app.use("/api/chat", chatRouter);
app.use("/api/subscribe", subscribeRouter);
app.use("/api/rss", rssRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve frontend build in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 DevPulse running on http://localhost:${PORT}`);
  startCron();
});
