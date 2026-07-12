import pool from "../src/db";

const result = await pool.query(`
  UPDATE items SET score = ROUND((
    LEAST(100, (LN(1 + CASE
      WHEN platform = 'Reddit' THEN
        COALESCE((metadata->>'upvotes')::numeric, 0) * 0.7 + COALESCE((metadata->>'comments')::numeric, 0) * 0.3
      WHEN platform = 'Hacker News' THEN
        COALESCE((metadata->>'points')::numeric, 0) * 0.7 + COALESCE((metadata->>'comments')::numeric, 0) * 0.3
      WHEN platform = 'GitHub' THEN
        COALESCE((metadata->>'stars')::numeric, 0) * 0.5 + COALESCE((metadata->>'forks')::numeric, 0) * 0.3 + COALESCE((metadata->>'watchers')::numeric, 0) * 0.2
      WHEN platform = 'Hugging Face' THEN
        COALESCE((metadata->>'likes')::numeric, 0) * 1.5
      WHEN platform = 'arXiv' THEN 45
      ELSE 20
    END) / LN(10001)) * 100) * 0.7
    +
    CASE
      WHEN published_at IS NULL THEN 30
      WHEN EXTRACT(EPOCH FROM (NOW() - published_at)) / 3600 < 6 THEN 100
      WHEN EXTRACT(EPOCH FROM (NOW() - published_at)) / 3600 < 24 THEN 90
      WHEN EXTRACT(EPOCH FROM (NOW() - published_at)) / 3600 < 72 THEN 70
      WHEN EXTRACT(EPOCH FROM (NOW() - published_at)) / 3600 < 168 THEN 50
      WHEN EXTRACT(EPOCH FROM (NOW() - published_at)) / 3600 < 336 THEN 30
      ELSE 10
    END * 0.3
  )::numeric, 2)
`);

console.log("Bulk re-scored", result.rowCount, "items");
process.exit(0);
