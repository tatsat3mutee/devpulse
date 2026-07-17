import { Router, Request, Response } from "express";
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

export default router;
