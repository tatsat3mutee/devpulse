import pool from "../src/db.js";
const r = await pool.query("SELECT title, published_at, fetched_at FROM items WHERE title ILIKE $1 ORDER BY fetched_at DESC LIMIT 5", ["%Visual Studio Code%"]);
console.log(JSON.stringify(r.rows, null, 2));
// Also check any items where published_at is very close to fetched_at (within 1 minute = bug)
const bug = await pool.query("SELECT COUNT(*) FROM items WHERE ABS(EXTRACT(EPOCH FROM (fetched_at - published_at))) < 60");
console.log("Items where published_at ˜ fetched_at (bug):", bug.rows[0].count);
await pool.end();

