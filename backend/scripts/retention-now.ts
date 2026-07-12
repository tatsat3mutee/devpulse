// One-off: report item age distribution and apply the retention policy now.
// Usage: bun run scripts/retention-now.ts   (from the backend/ dir)
import pool from "../src/db.js";

const RETENTION_DAYS = Number(process.env.RETENTION_DAYS) || 30;

const total = await pool.query("SELECT COUNT(*)::int AS n FROM items");
const buckets = await pool.query(`
  SELECT
    COUNT(*) FILTER (WHERE COALESCE(published_at, fetched_at) < NOW() - INTERVAL '30 days')::int AS older_30,
    COUNT(*) FILTER (WHERE COALESCE(published_at, fetched_at) < NOW() - INTERVAL '14 days')::int AS older_14,
    COUNT(*) FILTER (WHERE COALESCE(published_at, fetched_at) < NOW() - INTERVAL '7 days')::int  AS older_7
  FROM items
`);
console.log("BEFORE total:", total.rows[0].n, "| age buckets:", buckets.rows[0]);

const del = await pool.query(
  `DELETE FROM items
    WHERE COALESCE(published_at, fetched_at) < NOW() - make_interval(days => $1::int)
      AND id NOT IN (SELECT item_id FROM user_saves)`,
  [RETENTION_DAYS]
);
const after = await pool.query("SELECT COUNT(*)::int AS n FROM items");
console.log(`DELETED >${RETENTION_DAYS}d (keeping saved):`, del.rowCount, "| AFTER total:", after.rows[0].n);
process.exit(0);
