import pool from "../src/db.js";
const r = await pool.query("SELECT COUNT(*) FROM items WHERE topic_id IS NULL");
console.log("Unclassified items:", r.rows[0].count);
// Check coding-agent items currently mapped to wrong topics
const wrong = await pool.query(`SELECT t.slug, COUNT(*) FROM items i JOIN topics t ON i.topic_id = t.id WHERE i.title ILIKE ANY(ARRAY[$1,$2,$3,$4,$5]) GROUP BY t.slug`, ["%aider%", "%cline%", "%devin%", "%cursor%", "%claude code%"]);
console.log("Matching items by current topic:", JSON.stringify(wrong.rows));
await pool.end();

