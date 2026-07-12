// One-time backfill: normalize existing item URLs so dedup matches the
// normalizeUrl() applied to new inserts (sql/015+ era). Safe to re-run.
// Usage: bun run backend/scripts/normalize-urls.ts
import pool from "../src/db.js";
import { normalizeUrl } from "../src/fetchers/http.js";

async function main(): Promise<void> {
  const { rows } = await pool.query<{ id: number; url: string }>(
    "SELECT id, url FROM items ORDER BY id"
  );
  let updated = 0;
  let mergedDupes = 0;

  for (const row of rows) {
    const normalized = normalizeUrl(row.url);
    if (normalized === row.url) continue;

    try {
      await pool.query("UPDATE items SET url = $1 WHERE id = $2", [normalized, row.id]);
      updated++;
    } catch (err: any) {
      // Unique violation → a normalized twin already exists. Keep the twin,
      // repoint any user saves at it, then drop this duplicate.
      if (err.code === "23505") {
        const { rows: twin } = await pool.query<{ id: number }>(
          "SELECT id FROM items WHERE url = $1",
          [normalized]
        );
        if (twin.length > 0) {
          await pool.query(
            `UPDATE user_saves SET item_id = $1
              WHERE item_id = $2
                AND NOT EXISTS (SELECT 1 FROM user_saves s2 WHERE s2.item_id = $1 AND s2.user_id = user_saves.user_id)`,
            [twin[0].id, row.id]
          ).catch(() => {});
          await pool.query("DELETE FROM user_saves WHERE item_id = $1", [row.id]);
          await pool.query("DELETE FROM items WHERE id = $1", [row.id]);
          mergedDupes++;
        }
      } else {
        console.error(`  Skip id=${row.id}: ${err.message}`);
      }
    }
  }

  console.log(`✅ URL normalization done: ${updated} updated, ${mergedDupes} duplicates merged (of ${rows.length} items)`);
  await pool.end();
}

main().catch((err) => {
  console.error("normalize-urls failed:", err);
  process.exit(1);
});
