import { parseArgs } from "node:util";
import { mkdirSync, openSync, writeFileSync, fsyncSync, closeSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { retentionDays, RETENTION_PREDICATE } from "../src/retention.js";

const { values } = parseArgs({ options: {
  apply: { type: "boolean", default: false },
  before: { type: "string" },
  "max-delete": { type: "string" },
}, strict: true });
const days = retentionDays(process.env.RETENTION_DAYS);
const asOf = values.before ? new Date(values.before) : new Date();
if (!Number.isFinite(asOf.getTime())) throw new Error("Invalid --before timestamp");
const maximum = Number(values["max-delete"]);
if (values.apply && (!values.before || !Number.isInteger(maximum) || maximum < 1)) {
  throw new Error("Applying requires --before AUDIT_TIMESTAMP and --max-delete APPROVED_COUNT");
}

process.env.PG_POOL_MAX = "1";
const { default: pool } = await import("../src/db.js");
const client = await pool.connect();
try {
  await client.query(values.apply ? "BEGIN" : "BEGIN READ ONLY");
  await client.query("SET LOCAL lock_timeout = '5s'");
  await client.query("SET LOCAL statement_timeout = '20s'");
  const params = [days, asOf.toISOString()];
  const selection = await client.query(
    `SELECT to_jsonb(i) AS item FROM items i WHERE ${RETENTION_PREDICATE} ORDER BY i.id ${values.apply ? "FOR UPDATE OF i" : ""}`, params
  );
  console.log(JSON.stringify({ mode: values.apply ? "apply" : "preview", days, asOf, candidates: selection.rowCount }));
  if (values.apply && selection.rows.length > 0) {
    if (selection.rows.length > maximum) throw new Error("Candidate count exceeds approval; nothing deleted");
    const dependencies = await client.query(`SELECT conrelid::regclass::text AS child FROM pg_constraint WHERE contype = 'f' AND confrelid = 'items'::regclass`);
    const protectedTables = new Set(["user_saves", "user_seen_items", "concept_sources"]);
    if (dependencies.rows.some((row) => !protectedTables.has(row.child))) throw new Error("Unexpected dependent table; review backup scope first");
    const directory = join(homedir(), ".devpulse", "backups");
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const path = join(directory, `items-retention-${Date.now()}.json`);
    const payload = JSON.stringify({ version: 1, table: "items", createdAt: new Date().toISOString(), asOf, days, rows: selection.rows.map((row) => row.item) });
    const descriptor = openSync(path, "wx", 0o600);
    try { writeFileSync(descriptor, payload); fsyncSync(descriptor); } finally { closeSync(descriptor); }
    const hash = createHash("sha256").update(payload).digest("hex");
    if (createHash("sha256").update(readFileSync(path)).digest("hex") !== hash) throw new Error("Backup verification failed");
    console.log(JSON.stringify({ backup: path, sha256: hash, rows: selection.rows.length }));
    const deleted = await client.query(
      `DELETE FROM items i WHERE i.id = ANY($3::int[]) AND ${RETENTION_PREDICATE} RETURNING i.id`,
      [...params, selection.rows.map((row) => row.item.id)]
    );
    if (deleted.rowCount !== selection.rowCount) throw new Error("Candidates changed; rolling back deletion");
    await client.query("COMMIT");
    console.log(JSON.stringify({ deleted: deleted.rowCount, backup: path }));
  } else {
    await client.query("ROLLBACK");
    console.log("No rows deleted");
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
