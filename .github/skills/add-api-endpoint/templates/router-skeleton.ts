import { Router, Request, Response } from "express";
import pool from "../db.js";

const router = Router();

/**
 * GET /api/{{resource}} — list {{resource}} with optional filters
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { search, sort, limit, offset } = req.query;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    // Add filters as needed:
    // if (category) {
    //   conditions.push(`r.category = $${paramIdx++}`);
    //   params.push(category);
    // }

    if (search) {
      conditions.push(`(r.title ILIKE $${paramIdx} OR r.description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const orderBy =
      sort === "oldest" ? "r.created_at ASC" :
      sort === "name" ? "r.name ASC" :
      "r.created_at DESC";

    const lim = Math.min(Number(limit) || 50, 200);
    const off = Number(offset) || 0;

    const query = `
      SELECT r.*
      FROM {{table}} r
      ${where}
      ORDER BY ${orderBy}
      LIMIT ${lim} OFFSET ${off}
    `;

    const countQuery = `SELECT COUNT(*) FROM {{table}} r ${where}`;

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
    console.error("Error fetching {{resource}}:", err);
    res.status(500).json({ error: "Failed to fetch {{resource}}" });
  }
});

/**
 * GET /api/{{resource}}/:id — single {{resource}}
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM {{table}} WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "{{Resource}} not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching {{resource}}:", err);
    res.status(500).json({ error: "Failed to fetch {{resource}}" });
  }
});

export default router;
