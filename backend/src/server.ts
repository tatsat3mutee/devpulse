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
import chatRouter from "./routes/chat.js";
import authRouter from "./routes/auth.js";
import libraryRouter from "./routes/library.js";
import subscribeRouter from "./routes/subscribe.js";
import rssRouter from "./routes/rss.js";
import prefsRouter from "./routes/prefs.js";
import conceptsRouter from "./routes/concepts.js";
import benchmarksRouter from "./routes/benchmarks.js";
import sitemapRouter from "./routes/sitemap.js";
import pool from "./db.js";
import { startCron } from "./cron.js";
import { log } from "./logger.js";
import { snapshot } from "./metrics.js";
import { getLLMRateState } from "./llm/client.js";
import { requireAdmin } from "./middleware/auth.js";

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set");
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET must be at least 32 characters long (use a long random string)");
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
app.use(express.json({ limit: "200kb" }));

// Structured request logging for API routes (skip static assets)
app.use("/api", (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    log.info("http", {
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      ms: Date.now() - start,
    });
  });
  next();
});

// Security headers (dependency-free helmet subset)
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a moment." },
});

// Strict limiter for credential endpoints (brute-force protection)
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait 15 minutes." },
});

// Chat is unauthenticated and calls paid LLMs — cap per-IP usage
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limited — please wait a moment and try again." },
});

// Subscribe endpoints — prevent email spam/enumeration
const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// API Routes
app.use("/api/auth/login", credentialLimiter);
app.use("/api/auth/register", credentialLimiter);
app.use("/api/auth/forgot-password", credentialLimiter);
app.use("/api/auth/reset-password", credentialLimiter);
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/library", libraryRouter);
app.use("/api/items", itemsRouter);
app.use("/api/topics", topicsRouter);
app.use("/api/sources", sourcesRouter);
app.use("/api/fetch", fetchRouter);
app.use("/api/chat", chatLimiter, chatRouter);
app.use("/api/subscribe", subscribeLimiter, subscribeRouter);
app.use("/api/rss", rssRouter);
app.use("/api/prefs", prefsRouter);
app.use("/api/concepts", conceptsRouter);
app.use("/api/benchmarks", benchmarksRouter);

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "up", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "degraded", db: "down", timestamp: new Date().toISOString() });
  }
});

// Operational metrics — admin only
app.get("/api/metrics", requireAdmin, (_req, res) => {
  res.json({ ...snapshot(), llm: getLLMRateState() });
});

// Dynamic sitemap — registered before express.static so it wins over frontend/public/sitemap.xml
app.use("/sitemap.xml", sitemapRouter);

// Serve frontend build in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

async function seedExtraSources() {
  const sources = [
    { name: "TLDR AI", platform: "newsletter", category: "AI", url: "https://tldr.tech/ai/rss", fetcher_key: "rss" },
    { name: "The Changelog", platform: "podcast", category: "engineering", url: "https://changelog.com/podcast.rss", fetcher_key: "rss" },
    { name: "Lobsters", platform: "community", category: "engineering", url: "https://lobste.rs/rss", fetcher_key: "rss" },
    { name: "dev.to", platform: "blog", category: "engineering", url: "https://dev.to/feed", fetcher_key: "rss" },
    { name: "InfoQ", platform: "news", category: "engineering", url: "https://feed.infoq.com/", fetcher_key: "rss" },
    { name: "Bytes.dev", platform: "newsletter", category: "engineering", url: "https://bytes.dev/rss.xml", fetcher_key: "rss" },
    { name: "JavaScript Weekly", platform: "newsletter", category: "engineering", url: "https://javascriptweekly.com/rss/fulltext.xml", fetcher_key: "rss" },
    { name: "Golang Weekly", platform: "newsletter", category: "engineering", url: "https://golangweekly.com/rss/fulltext.xml", fetcher_key: "rss" },
    { name: "Hacker Newsletter", platform: "newsletter", category: "engineering", url: "https://hackernewsletter.com/issues.rss", fetcher_key: "rss" },
    { name: "Import AI", platform: "newsletter", category: "AI", url: "https://jack-clark.net/feed/", fetcher_key: "rss" },
  ];
  for (const s of sources) {
    await pool.query(
      `INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (url) DO NOTHING`,
      [s.name, s.platform, s.category, s.url, s.fetcher_key]
    ).catch(() => {});
  }
}

const server = app.listen(PORT, () => {
  console.log(`🚀 DevPulse running on http://localhost:${PORT}`);
  seedExtraSources().catch(err => console.error("seedExtraSources failed:", err));
  startCron();
});

function shutdown(signal: string): void {
  console.log(`${signal} received — shutting down gracefully...`);
  // Force-exit fallback if connections refuse to drain
  const forceTimer = setTimeout(() => {
    console.error("Forced exit after 10s shutdown timeout");
    process.exit(1);
  }, 10_000);
  forceTimer.unref();
  server.close(async () => {
    try {
      await pool.end();
      console.log("PostgreSQL pool closed. Bye.");
    } catch (err) {
      console.error("Error closing pool:", err);
    }
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
