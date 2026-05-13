import { Router, Response } from "express";
import pool from "../db.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

// Create tables on module load
pool.query(`
  CREATE TABLE IF NOT EXISTS user_topic_follows (
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id  INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, topic_id)
  );
  CREATE TABLE IF NOT EXISTS user_source_mutes (
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, source_id)
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'developer';
`).catch(err => console.error("prefs table init error:", err));

// GET /api/prefs
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.userId!;
    const [topicsRes, sourcesRes, roleRes] = await Promise.all([
      pool.query(
        `SELECT tf.topic_id, t.name, t.slug FROM user_topic_follows tf
         JOIN topics t ON t.id = tf.topic_id WHERE tf.user_id = $1`,
        [uid]
      ),
      pool.query(
        `SELECT sm.source_id, s.name FROM user_source_mutes sm
         JOIN sources s ON s.id = sm.source_id WHERE sm.user_id = $1`,
        [uid]
      ),
      pool.query(`SELECT role FROM users WHERE id = $1`, [uid]),
    ]);
    res.json({
      followed_topics: topicsRes.rows,
      muted_sources: sourcesRes.rows,
      role: roleRes.rows[0]?.role ?? "developer",
    });
  } catch (err) {
    console.error("GET /prefs error:", err);
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

// POST /api/prefs/topics/:topicId — follow topic
router.post("/topics/:topicId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      `INSERT INTO user_topic_follows (user_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.userId!, Number(req.params.topicId)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /prefs/topics error:", err);
    res.status(500).json({ error: "Failed to follow topic" });
  }
});

// DELETE /api/prefs/topics/:topicId — unfollow topic
router.delete("/topics/:topicId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      `DELETE FROM user_topic_follows WHERE user_id = $1 AND topic_id = $2`,
      [req.userId!, Number(req.params.topicId)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /prefs/topics error:", err);
    res.status(500).json({ error: "Failed to unfollow topic" });
  }
});

// POST /api/prefs/sources/:sourceId/mute — mute source
router.post("/sources/:sourceId/mute", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      `INSERT INTO user_source_mutes (user_id, source_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.userId!, Number(req.params.sourceId)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /prefs/sources/mute error:", err);
    res.status(500).json({ error: "Failed to mute source" });
  }
});

// DELETE /api/prefs/sources/:sourceId/mute — unmute source
router.delete("/sources/:sourceId/mute", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      `DELETE FROM user_source_mutes WHERE user_id = $1 AND source_id = $2`,
      [req.userId!, Number(req.params.sourceId)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /prefs/sources/mute error:", err);
    res.status(500).json({ error: "Failed to unmute source" });
  }
});

// PATCH /api/prefs/role — update role
router.patch("/role", requireAuth, async (req: AuthRequest, res: Response) => {
  const { role } = req.body as { role?: string };
  const valid = ["developer", "pm", "designer", "qa"];
  if (!role || !valid.includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  try {
    await pool.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, req.userId!]);
    res.json({ ok: true, role });
  } catch (err) {
    console.error("PATCH /prefs/role error:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

export default router;
