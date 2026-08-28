import { describe, expect, test } from "bun:test";
import {
  candidateGate,
  coerce,
  hasDurableAnchor,
  rejectReason,
  type CandidateRow,
} from "./extract.js";

const row = (over: Partial<CandidateRow> = {}): CandidateRow => ({
  id: 1,
  title: "Paged attention cuts KV cache memory waste",
  // Comfortably over MIN_BODY — the fixture must represent an item with enough
  // prose for a mechanism to actually be in the text.
  description:
    "A detailed walkthrough of how virtual-memory-style paging applied to the KV cache eliminates fragmentation, why contiguous allocation wastes VRAM, and what the throughput tradeoff actually looks like in production serving. It covers the block table indirection, the eviction policy, and the measured effect on achievable batch size across several model sizes.",
  url: "https://arxiv.org/abs/2309.06180",
  platform: "arXiv",
  type: "paper",
  source_role: "origin",
  metadata: {},
  published_at: new Date().toISOString(),
  ...over,
});

describe("hasDurableAnchor", () => {
  test("recognises papers, repos and first-party lab writing", () => {
    expect(hasDurableAnchor("https://arxiv.org/abs/2309.06180", {})).toBe(true);
    expect(hasDurableAnchor("https://github.com/vllm-project/vllm", {})).toBe(true);
    expect(hasDurableAnchor("https://www.anthropic.com/engineering/x", {})).toBe(true);
  });

  test("falls back to a pdfUrl in metadata", () => {
    expect(hasDurableAnchor("https://example.com/post", { pdfUrl: "https://x/y.pdf" })).toBe(true);
  });

  test("a random blog post is not an anchor", () => {
    expect(hasDurableAnchor("https://example.com/post", {})).toBe(false);
  });
});

describe("rejectReason", () => {
  test("passes a substantive, anchored item", () => {
    expect(rejectReason(row())).toBeNull();
  });

  test("rejects corroboration-only sources outright", () => {
    expect(rejectReason(row({ source_role: "corroboration" }))).toContain("corroboration");
  });

  test("rejects funding and acquisition news", () => {
    expect(rejectReason(row({ title: "Anthropic raises $2B at a $60B valuation" }))).toContain("noise");
    expect(rejectReason(row({ title: "Nvidia acquires an inference startup" }))).toContain("noise");
  });

  test("rejects listicles", () => {
    expect(rejectReason(row({ title: "10 best AI tools you must have in 2026" }))).toContain("noise");
    expect(rejectReason(row({ title: "Top 5 vector databases" }))).toContain("noise");
  });

  test("rejects thin items with nothing durable behind them", () => {
    const thin = row({ description: "Short blurb.", url: "https://example.com/x", platform: "Blog" });
    expect(rejectReason(thin)).toContain("thin");
  });

  /**
   * A durable anchor does NOT waive the body floor: the extractor only sees
   * title + description, so a one-line repo tagline has no mechanism in it
   * however authoritative the URL.
   */
  test("a durable anchor does not rescue a one-line description", () => {
    expect(rejectReason(row({ description: "Short blurb." }))).toContain("thin");
    expect(
      rejectReason(row({ url: "https://github.com/foo/bar", platform: "GitHub", description: "A fast MCP server." }))
    ).toContain("thin");
  });

  test("rejects launch and announcement framing", () => {
    for (const title of [
      "Introducing our new inference engine",
      "OpenAI announces a faster embedding model",
      "Acme launches Foo v2",
      "Bar is now available in public preview",
      "Show HN: my new MCP server",
    ]) {
      expect(rejectReason(row({ title }))).toContain("noise");
    }
  });

  test("rejects roundups and opinion pieces", () => {
    expect(rejectReason(row({ title: "This week in AI: everything that shipped" }))).toContain("noise");
    expect(rejectReason(row({ title: "Why you should stop using RAG" }))).toContain("noise");
  });

  test("rejects social item types outright", () => {
    expect(rejectReason(row({ type: "social" }))).toContain("social");
  });

  /**
   * The gate's core asymmetry: an anchored item is trusted because the paper or
   * repo behind it carries the detail; an unanchored one must supply its own.
   */
  test("the body floor applies to everyone", () => {
    const shortish = "x".repeat(200);
    expect(rejectReason(row({ description: shortish }))).toContain("thin");
    expect(
      rejectReason(row({ description: shortish, url: "https://example.com/x", platform: "Blog" }))
    ).toContain("thin");
    const long = "x".repeat(400);
    expect(
      rejectReason(row({ description: long, url: "https://example.com/x", platform: "Blog" }))
    ).toBeNull();
  });

  test("unanchored items from low-authority platforms are rejected even when long", () => {
    const long = "x".repeat(600);
    expect(
      rejectReason(row({ description: long, url: "https://example.com/x", platform: "Hacker News" }))
    ).toContain("low-authority");
    // Same length, first-party lab blog — passes.
    expect(
      rejectReason(row({ description: long, url: "https://example.com/x", platform: "Anthropic" }))
    ).toBeNull();
  });
});

