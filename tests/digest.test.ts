import { describe, expect, test } from "bun:test";
import { isSameStory, scoreItems, selectItems } from "../scripts/lib/score";
import { canonicalizeUrl, htmlToText, isPrivateAddress, readBoundedText, safeFetch, titleSimilarity, validateDate } from "../scripts/lib/net";
import { collectAll } from "../scripts/lib/collect";
import { digestSchema, groupByTopic, type DigestItem } from "../src/lib/digest";
import type { RawItem } from "../scripts/lib/collect";

const raw = (id: string, overrides: Partial<RawItem> = {}): RawItem => ({
  id, title: `Title ${id} about kernel scheduling`, url: `https://example.com/${id}`, source: "hn", sourceLabel: "Hacker News",
  points: 100, comments: 10, publishedAt: "2026-09-26T00:00:00.000Z", ...overrides,
});
const item = (id: string, overrides: Partial<DigestItem> = {}): DigestItem => ({
  id, headline: `Headline ${id} with distinct words ${id}`, originalTitle: `Original story ${id}x${id}`, url: `https://example.com/${id}`,
  source: "hn", sourceLabel: "Hacker News", topic: "systems", score: 7, whyRead: "Explains a concrete engineering technique.",
  publishedAt: "2026-09-26T00:00:00.000Z", mustRead: false, ...overrides,
});

describe("scoring", () => {
  test("keeps only judgements for known candidates in the batch and rejects URLs in model text", async () => {
    const candidates = [raw("a", { words: 2300 }), raw("b")];
    const { judged } = await scoreItems(candidates, async () => ({ items: [
      { id: "a", score: 8, topic: "systems", kind: "deep-dive", headline: "A factual kernel headline", whyRead: "It explains scheduler internals clearly." },
      { id: "a", score: 1, topic: "ai", kind: "news", headline: "Duplicate judgement ignored", whyRead: "This duplicate must be ignored entirely." },
      { id: "b", score: 9, topic: "security", kind: "vulnerability", headline: "Visit https://evil.example now", whyRead: "Contains a link and must be dropped." },
      { id: "ghost", score: 10, topic: "ai", kind: "news", headline: "Invented candidate", whyRead: "The model invented this candidate id." },
    ] }));
    expect(judged.map((entry) => entry.id)).toEqual(["a"]);
    expect(judged[0]).toMatchObject({ url: "https://example.com/a", score: 8, kind: "deep-dive", readMinutes: 10, originalTitle: candidates[0].title });
  });

  test("a failed batch is recorded without losing other batches", async () => {
    let calls = 0;
    const { judged, failures } = await scoreItems([raw("a"), raw("b")], async (batch) => {
      if (calls++ === 0) throw new Error("rate limited");
      return { items: batch.map((entry) => ({ id: entry.id, score: 7, topic: "systems" as const, kind: "tool" as const, headline: "A valid factual headline", whyRead: "A valid reason to read this story." })) };
    }, 1);
    expect(failures).toHaveLength(1);
    expect(judged.map((entry) => entry.id)).toEqual(["b"]);
  });

  test("selection drops weak items, caps topics and papers, removes near duplicates, marks must-reads", () => {
    const judged = [
      item("low", { score: 5 }),
      ...Array.from({ length: 20 }, (_, index) => item(`ai${index}`, { topic: "ai", score: 8, headline: `AI story ${index} alpha${index} beta${index}` })),
      ...Array.from({ length: 10 }, (_, index) => item(`p${index}`, { topic: "research", source: "papers", score: 9, headline: `Paper ${index} gamma${index} delta${index}` })),
      item("dup1", { score: 10, headline: "Linux kernel adds new scheduler class", originalTitle: "Linux adds scheduler" }),
      item("dup2", { score: 9, headline: "Linux kernel adds new scheduler class today", originalTitle: "New scheduler in Linux" }),
    ];
    const picked = selectItems(judged, { topicCap: 5, papersCap: 3, max: 50 });
    expect(picked.find((entry) => entry.id === "low")).toBeUndefined();
    expect(picked.filter((entry) => entry.topic === "ai")).toHaveLength(5);
    expect(picked.filter((entry) => entry.source === "papers")).toHaveLength(3);
    expect(picked.filter((entry) => entry.id.startsWith("dup")).map((entry) => entry.id)).toEqual(["dup1"]);
    expect(picked.slice(0, 3).every((entry) => entry.mustRead)).toBe(true);
    expect(picked.filter((entry) => entry.mustRead)).toHaveLength(3);
  });

  test("reworded coverage of the same story is treated as a duplicate within a topic", () => {
    const lobsters = item("l", { topic: "security", headline: "File-notification systems leak activity across Linux, Android, Windows, and macOS", originalTitle: "Notification leaks" });
    const lwn = item("w", { topic: "security", headline: "Researchers detail file-notification attacks across operating systems", originalTitle: "[$] File-notification attacks" });
    const other = item("o", { topic: "security", headline: "Linux kernel fixes a use-after-free in io_uring", originalTitle: "io_uring UAF" });
    expect(isSameStory(lobsters, lwn)).toBe(true);
    expect(isSameStory(lobsters, other)).toBe(false);
    expect(isSameStory(lobsters, { ...lwn, topic: "systems" })).toBe(false);
  });
});

