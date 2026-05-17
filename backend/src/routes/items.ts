import { Router, Request, Response } from "express";
import pool from "../db.js";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

// Create seen-items table on module load
pool.query(`
  CREATE TABLE IF NOT EXISTS user_seen_items (
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id   INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    seen_at   TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, item_id)
  );
  CREATE INDEX IF NOT EXISTS idx_seen_user ON user_seen_items(user_id, seen_at DESC);
`).catch(err => console.error("seen_items table init error:", err));

// POST /api/items/seen — bulk-mark items as seen
router.post("/seen", requireAuth, async (req: AuthRequest, res: Response) => {
  const { item_ids } = req.body as { item_ids?: unknown };
  if (!Array.isArray(item_ids) || item_ids.length === 0) {
    res.status(400).json({ error: "item_ids must be a non-empty array" });
    return;
  }
  const ids = (item_ids as unknown[]).map(Number).filter(n => Number.isFinite(n) && n > 0);
  if (ids.length === 0) {
    res.status(400).json({ error: "No valid item ids" });
    return;
  }
  try {
    const uid = req.userId!;
    const values = ids.map((id, i) => `($1, $${i + 2})`).join(", ");
    await pool.query(
      `INSERT INTO user_seen_items (user_id, item_id) VALUES ${values} ON CONFLICT DO NOTHING`,
      [uid, ...ids]
    );
    res.json({ ok: true, marked: ids.length });
  } catch (err) {
    console.error("POST /items/seen error:", err);
    res.status(500).json({ error: "Failed to mark items seen" });
  }
});

// GET /api/items — list items with optional filters
router.get("/", optionalAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { type, platform, topic_id, topic, search, sort, limit, offset, since, hide_seen, personalized } = req.query;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (type) {
      conditions.push(`i.type = $${paramIdx++}`);
      params.push(type);
    }
    if (platform) {
      conditions.push(`i.platform = $${paramIdx++}`);
      params.push(platform);
    }
    if (topic_id) {
      conditions.push(`i.topic_id = $${paramIdx++}`);
      params.push(Number(topic_id));
    }
    if (topic) {
      const slugs = String(topic).split(",").map(s => s.trim()).filter(Boolean);
      const placeholders = slugs.map((_, i) => `$${paramIdx + i}`).join(", ");
      conditions.push(`t.slug IN (${placeholders})`);
      params.push(...slugs);
      paramIdx += slugs.length;
    }
    if (search) {
      conditions.push(`(i.title ILIKE $${paramIdx} OR i.description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (since) {
      const sinceDate = new Date(String(since));
      if (!isNaN(sinceDate.getTime())) {
        conditions.push(`i.published_at >= $${paramIdx++}`);
        params.push(sinceDate.toISOString());
      }
    }

    // Hide seen items (logged-in only)
    if (hide_seen === "true" && authReq.userId) {
      conditions.push(`i.id NOT IN (SELECT item_id FROM user_seen_items WHERE user_id = $${paramIdx++})`);
      params.push(authReq.userId);
    }

    // Mute sources (personalized, logged-in only)
    if (personalized === "true" && authReq.userId) {
      conditions.push(`(i.source_id IS NULL OR i.source_id NOT IN (SELECT source_id FROM user_source_mutes WHERE user_id = $${paramIdx++}))`);
      params.push(authReq.userId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Build ORDER BY — personalized boosts followed topics
    let orderBy: string;
    if (personalized === "true" && authReq.userId) {
      const uidParam = paramIdx++;
      params.push(authReq.userId);
      if (sort === "top") {
        orderBy = `CASE WHEN i.topic_id IN (SELECT topic_id FROM user_topic_follows WHERE user_id = $${uidParam}) THEN i.score * 1.5 ELSE i.score END DESC`;
      } else if (sort === "oldest") {
        orderBy = "i.published_at ASC";
      } else {
        orderBy = `i.published_at DESC, CASE WHEN i.topic_id IN (SELECT topic_id FROM user_topic_follows WHERE user_id = $${uidParam}) THEN 1 ELSE 0 END DESC`;
      }
    } else {
      orderBy =
        sort === "oldest" ? "i.published_at ASC" :
        sort === "top" ? "i.score DESC" :
        "i.published_at DESC";
    }

    const lim = Math.min(Number(limit) || 50, 200);
    const off = Number(offset) || 0;

    const query = `
      SELECT i.*, t.name as topic_name, t.slug as topic_slug, s.name as source_name
      FROM items i
      LEFT JOIN topics t ON i.topic_id = t.id
      LEFT JOIN sources s ON i.source_id = s.id
      ${where}
      ORDER BY ${orderBy}
      LIMIT ${lim} OFFSET ${off}
    `;

    const needsTopicJoin = conditions.some(c => c.includes("t."));
    const countParams = params.slice(0, personalized === "true" && authReq.userId ? params.length - 1 : params.length);
    const countQuery = needsTopicJoin
      ? `SELECT COUNT(*) FROM items i LEFT JOIN topics t ON i.topic_id = t.id ${where}`
      : `SELECT COUNT(*) FROM items i ${where}`;

    const [itemsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    res.json({
      items: itemsResult.rows,
      total: Number(countResult.rows[0].count),
      limit: lim,
      offset: off,
    });
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// GET /api/items/:id — single item
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT i.*, t.name as topic_name, s.name as source_name
       FROM items i
       LEFT JOIN topics t ON i.topic_id = t.id
       LEFT JOIN sources s ON i.source_id = s.id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching item:", err);
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

// PATCH /api/items/:id/bookmark — toggle bookmark
router.patch("/:id/bookmark", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `UPDATE items SET is_bookmarked = NOT is_bookmarked WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error toggling bookmark:", err);
    res.status(500).json({ error: "Failed to toggle bookmark" });
  }
});

export default router;
