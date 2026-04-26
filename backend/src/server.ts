import express from "express";
import cors from "cors";
import path from "path";
import itemsRouter from "./routes/items.js";
import topicsRouter from "./routes/topics.js";
import sourcesRouter from "./routes/sources.js";
import fetchRouter from "./routes/fetch.js";
import knowledgeRouter from "./routes/knowledge.js";
import { startCron } from "./cron.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/items", itemsRouter);
app.use("/api/topics", topicsRouter);
app.use("/api/sources", sourcesRouter);
app.use("/api/fetch", fetchRouter);
app.use("/api/knowledge", knowledgeRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve frontend build in production
const frontendDist = path.join(import.meta.dir, "../../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DevPulse running on http://localhost:${PORT}`);
  startCron();
});
