import { Router, Request, Response } from "express";
import pool from "../db.js";
import { safeFetch } from "../fetchers/http.js";

const router = Router();

const AA_URL = "https://artificialanalysis.ai/api/v2/data/llms/models";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — free tier is 1,000 req/day; cache aggressively

export interface BenchmarkModel {
  id: string;
  name: string;
  slug: string;
  creator: string;
  creator_slug: string;
  intelligence_index: number | null;
  coding_index: number | null;
  output_tokens_per_second: number | null;
  time_to_first_token_seconds: number | null;
  price_1m_input: number | null;
  price_1m_output: number | null;
  price_1m_blended: number | null;
}

let cache: { data: BenchmarkModel[]; fetchedAt: number } | null = null;
let inflight: Promise<BenchmarkModel[]> | null = null;

async function fetchBenchmarks(): Promise<BenchmarkModel[]> {
  const apiKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
  if (!apiKey) throw Object.assign(new Error("not configured"), { code: "NO_KEY" });

  const res = await safeFetch(AA_URL, {
    headers: { "x-api-key": apiKey },
    timeoutMs: 20_000,
  });
  if (!res.ok) throw new Error(`Artificial Analysis API HTTP ${res.status}`);
  const body = (await res.json()) as { data?: any[] };
  if (!Array.isArray(body.data)) throw new Error("Unexpected Artificial Analysis response shape");

  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

  return body.data
    .map((m): BenchmarkModel => ({
      id: String(m.id ?? ""),
      name: String(m.name ?? ""),
      slug: String(m.slug ?? ""),
      creator: String(m.model_creator?.name ?? ""),
      creator_slug: String(m.model_creator?.slug ?? ""),
      intelligence_index: num(m.evaluations?.artificial_analysis_intelligence_index),
      coding_index: num(m.evaluations?.artificial_analysis_coding_index),
      output_tokens_per_second: num(m.median_output_tokens_per_second),
      time_to_first_token_seconds: num(m.median_time_to_first_token_seconds),
      price_1m_input: num(m.pricing?.price_1m_input_tokens),
      price_1m_output: num(m.pricing?.price_1m_output_tokens),
      price_1m_blended: num(m.pricing?.price_1m_blended_3_to_1),
    }))
    .filter((m) => m.name && m.intelligence_index !== null)
    .sort((a, b) => (b.intelligence_index ?? 0) - (a.intelligence_index ?? 0));
}

// GET /api/benchmarks — LLM benchmark leaderboard (data by Artificial Analysis)
router.get("/", async (_req: Request, res: Response) => {
  try {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      res.json({ models: cache.data, fetched_at: cache.fetchedAt, attribution: "https://artificialanalysis.ai/" });
      return;
    }
    // Coalesce concurrent refreshes into a single upstream request
    inflight ??= fetchBenchmarks().finally(() => { inflight = null; });
    const data = await inflight;
    cache = { data, fetchedAt: Date.now() };
    res.json({ models: data, fetched_at: cache.fetchedAt, attribution: "https://artificialanalysis.ai/" });
  } catch (err) {
    if ((err as { code?: string }).code === "NO_KEY") {
      res.status(503).json({ error: "Benchmarks not configured" });
      return;
    }
    console.error("GET /benchmarks error:", err);
    // Serve stale cache on upstream failure rather than erroring out
    if (cache) {
      res.json({ models: cache.data, fetched_at: cache.fetchedAt, attribution: "https://artificialanalysis.ai/", stale: true });
      return;
    }
    res.status(502).json({ error: "Failed to fetch benchmarks" });
  }
});

// ── Persistence ──────────────────────────────────────────────────────

/**
 * Snapshot today's leaderboard into `benchmark_snapshots`.
 *
 * The in-process cache above is lost on every deploy, so before this the
 * product could only ever show a leaderboard's current state. Movement over
 * time — who gained, what got cheaper — is the part that stays interesting
 * after the release-news cycle has moved on, and it only exists if someone
 * writes it down. Runs nightly from cron; one row per model per day.
 */
