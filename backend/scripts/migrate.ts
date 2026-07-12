// Minimal migration runner: applies sql/*.sql files in name order, tracking
// applied files in a schema_migrations table. Run: bun run backend/scripts/migrate.ts
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pool from "../src/db.js";

const sqlDir = join(dirname(fileURLToPath(import.meta.url)), "../../sql");

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const files = readdirSync(sqlDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
  const { rows } = await pool.query("SELECT filename FROM schema_migrations");
  const applied = new Set(rows.map((r: { filename: string }) => r.filename));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`⏭  skipped ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(join(sqlDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`✅ applied ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`❌ failed ${file}:`, err instanceof Error ? err.message : err);
      client.release();
      await pool.end();
      process.exit(1);
    }
    client.release();
  }

  await pool.end();
  console.log("Migrations complete.");
}

migrate();
