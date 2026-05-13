import { Router, Response } from "express";
import pool from "../db.js";
import { askLLM, hasLLMKey } from "../llm/client.js";
import { optionalAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

// In-memory cache: date string → brief content
const briefCache = new Map<string, object>();

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

async function generateBrief(date: string): Promise<object> {
  const items = await pool.query(`
    SELECT i.title, i.description, i.url, i.platform, i.score,
           t.name as topic_name, t.slug as topic_slug
    FROM items i
    LEFT JOIN topics t ON i.topic_id = t.id
    WHERE i.published_at >= NOW() - INTERVAL '36 hours'
    ORDER BY i.score DESC
    LIMIT 20
  `);

  if (items.rows.length === 0) {
    return { date, sections: [], generated: false, message: "No items yet today." };
  }

  // Group by topic
  const grouped: Record<string, { topic: string; slug: string; items: typeof items.rows }> = {};
  for (const row of items.rows) {
    const key = row.topic_slug || "general";
    if (!grouped[key]) grouped[key] = { topic: row.topic_name || "General", slug: key, items: [] };
    grouped[key].items.push(row);
  }

  const sections = Object.values(grouped)
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 6)
    .map(g => ({
      topic: g.topic,
      slug: g.slug,
      items: g.items.slice(0, 3).map(i => ({
        title: i.title,
        url: i.url,
        platform: i.platform,
        score: Math.round(i.score || 0),
      })),
      summary: null as string | null,
    }));

  // Ask LLM to write a one-paragraph brief per section if available
  if (hasLLMKey()) {
    const topSectionTitles = sections
      .slice(0, 4)
      .map(s => `${s.topic}: ${s.items.map(i => i.title).join("; ")}`)
      .join("\n");

    try {
      const intro = await askLLM([
        {
          role: "system",
          content: "You are a sharp tech editor writing a morning brief for developers. Be concise and insightful.",
        },
        {
          role: "user",
          content: `Write a 3-sentence morning brief for ${date} covering today's top developer news. Focus on what matters. Here are the top stories:\n${topSectionTitles}\n\nBe direct, no fluff.`,
        },
      ], { maxTokens: 200, fastModel: true });
      (sections as any)._intro = intro.text;

      for (const section of sections.slice(0, 4)) {
        const titles = section.items.map(i => i.title).join("; ");
        const res = await askLLM([
          { role: "system", content: "Write one tight sentence summarising this tech news cluster for developers." },
          { role: "user", content: `Topic: ${section.topic}\nStories: ${titles}` },
        ], { maxTokens: 80, fastModel: true });
        section.summary = res.text.trim();
      }
    } catch { /* summaries optional */ }
  }

  const intro = (sections as any)._intro || null;
  delete (sections as any)._intro;

  return { date, intro, sections, generated: true, generated_at: new Date().toISOString() };
}

// GET /api/brief
router.get("/", optionalAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const key = todayKey();
    if (!briefCache.has(key)) {
      briefCache.clear(); // drop yesterday's cache
      briefCache.set(key, await generateBrief(key));
    }
    res.json(briefCache.get(key));
  } catch (err) {
    console.error("Brief error:", err);
    res.status(500).json({ error: "Failed to generate brief" });
  }
});

// POST /api/brief/refresh — admin-triggered regeneration
router.post("/refresh", async (_req, res: Response) => {
  briefCache.clear();
  try {
    const key = todayKey();
    const brief = await generateBrief(key);
    briefCache.set(key, brief);
    res.json({ ok: true, ...brief });
  } catch (err) {
    res.status(500).json({ error: "Refresh failed" });
  }
});

export default router;
