import { Router, Request, Response } from "express";
import pool from "../db.js";

const router = Router();

// GET /api/items — list items with optional filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const { type, platform, topic_id, topic, search, sort, limit, offset } = req.query;

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
      // Accept comma-separated topic slugs
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

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const orderBy =
      sort === "oldest" ? "i.published_at ASC" :
      sort === "top" ? "i.score DESC" :
      "i.published_at DESC";

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
    const countQuery = needsTopicJoin
      ? `SELECT COUNT(*) FROM items i LEFT JOIN topics t ON i.topic_id = t.id ${where}`
      : `SELECT COUNT(*) FROM items i ${where}`;

    const [itemsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params),
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
