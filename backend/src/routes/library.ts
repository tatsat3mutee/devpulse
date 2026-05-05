import { Router, Response } from "express";
import pool from "../db.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

// GET /api/library — full saved items with joined data
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        us.id AS save_id,
        us.note,
        us.saved_at,
        i.*,
        t.name  AS topic_name,
        t.slug  AS topic_slug,
        s.name  AS source_name
       FROM user_saves us
       JOIN items i   ON i.id = us.item_id
       LEFT JOIN topics  t ON t.id = i.topic_id
       LEFT JOIN sources s ON s.id = i.source_id
       WHERE us.user_id = $1
       ORDER BY us.saved_at DESC`,
      [req.userId]
    );
    res.json({ saves: rows });
  } catch (err) {
    console.error("Library fetch error:", err);
    res.status(500).json({ error: "Failed to fetch library" });
  }
});

// GET /api/library/ids — lightweight: just the item IDs
router.get("/ids", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT item_id FROM user_saves WHERE user_id = $1",
      [req.userId]
    );
    res.json({ savedIds: rows.map((r) => r.item_id) });
  } catch (err) {
    console.error("Library ids error:", err);
    res.status(500).json({ error: "Failed to fetch saved IDs" });
  }
});

// POST /api/library — save an item
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { itemId, note } = req.body as { itemId?: number; note?: string };
  if (!itemId) { res.status(400).json({ error: "itemId is required" }); return; }

  try {
    const { rows } = await pool.query(
      `INSERT INTO user_saves (user_id, item_id, note)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, item_id) DO UPDATE SET note = EXCLUDED.note
       RETURNING *`,
      [req.userId, itemId, note ?? null]
    );
    res.status(201).json({ save: rows[0] });
  } catch (err: any) {
    if (err?.code === "23503") { res.status(404).json({ error: "Item not found" }); return; }
    console.error("Save item error:", err);
    res.status(500).json({ error: "Failed to save item" });
  }
});

// DELETE /api/library/:itemId — unsave
router.delete("/:itemId", requireAuth, async (req: AuthRequest, res: Response) => {
  const itemId = Number(req.params.itemId);
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM user_saves WHERE user_id = $1 AND item_id = $2",
      [req.userId, itemId]
    );
    if (!rowCount) { res.status(404).json({ error: "Save not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    console.error("Unsave error:", err);
    res.status(500).json({ error: "Failed to remove save" });
  }
});

// PATCH /api/library/:itemId — update note
router.patch("/:itemId", requireAuth, async (req: AuthRequest, res: Response) => {
  const itemId = Number(req.params.itemId);
  const { note } = req.body as { note?: string };
  try {
    const { rows, rowCount } = await pool.query(
      "UPDATE user_saves SET note = $1 WHERE user_id = $2 AND item_id = $3 RETURNING *",
      [note ?? null, req.userId, itemId]
    );
    if (!rowCount) { res.status(404).json({ error: "Save not found" }); return; }
    res.json({ save: rows[0] });
  } catch (err) {
    console.error("Update note error:", err);
    res.status(500).json({ error: "Failed to update note" });
  }
});

export default router;
