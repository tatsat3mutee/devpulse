import pool from "../src/db";

const { rows } = await pool.query(
  "SELECT title, platform, score, published_at FROM items ORDER BY score DESC LIMIT 10"
);
rows.forEach((r: any, i: number) =>
  console.log(`${i + 1}. [${r.score}] ${r.platform} - ${r.title?.substring(0, 70)}`)
);
process.exit(0);
