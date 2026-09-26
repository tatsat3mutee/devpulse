import { describe, expect, test } from "bun:test";
import { byline, collectAll } from "../scripts/lib/collect";
import { searchRecords } from "../scripts/build-search";
import { readingBucket, toolOfTheDay } from "../src/lib/editorial";
import { radarWithChanges } from "../src/lib/radar";
import { isoWeek, weekRange, weeklySummary } from "../src/lib/weekly";
import type { Digest, DigestItem, Radar } from "../src/lib/digest";

const item = (id: string, overrides: Partial<DigestItem> = {}): DigestItem => ({
  id, headline: `Headline ${id}`, originalTitle: `Original ${id}`, url: `https://example.com/${id}`,
  source: "hn", sourceLabel: "Hacker News", topic: "systems", score: 7, whyRead: "Explains a concrete engineering technique.",
  publishedAt: "2026-09-26T00:00:00.000Z", mustRead: false, ...overrides,
});
const digest = (date: string, items: DigestItem[], radar?: Radar): Digest => ({ date, generatedAt: `${date}T08:00:00.000Z`, model: "m", candidateCount: 100, items, sources: [], radar });
const model = (id: string, likes: number) => ({ id, likes, createdAt: "2026-09-20T00:00:00.000Z" });

describe("AI Radar", () => {
  test("movement is computed from the previous edition's source data", () => {
    const before: Radar = { models: [model("a/one", 100), model("b/two", 90)], repos: [{ name: "x/repo", stars: 500, createdAt: "2026-09-24T00:00:00.000Z" }] };
    const today: Radar = { models: [model("b/two", 130), model("c/new", 80), model("a/one", 110)], repos: [{ name: "x/repo", stars: 900, createdAt: "2026-09-24T00:00:00.000Z" }] };
    const radar = radarWithChanges(today, before);
    expect(radar.models.map(({ id, rank, move, delta }) => ({ id, rank, move, delta }))).toEqual([
      { id: "b/two", rank: 1, move: 1, delta: 40 },
      { id: "c/new", rank: 2, move: "new", delta: undefined },
      { id: "a/one", rank: 3, move: -2, delta: 10 },
    ]);
    expect(radar.repos[0]).toMatchObject({ move: 0, delta: 400 });
    expect(radarWithChanges(today).models.every((entry) => entry.move === "new")).toBe(true);
  });
});

describe("weekly edition", () => {
  test("ISO weeks handle year boundaries", () => {
    expect(isoWeek("2026-09-26")).toBe("2026-W39");
    expect(isoWeek("2021-01-03")).toBe("2020-W53");
    expect(isoWeek("2024-12-30")).toBe("2025-W01");
    expect(weekRange("2026-W39")).toEqual({ start: "2026-09-21", end: "2026-09-27" });
  });

  test("the week's top stories are deduplicated, ranked and compared with last week", () => {
    const week = [
      digest("2026-09-25", [item("a", { score: 9, topic: "agents" }), item("b", { score: 7, comments: 400, discussionUrl: "https://news.ycombinator.com/item?id=1" })], { models: [model("new/model", 50)], repos: [] }),
      digest("2026-09-26", [item("a", { score: 9, topic: "agents" }), item("c", { score: 8, topic: "security" })]),
    ];
    const last = [digest("2026-09-18", [item("z", { topic: "security" }), item("y", { topic: "security" })], { models: [model("old/model", 10)], repos: [] })];
    const summary = weeklySummary(week, last);
    expect(summary.storyCount).toBe(3);
    expect(summary.top.map((story) => story.id)).toEqual(["a", "c", "b"]);
    expect(summary.top[0].date).toBe("2026-09-25");
    expect(summary.mostDiscussed.map((story) => story.id)).toEqual(["b"]);
    expect(summary.topics.find((topic) => topic.slug === "security")).toMatchObject({ count: 1, delta: -1 });
    expect(summary.newModels.map((entry) => entry.id)).toEqual(["new/model"]);
  });
});

describe("reading paths and tool of the day", () => {
  test("quick reads are under ten minutes and never papers", () => {
    expect(readingBucket(item("a", { readMinutes: 4 }))).toBe("quick");
    expect(readingBucket(item("b"))).toBe("quick");
    expect(readingBucket(item("c", { readMinutes: 25 }))).toBe("deep");
    expect(readingBucket(item("d", { kind: "paper" }))).toBe("deep");
  });

  test("the tool of the day is the best launch that is not already a must-read", () => {
    const items = [
      item("must", { kind: "tool", score: 9, mustRead: true }),
      item("weak", { kind: "tool", score: 6 }),
      item("repo", { source: "github", score: 8, stars: 900 }),
      item("show", { originalTitle: "Show HN: a thing", score: 8, points: 100 }),
      item("essay", { kind: "essay", score: 9 }),
    ];
    expect(toolOfTheDay(items)?.id).toBe("repo");
    expect(toolOfTheDay([item("essay", { kind: "essay", score: 9 })])).toBeUndefined();
  });
});