describe("collection", () => {
  test("merges sources, dedupes canonical URLs, and reports failures per source", async () => {
    const now = new Date("2026-09-26T12:00:00Z");
    const t = Math.floor(now.getTime() / 1000) - 3600;
    const fetcher = async (url: string) => {
      if (url.endsWith("topstories.json")) return Response.json([1, 2, 3]);
      if (url.endsWith("beststories.json")) return Response.json([2]);
      if (url.endsWith("showstories.json")) return Response.json([]);
      if (url.endsWith("/1.json")) return Response.json({ id: 1, type: "story", title: "Deep dive into io_uring", url: "https://blog.example/io?utm_source=hn", score: 300, descendants: 50, time: t });
      if (url.endsWith("/2.json")) return Response.json({ id: 2, type: "story", title: "Low score", url: "https://x.example/", score: 3, time: t });
      if (url.endsWith("/3.json")) return Response.json({ id: 3, type: "story", title: "Old story", url: "https://y.example/", score: 900, time: t - 10 * 86400 });
      if (url.includes("lobste.rs")) return Response.json([{ short_id: "abc", title: "Deep dive into io_uring", url: "https://blog.example/io", score: 40, comment_count: 5, comments_url: "https://lobste.rs/s/abc", created_at: new Date(now.getTime() - 3600_000).toISOString() }]);
      if (url.includes("api.github.com")) return new Response("rate limited", { status: 403 });
      if (url.includes("daily_papers")) return Response.json([]);
      return new Response("<rss><channel></channel></rss>");
    };
    const { items, reports } = await collectAll({ now, fetcher });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: "Deep dive into io_uring", points: 300, discussionUrl: "https://news.ycombinator.com/item?id=1" });
    expect(items[0].discussions).toEqual([
      { label: "Hacker News", url: "https://news.ycombinator.com/item?id=1", comments: 50, points: 300 },
      { label: "Lobsters", url: "https://lobste.rs/s/abc", comments: 5, points: 40 },
    ]);
    expect(reports.find((report) => report.id === "github")).toMatchObject({ status: "error" });
    expect(reports.find((report) => report.id === "hn")).toMatchObject({ status: "ok", count: 1 });
  });
});

describe("digest data", () => {
  test("schema rejects unsafe links and duplicate ids; topics group in fixed order", () => {
    const base = { date: "2026-09-26", generatedAt: "2026-09-26T08:00:00.000Z", model: "test", candidateCount: 10, sources: [] };
    const items = ["a", "b", "c", "d", "e"].map((id, index) => item(id, { topic: index % 2 ? "security" : "ai" }));
    expect(digestSchema.safeParse({ ...base, items }).success).toBe(true);
    expect(digestSchema.safeParse({ ...base, items: [...items.slice(1), { ...items[0], url: "javascript:alert(1)" }] }).success).toBe(false);
    expect(digestSchema.safeParse({ ...base, items: [...items, items[0]] }).success).toBe(false);
    expect(groupByTopic(items).map((group) => group.slug)).toEqual(["ai", "security"]);
  });
});

describe("network safety", () => {
  test("private, mapped and reserved addresses fail closed", async () => {
    for (const address of ["127.0.0.1", "169.254.169.254", "::1", "::ffff:7f00:1", "fc00::1", "10.1.2.3"]) expect(isPrivateAddress(address), address).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    await expect(safeFetch("http://127.0.0.1/admin")).rejects.toThrow("Private address blocked");
    await expect(safeFetch("https://user:secret@example.com/")).rejects.toThrow("Credentialed URL blocked");
  });

  test("bounded reads cancel oversized bodies", async () => {
    await expect(readBoundedText(new Response("x".repeat(20)), 10)).rejects.toThrow("byte limit");
    expect(await readBoundedText(new Response("small"), 10)).toBe("small");
  });

  test("text helpers", () => {
    expect(canonicalizeUrl("https://a.example/p/?utm_source=x#h")).toBe("https://a.example/p");
    expect(htmlToText("<main><nav>menu</nav><p>Body &amp; text</p><script>x</script></main>")).toBe("Body & text");
    expect(titleSimilarity("Linux adds scheduler", "Linux adds scheduler")).toBe(1);
    expect(() => validateDate("2026-02-30")).toThrow();
  });
});