describe("candidateGate", () => {
  test("partitions rows and records why each was dropped", () => {
    const { passed, rejected } = candidateGate([
      row({ id: 1 }),
      row({ id: 2, title: "Startup raises Series B" }),
      row({ id: 3, source_role: "corroboration" }),
    ]);
    expect(passed.map((r) => r.id)).toEqual([1]);
    expect(rejected).toHaveLength(2);
    expect(rejected.every((r) => r.reason.length > 0)).toBe(true);
  });
});

describe("coerce", () => {
  const valid = {
    is_concept: true,
    title: "Prefix caching cuts cost 85-95% on hits",
    hook: "Most of your prompt is the same every call.",
    claim_number: "85-95%",
    mechanism: "The KV cache for a shared prefix can be computed once and reused...",
    why_it_matters: "It changes how you should structure system prompts.",
    transfer: "Any workload with a stable preamble.",
    area: "inference-serving",
    difficulty: "deep",
    mechanism_density: 0.9,
    novelty: 0.6,
  };

  test("accepts a well-formed extraction", () => {
    const result = coerce(valid);
    expect(result?.title).toBe(valid.title);
    expect(result?.area).toBe("inference-serving");
  });

  test("returns null when the model says it is not a concept", () => {
    expect(coerce({ ...valid, is_concept: false })).toBeNull();
  });

  /** The schema-level expression of "no interpretation, no concept". */
  test("rejects an extraction with no why_it_matters", () => {
    expect(coerce({ ...valid, why_it_matters: "" })).toBeNull();
    expect(coerce({ ...valid, why_it_matters: "   " })).toBeNull();
    const { why_it_matters, ...missing } = valid;
    expect(coerce(missing)).toBeNull();
  });

  test("rejects an extraction with no mechanism or title", () => {
    expect(coerce({ ...valid, mechanism: "" })).toBeNull();
    expect(coerce({ ...valid, title: "" })).toBeNull();
  });

  test("falls back to the title when the hook is missing", () => {
    expect(coerce({ ...valid, hook: undefined })?.hook).toBe(valid.title);
  });

  test("tolerates a bogus area and difficulty rather than dropping the concept", () => {
    const result = coerce({ ...valid, area: "not-a-real-area", difficulty: "spicy" });
    expect(result?.area).toBe("agent-context");
    expect(result?.difficulty).toBe("deep");
  });

  test("clamps out-of-range scores into the unit interval", () => {
    const result = coerce({ ...valid, mechanism_density: 42, novelty: -3 });
    expect(result?.mechanism_density).toBe(1);
    expect(result?.novelty).toBe(0);
  });

  test("coerces missing optional fields to null", () => {
    const result = coerce({ ...valid, claim_number: undefined, transfer: null });
    expect(result?.claim_number).toBeNull();
    expect(result?.transfer).toBeNull();
  });

  test("returns null for junk input", () => {
    expect(coerce(null)).toBeNull();
    expect(coerce("nope")).toBeNull();
    expect(coerce([])).toBeNull();
  });
});