describe("story search", () => {
  test("one record per story, newest edition wins, with topic, kind and month filters", () => {
    const records = searchRecords([
      digest("2026-09-25", [item("a", { kind: "paper", topic: "research", brief: ["Point one here.", "Point two here."] })]),
      digest("2026-09-26", [item("a2", { url: "https://example.com/a" }), item("b", { author: "Ada Lovelace" })]),
    ]);
    expect(records.map((record) => record.url)).toEqual(["/edition/2026-09-26/#a2", "/edition/2026-09-26/#b"]);
    expect(records[1].meta).toMatchObject({ link: "https://example.com/b", author: "Ada Lovelace", topic: "Performance & OS", date: "2026-09-26" });
    expect(records[1].filters).toMatchObject({ topic: ["Performance & OS"], desk: ["Systems"], month: ["2026-09"] });
    const paper = searchRecords([digest("2026-09-25", [item("p", { kind: "paper", topic: "research", headline: "Sparse <attention>, halved", brief: ["Uses sparse attention.", "Cuts memory in half."] })])])[0];
    expect(paper.filters.kind).toEqual(["Paper"]);
    expect(paper.text).toContain("Uses sparse attention.");
    expect(paper.content).toContain('<h1 data-pagefind-meta="title">Sparse &lt;attention&gt;, halved</h1>');
    expect(paper.content).toContain('<meta data-pagefind-filter="kind[content]" content="Paper">');
    expect(searchRecords([digest("2026-09-26", [item("u", { url: "https://example.com/a,b?x=1:2" })])])[0].content).toContain('<meta data-pagefind-meta="link[content]" content="https://example.com/a,b?x=1:2">');
  });
});

describe("source credit", () => {
  test("bylines shorten long author lists and drop email addresses", () => {
    expect(byline(["Ada Lovelace"])).toBe("Ada Lovelace");
    expect(byline(["Ada", "Grace"])).toBe("Ada, Grace");
    expect(byline(["Ada", "Grace", "Barbara"])).toBe("Ada et al.");
    expect(byline(["noreply@blogger.com", " "])).toBeUndefined();
  });

  test("collection keeps paper authors and code links, feed authors, and the radar lists", async () => {
    const now = new Date("2026-09-26T12:00:00Z");
    const fetcher = async (url: string) => {
      if (url.includes("daily_papers")) return Response.json([{ publishedAt: now.toISOString(), paper: { id: "2609.00001", title: "Sparse KV caches", upvotes: 40, summary: "We cut memory.", authors: [{ name: "A. One" }, { name: "B. Two" }, { name: "C. Three" }], githubRepo: "https://github.com/lab/sparse-kv", githubStars: 321 } }]);
      if (url.includes("huggingface.co/api/models")) return Response.json([{ id: "org/chat-model", likes: 900, downloads: 12000, pipeline_tag: "text-generation", library_name: "transformers", createdAt: "2026-09-20T00:00:00.000Z" }, { id: "org/image-model", likes: 800, pipeline_tag: "text-to-image", createdAt: "2026-09-20T00:00:00.000Z" }]);
      if (url.includes("simonwillison")) return new Response(`<feed><entry><title>Notes on agents</title><link href="https://simonwillison.net/2026/Sep/26/agents/"/><published>2026-09-26T08:00:00Z</published><author><name>Simon Willison</name></author><summary>Agents notes.</summary></entry></feed>`);
      if (url.includes("hacker-news") || url.includes("hn.algolia")) return Response.json(url.includes("algolia") ? { hits: [] } : []);
      if (url.includes("lobste.rs/hottest")) return Response.json([]);
      if (url.includes("api.github.com")) return Response.json({ items: [{ full_name: "fast/rising", html_url: "https://github.com/fast/rising", description: "A rising repo", language: "Rust", stargazers_count: 1500, created_at: "2026-09-24T00:00:00Z" }] });
      return new Response("<rss><channel></channel></rss>");
    };
    const { items, radar } = await collectAll({ now, fetcher });
    expect(items.find((entry) => entry.source === "papers")).toMatchObject({ author: "A. One et al.", codeUrl: "https://github.com/lab/sparse-kv", codeStars: 321 });
    expect(items.find((entry) => entry.url.includes("simonwillison"))?.author).toBe("Simon Willison");
    expect(radar.models.map((entry) => entry.id)).toEqual(["org/chat-model"]);
    expect(radar.models[0]).toMatchObject({ task: "text-generation", library: "transformers", likes: 900, downloads: 12000 });
    expect(radar.repos[0]).toMatchObject({ name: "fast/rising", language: "Rust", stars: 1500 });
  });
});
