import pool from "../src/db.js";
import { KEYWORD_MAP } from "../src/llm/topic-classifier.js";

// Load all unclassified items + items in "general" topic
const { rows: items } = await pool.query(`
  SELECT i.id, i.title, i.description, i.tags
  FROM items i
  LEFT JOIN topics t ON i.topic_id = t.id
  WHERE i.topic_id IS NULL OR t.slug = $1
  LIMIT 500
`, ["general"]);

console.log(`Backfilling ${items.length} items...`);

// Load topics from DB
const { rows: topics } = await pool.query("SELECT id, slug FROM topics");
const topicMap = new Map(topics.map((t: any) => [t.slug, t.id]));
const generalId = topicMap.get("general");

let updated = 0;
for (const item of items) {
  const haystack = `${item.title} ${item.description || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
  let matched = false;
  for (const [slug, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(kw => haystack.includes(kw))) {
      const topicId = topicMap.get(slug);
      if (topicId) {
        await pool.query("UPDATE items SET topic_id = $1 WHERE id = $2", [topicId, item.id]);
        updated++;
        matched = true;
        break;
      }
    }
  }
  // leave unmatched items in general
}

// Count coding-agents
const { rows: ca } = await pool.query("SELECT COUNT(*) FROM items i JOIN topics t ON i.topic_id = t.id WHERE t.slug = $1", ["coding-agents"]);
console.log(`Updated ${updated} items. coding-agents now has: ${ca[0].count} items`);
await pool.end();

