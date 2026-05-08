import { Router, type Request, type Response } from "express";
import pool from "../db.js";

const router = Router();

function escapeXml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT i.title, i.url, i.description, i.published_at, i.platform,
              s.name as source_name
       FROM items i
       LEFT JOIN sources s ON i.source_id = s.id
       ORDER BY i.score DESC, i.published_at DESC
       LIMIT 20`
    );

    const baseUrl = process.env.PUBLIC_URL || "https://devpulse.ai";
    const now = new Date().toUTCString();

    const itemsXml = result.rows
      .map(
        (item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <description>${escapeXml(item.description || "")}</description>
      <pubDate>${new Date(item.published_at).toUTCString()}</pubDate>
      <source url="${escapeXml(item.url)}">${escapeXml(item.source_name || item.platform || "")}</source>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
    </item>`
      )
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>DevPulse — AI &amp; ML Daily</title>
    <link>${baseUrl}</link>
    <description>Top AI and machine learning news, refreshed every 6 hours. Ranked by Groq AI.</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/api/rss" rel="self" type="application/rss+xml"/>${itemsXml}
  </channel>
</rss>`;

    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    console.error("RSS feed error:", err);
    res.status(500).send("Failed to generate RSS feed");
  }
});

export default router;
