import pool from "../db.js";
import type { FetchResult, FetcherFn } from "./types.js";
import { fetchArxiv } from "./arxiv.js";
import { fetchReddit } from "./reddit.js";
import { fetchGithubTrending } from "./github-trending.js";
import { fetchHackerNews } from "./hacker-news.js";
import { fetchHuggingFace } from "./huggingface.js";
import { fetchTwitter } from "./twitter.js";
import { fetchLinkedIn } from "./linkedin.js";
import { fetchRSS } from "./rss.js";
import { fetchYouTube } from "./youtube.js";
import { fetchGNews } from "./gnews.js";
import { computeScores } from "../scorer.js";
import { classifyItems } from "../llm/topic-classifier.js";
import { summarizeItems } from "../llm/summarizer.js";

// ── Fetcher registry: fetcher_key (from sources table) → function ───

const registry: Record<string, FetcherFn> = {
  arxiv: fetchArxiv,
  reddit: fetchReddit,
  "github-trending": fetchGithubTrending,
  "hacker-news": fetchHackerNews,
  huggingface: fetchHuggingFace,
  twitter: fetchTwitter,
  linkedin: fetchLinkedIn,
  rss: fetchRSS,
  youtube: fetchYouTube,
  gnews: fetchGNews,
};

interface FetchStats {
  sourcesProcessed: number;
  itemsFetched: number;
  itemsInserted: number;
  errors: string[];
}

/**
 * Main orchestrator — called by cron and POST /api/fetch.
 * 1. Pull active sources from DB
 * 2. Run matching fetcher for each source (real API call)
 * 3. Insert with dedup (ON CONFLICT DO NOTHING)
 * 4. Score → Classify (LLM) → Summarize (LLM)
 */
export async function runAllFetchers(
  fetcherKey?: string
): Promise<FetchStats> {
  const stats: FetchStats = {
    sourcesProcessed: 0,
    itemsFetched: 0,
    itemsInserted: 0,
    errors: [],
  };

  // 1. Get active sources from DB
  let q = "SELECT * FROM sources WHERE is_active = true";
  const params: unknown[] = [];
  if (fetcherKey) {
    q += " AND fetcher_key = $1";
    params.push(fetcherKey);
  }
  const { rows: sources } = await pool.query(q, params);

  if (sources.length === 0) {
    console.log("No active sources to fetch");
    return stats;
  }

  const newItemIds: number[] = [];

  // 2. Run each fetcher
  for (const source of sources) {
    const fetcher = registry[source.fetcher_key];
    if (!fetcher) {
      stats.errors.push(`No fetcher for key: ${source.fetcher_key}`);
      continue;
    }

    try {
      console.log(`⏳ Fetching: ${source.name}`);
      const items = await fetcher(source.url);
      stats.sourcesProcessed++;
      stats.itemsFetched += items.length;

      // 3. Insert with URL dedup
      for (const item of items) {
        try {
          const result = await pool.query(
            `INSERT INTO items (source_id, title, description, url, type, platform, tags, published_at, metadata, image_url, author, duration)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (url) DO NOTHING
             RETURNING id`,
            [
              source.id,
              item.title.slice(0, 500),
              item.description?.slice(0, 1000) || null,
              item.url,
              item.type,
              item.platform,
              item.tags,
              item.publishedAt,
              JSON.stringify(item.metadata || {}),
              item.imageUrl || null,
              item.author || null,
              item.duration || null,
            ]
          );
          if (result.rows.length > 0) {
            newItemIds.push(result.rows[0].id);
            stats.itemsInserted++;
          }
        } catch (insertErr: any) {
          console.error(
            `  Skip "${item.title.slice(0, 40)}": ${insertErr.message}`
          );
        }
      }

      await pool.query(
        "UPDATE sources SET last_fetched = NOW() WHERE id = $1",
        [source.id]
      );
      console.log(
        `  ✅ ${source.name}: ${items.length} fetched, ${stats.itemsInserted} new`
      );
    } catch (err: any) {
      const msg = `${source.name}: ${err.message}`;
      stats.errors.push(msg);
      console.error(`  ❌ ${msg}`);
    }
  }

  // 4. Post-processing pipeline for new items
  if (newItemIds.length > 0) {
    console.log(`\n📊 Post-processing ${newItemIds.length} new items…`);

    // 4a. Score (engagement + recency)
    try {
      await computeScores(newItemIds);
      console.log("  ✅ Scores computed");
    } catch (err) {
      console.error("  ❌ Scoring failed:", err);
    }

    // 4b. Classify into topics (LLM → keyword fallback)
    try {
      const { rows } = await pool.query(
        "SELECT id, title, description, tags FROM items WHERE id = ANY($1) AND topic_id IS NULL",
        [newItemIds]
      );
      const topicMap = await classifyItems(rows);
      for (const [itemId, topicId] of topicMap) {
        await pool.query("UPDATE items SET topic_id = $1 WHERE id = $2", [
          topicId,
          itemId,
        ]);
      }
      console.log(`  ✅ ${topicMap.size} items classified`);
    } catch (err) {
      console.error("  ❌ Classification failed:", err);
    }

    // 4c. LLM summarize (concise 1-2 sentence descriptions)
    try {
      const { rows } = await pool.query(
        "SELECT id, title, description, platform FROM items WHERE id = ANY($1)",
        [newItemIds]
      );
      const summaryMap = await summarizeItems(rows);
      for (const [itemId, summary] of summaryMap) {
        await pool.query(
          `UPDATE items SET description = $1,
                  metadata = metadata || '{"llm_summarized":true}'::jsonb
           WHERE id = $2`,
          [summary, itemId]
        );
      }
      console.log(`  ✅ ${summaryMap.size} items summarized`);
    } catch (err) {
      console.error("  ❌ Summarization failed:", err);
    }
  }

  console.log(
    `\n🏁 Done: ${stats.sourcesProcessed} sources, ${stats.itemsFetched} fetched, ${stats.itemsInserted} new`
  );
  return stats;
}
