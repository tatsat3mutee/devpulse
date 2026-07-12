import { Router, Request, Response } from "express";
import pool from "./../db.js";

const router = Router();

const STATIC_PAGES = [
  "/", "/feed", "/topics", "/videos", "/chat", "/brief", "/knowledge",
  "/events", "/trending", "/devhub", "/about", "/help", "/privacy", "/terms",
];

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildXml(urls: string[]): string {
  const entries = urls
    .map((u) => `  <url><loc>${xmlEscape(u)}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

// GET /sitemap.xml — static pages + dynamic topic and knowledge guide slugs
router.get("/", async (_req: Request, res: Response) => {
  const base = (process.env.SITE_URL || "https://devpulse.tatsatpandey.com").replace(/\/+$/, "");
  const urls = STATIC_PAGES.map((p) => `${base}${p}`);

  try {
    const [topics, guides] = await Promise.all([
      pool.query<{ slug: string }>(`SELECT slug FROM topics`),
      pool.query<{ slug: string }>(`SELECT slug FROM knowledge_guides`),
    ]);
    for (const row of topics.rows) {
      if (row.slug) urls.push(`${base}/topics/${row.slug}`);
    }
    for (const row of guides.rows) {
      if (row.slug) urls.push(`${base}/knowledge/${row.slug}`);
    }
  } catch (err) {
    console.error("Sitemap DB error (serving static-only sitemap):", err);
  }

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(buildXml(urls));
});

export default router;