export async function snapshotBenchmarks(): Promise<{ captured: number }> {
  if (!process.env.ARTIFICIAL_ANALYSIS_API_KEY) {
    console.log("📊 Benchmark snapshot skipped: ARTIFICIAL_ANALYSIS_API_KEY not set");
    return { captured: 0 };
  }

  let models: BenchmarkModel[];
  try {
    models = await fetchBenchmarks();
  } catch (err) {
    console.error("📊 Benchmark snapshot failed to fetch:", (err as Error).message);
    return { captured: 0 };
  }

  if (models.length === 0) return { captured: 0 };

  // Re-running on the same day refreshes rather than duplicating.
  await pool.query(
    `INSERT INTO benchmark_snapshots
       (captured_on, model_slug, model_name, creator, intelligence_index, coding_index,
        output_tokens_per_second, time_to_first_token_seconds,
        price_1m_input, price_1m_output, price_1m_blended)
     SELECT CURRENT_DATE, v.slug, v.name, v.creator, v.intel, v.coding,
            v.tps, v.ttft, v.pin, v.pout, v.pblend
       FROM (
         SELECT unnest($1::text[]) AS slug, unnest($2::text[]) AS name, unnest($3::text[]) AS creator,
                unnest($4::numeric[]) AS intel, unnest($5::numeric[]) AS coding,
                unnest($6::numeric[]) AS tps, unnest($7::numeric[]) AS ttft,
                unnest($8::numeric[]) AS pin, unnest($9::numeric[]) AS pout, unnest($10::numeric[]) AS pblend
       ) v
     ON CONFLICT (captured_on, model_slug) DO UPDATE SET
       model_name = EXCLUDED.model_name,
       intelligence_index = EXCLUDED.intelligence_index,
       coding_index = EXCLUDED.coding_index,
       output_tokens_per_second = EXCLUDED.output_tokens_per_second,
       time_to_first_token_seconds = EXCLUDED.time_to_first_token_seconds,
       price_1m_input = EXCLUDED.price_1m_input,
       price_1m_output = EXCLUDED.price_1m_output,
       price_1m_blended = EXCLUDED.price_1m_blended`,
    [
      models.map((m) => m.slug || m.id),
      models.map((m) => m.name),
      models.map((m) => m.creator),
      models.map((m) => m.intelligence_index),
      models.map((m) => m.coding_index),
      models.map((m) => m.output_tokens_per_second),
      models.map((m) => m.time_to_first_token_seconds),
      models.map((m) => m.price_1m_input),
      models.map((m) => m.price_1m_output),
      models.map((m) => m.price_1m_blended),
    ]
  );

  console.log(`📊 Benchmark snapshot: ${models.length} models captured`);
  return { captured: models.length };
}

/**
 * GET /api/benchmarks/movement — what changed since the earliest snapshot
 * within `days`. Returns nothing until at least two distinct days exist, which
 * is honest: there is no movement to report from a single observation.
 */
router.get("/movement", async (req: Request, res: Response) => {
  try {
    const days = Math.min(180, Math.max(2, Number(req.query.days) || 30));
    const { rows } = await pool.query(
      `WITH bounds AS (
         SELECT MIN(captured_on) AS first_day, MAX(captured_on) AS last_day
           FROM benchmark_snapshots
          WHERE captured_on >= CURRENT_DATE - make_interval(days => $1)
       )
       SELECT n.model_slug, n.model_name, n.creator,
              n.intelligence_index::float AS intelligence_now,
              o.intelligence_index::float AS intelligence_then,
              (n.intelligence_index - o.intelligence_index)::float AS intelligence_delta,
              n.price_1m_blended::float AS price_now,
              o.price_1m_blended::float AS price_then,
              (SELECT first_day FROM bounds)::text AS since,
              (SELECT last_day FROM bounds)::text AS as_of
         FROM benchmark_snapshots n
         JOIN bounds b ON n.captured_on = b.last_day
         LEFT JOIN benchmark_snapshots o
           ON o.model_slug = n.model_slug AND o.captured_on = b.first_day
        WHERE (SELECT first_day FROM bounds) < (SELECT last_day FROM bounds)
        ORDER BY n.intelligence_index DESC NULLS LAST
        LIMIT 40`,
      [days]
    );

    const { rows: dayRows } = await pool.query(
      `SELECT COUNT(DISTINCT captured_on)::int AS days FROM benchmark_snapshots`
    );

    res.json({
      movement: rows,
      snapshot_days: dayRows[0]?.days ?? 0,
      // Explicit rather than an empty array: "no history yet" and "nothing
      // moved" are different states and the UI should say which.
      has_history: rows.length > 0,
    });
  } catch (err) {
    console.error("GET /benchmarks/movement error:", err);
    res.status(500).json({ error: "Failed to load benchmark movement" });
  }
});

export default router;
