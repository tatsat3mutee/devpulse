import { Router, Request, Response } from "express";
import pool from "../db.js";

const router = Router();

// GET /api/knowledge — list all published guides
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { category } = _req.query;
    let query = "SELECT id, title, slug, category, icon, difficulty, tags, created_at, updated_at FROM knowledge_guides WHERE is_published = true";
    const params: unknown[] = [];

    if (category) {
      query += " AND category = $1";
      params.push(category);
    }

    query += " ORDER BY created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching knowledge guides:", err);
    res.status(500).json({ error: "Failed to fetch guides" });
  }
});

// GET /api/knowledge/:slug — single guide with full content
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM knowledge_guides WHERE slug = $1 AND is_published = true",
      [req.params.slug]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Guide not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching guide:", err);
    res.status(500).json({ error: "Failed to fetch guide" });
  }
});

export default router;
