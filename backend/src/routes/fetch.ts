import { Router, Request, Response } from "express";
import { runAllFetchers } from "../fetchers/index.js";
import { classifyItems } from "../llm/topic-classifier.js";
import pool from "../db.js";
import { requireAdmin, requireAdminOrCronSecret, AuthRequest } from "../middleware/auth.js";

const router = Router();

// POST /api/fetch — trigger all active fetchers (admin JWT or X-Cron-Secret header)
router.post("/", requireAdminOrCronSecret, async (_req: Request, res: Response) => {
  try {
    const result = await runAllFetchers();
    res.json(result);
  } catch (err) {
    console.error("Error running fetchers:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// POST /api/fetch/:fetcherKey — trigger a specific fetcher (admin only)
router.post("/:fetcherKey", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { fetcherKey } = req.params;
    const result = await runAllFetchers(fetcherKey);
    res.json(result);
  } catch (err) {
    console.error("Error running fetcher:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// POST /api/fetch/reclassify — re-classify items in "General" topic (admin only)
router.post("/reclassify/general", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const generalTopic = await pool.query(
      "SELECT id FROM topics WHERE slug = 'general'"
    );
    if (generalTopic.rows.length === 0) {
      res.json({ reclassified: 0 });
      return;
    }
    const generalId = generalTopic.rows[0].id;

    const { rows: items } = await pool.query(
      "SELECT id, title, description, tags FROM items WHERE topic_id = $1",
      [generalId]
    );

    console.log(`🔄 Re-classifying ${items.length} items from General…`);
    const mapping = await classifyItems(items);

    let reclassified = 0;
    for (const [itemId, topicId] of mapping) {
      if (topicId !== generalId) {
        await pool.query("UPDATE items SET topic_id = $1 WHERE id = $2", [topicId, itemId]);
        reclassified++;
      }
    }
    console.log(`  ✅ Re-classified ${reclassified} items out of ${items.length}`);
    res.json({ total: items.length, reclassified });
  } catch (err) {
    console.error("Error reclassifying:", err);
    res.status(500).json({ error: "Reclassify failed" });
  }
});

export default router;
