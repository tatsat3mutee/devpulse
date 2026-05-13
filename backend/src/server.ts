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
import prefsRouter from "./routes/prefs.js";
import learnRouter, { initLearnTables } from "./routes/learn.js";
import briefRouter from "./routes/brief.js";
import pool from "./db.js";
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
app.use("/api/prefs", prefsRouter);
app.use("/api/learn", learnRouter);
app.use("/api/brief", briefRouter);

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

app.listen(PORT, () => {
  console.log(`🚀 DevPulse running on http://localhost:${PORT}`);
  initLearnTables().catch(err => console.error("initLearnTables failed:", err));
  seedExtraSources().catch(err => console.error("seedExtraSources failed:", err));
  startCron();
});
