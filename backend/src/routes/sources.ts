import { Router, Request, Response } from "express";
import pool from "../db.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/sources — list all sources with status
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        s.*,
        COUNT(i.id)::int AS item_count
      FROM sources s
      LEFT JOIN items i ON i.source_id = s.id
      GROUP BY s.id
      ORDER BY s.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching sources:", err);
    res.status(500).json({ error: "Failed to fetch sources" });
  }
});

// PATCH /api/sources/:id — toggle active, update rating, etc. (admin only)
router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { is_active, rating } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (typeof is_active === "boolean") {
      updates.push(`is_active = $${idx++}`);
      params.push(is_active);
    }
    if (rating !== undefined) {
      updates.push(`rating = $${idx++}`);
      params.push(Number(rating));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    params.push(req.params.id);
    const result = await pool.query(
      `UPDATE sources SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Source not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating source:", err);
    res.status(500).json({ error: "Failed to update source" });
  }
});

export default router;
