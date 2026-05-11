import pool from "./db.js";

/**
 * Official AI lab channels + top researcher/educator channels.
 *
 * `url` stores the YouTube channel ID (used directly by the YouTube RSS
 * fetcher: https://www.youtube.com/feeds/videos.xml?channel_id=<id>).
 *
 * To verify or update a channel ID: open the channel page, View Source,
 * search for `"externalId":` or `<meta itemprop="channelId"` — that's the
 * canonical UC... ID.
 */
const YOUTUBE_AI_SOURCES: Array<{
  name: string;
  channelId: string;
  rating?: number;
}> = [
  // ── Official AI labs ─────────────────────────────────────
  { name: "Anthropic",        channelId: "UCrDwWp7EBBv4NwvScIpBDOA", rating: 5 },
  { name: "OpenAI",           channelId: "UCXZCJLdBC09xxGZ6gcdrc6A", rating: 5 },
  { name: "Google DeepMind",  channelId: "UCP7jMXSY2xbc3KCAE0MHQ-A", rating: 5 },
  { name: "Hugging Face",     channelId: "UCHlNU7kIZhRgSbhHvFoy72w", rating: 5 },
  { name: "Meta AI",          channelId: "UCu13H9pVsdNzlqJiqpkN_4Q", rating: 4 },

  // ── Conferences / community ───────────────────────────────
  { name: "AI Engineer",      channelId: "UCnZmjymG6wDhnIPlhPlRdvA", rating: 5 },

  // ── Researchers / educators ──────────────────────────────
  { name: "Andrej Karpathy",  channelId: "UCPk8mLtZdJN5x3i0pJRlf-A", rating: 5 },
  { name: "Two Minute Papers",channelId: "UCbfYPyITQ-7l4upoX8nvctg", rating: 4 },
  { name: "Yannic Kilcher",   channelId: "UCZHmQk67mSJgfCCTn7xBfew", rating: 4 },
  { name: "AI Explained",     channelId: "UCNJ1Ymd5yFuUPtn21xtRbbw", rating: 4 },
  { name: "3Blue1Brown",      channelId: "UCYO_jab_esuFRV4b17AJtAw", rating: 4 },
  { name: "Fireship",         channelId: "UCsBjURrPoezykLs9EqgamOA", rating: 4 },

  // ── Indian AI / dev educators ────────────────────────────
  { name: "Piyush Garg",      channelId: "UCyPBAMFlAIadIjt-4vPqaLw", rating: 4 },
  { name: "Hitesh Choudhary", channelId: "UCVjlmGGb1suVvwYXdMMSHNA", rating: 4 },
  { name: "Harkirat Singh",   channelId: "UC_seDWJHxCAkq95bCPoHj3Q", rating: 4 },
  { name: "Tanay Pratap",     channelId: "UCNFmBuclxQPe57orKiQKp5g", rating: 4 },
  { name: "Akshay Saini",     channelId: "UC3N9i_KvKZYP4F84FPIzgPQ", rating: 4 },
];

/**
 * Idempotent seed: inserts any missing official AI YouTube channels into
 * the `sources` table. Existing rows are not touched (matched on `url`).
 *
 * Called once on startup from cron.ts before the initial fetch.
 */
export async function seedYouTubeSources(): Promise<{
  added: number;
  skipped: number;
}> {
  let added = 0;
  let skipped = 0;

  for (const s of YOUTUBE_AI_SOURCES) {
    try {
      const result = await pool.query(
        `INSERT INTO sources (name, url, fetcher_key, is_active, rating)
         VALUES ($1, $2, 'youtube', true, $3)
         ON CONFLICT (url) DO NOTHING
         RETURNING id`,
        [s.name, s.channelId, s.rating ?? 4]
      );
      if (result.rows.length > 0) added++;
      else skipped++;
    } catch (err: any) {
      console.error(`  Seed source "${s.name}" failed: ${err.message}`);
    }
  }

  if (added > 0) {
    console.log(`🌱 Seeded ${added} new YouTube AI channels (${skipped} already present)`);
  }
  return { added, skipped };
}

// Allow running standalone: `bun run src/seed-sources.ts`
if (import.meta.main) {
  seedYouTubeSources()
    .then(({ added, skipped }) => {
      console.log(`Done. Added: ${added}, Skipped: ${skipped}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
