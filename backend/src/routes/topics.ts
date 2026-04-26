import { Router, Request, Response } from "express";
import pool from "../db.js";

const router = Router();

// GET /api/topics — list all topics with item counts
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        t.*,
        COUNT(i.id)::int AS item_count,
        MAX(i.published_at) AS latest_item_at
      FROM topics t
      LEFT JOIN items i ON i.topic_id = t.id
      GROUP BY t.id
      ORDER BY item_count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching topics:", err);
    res.status(500).json({ error: "Failed to fetch topics" });
  }
});

// GET /api/topics/:slug — single topic with its items
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const topicResult = await pool.query(
      `SELECT * FROM topics WHERE slug = $1`,
      [req.params.slug]
    );
    if (topicResult.rows.length === 0) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }
    const topic = topicResult.rows[0];

    const { type, sort } = req.query;
    const conditions = ["i.topic_id = $1"];
    const params: unknown[] = [topic.id];
    let paramIdx = 2;

    if (type) {
      conditions.push(`i.type = $${paramIdx++}`);
      params.push(type);
    }

    const orderBy =
      sort === "oldest" ? "i.published_at ASC" :
      sort === "top" ? "i.score DESC" :
      "i.published_at DESC";

    const itemsResult = await pool.query(
      `SELECT i.*, s.name AS source_name
       FROM items i
       LEFT JOIN sources s ON i.source_id = s.id
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${orderBy}
       LIMIT 100`,
      params
    );

    // Count by type for filter badges
    const typeCountResult = await pool.query(
      `SELECT type, COUNT(*)::int AS count
       FROM items WHERE topic_id = $1
       GROUP BY type ORDER BY count DESC`,
      [topic.id]
    );

    res.json({
      ...topic,
      items: itemsResult.rows,
      type_counts: typeCountResult.rows,
    });
  } catch (err) {
    console.error("Error fetching topic:", err);
    res.status(500).json({ error: "Failed to fetch topic" });
  }
});

export default router;
