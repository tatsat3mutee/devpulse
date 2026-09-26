import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { extractPreviewImage, saveCover } from "../scripts/lib/media";
import { readBoundedBytes } from "../scripts/lib/net";
import { coverTargets, excludePublished, writeBriefs, type Writer } from "../scripts/lib/score";
import { digestSchema, type DigestItem } from "../src/lib/digest";
import { coverSvg, layoutDiagram, pulseLine } from "../src/lib/visual";
import { editionCardSvg } from "../src/lib/og";

const item = (id: string, overrides: Partial<DigestItem> = {}): DigestItem => ({
  id, headline: `Headline ${id} with distinct words`, originalTitle: `Original ${id}`, url: `https://example.com/${id}`,
  source: "hn", sourceLabel: "Hacker News", topic: "systems", score: 7, whyRead: "Explains a concrete engineering technique.",
  publishedAt: "2026-09-26T00:00:00.000Z", mustRead: false, ...overrides,
});
const longExcerpt = "The gateway receives requests and forwards them to the scheduler, which batches prompts for the GPU workers. ".repeat(6);

describe("preview images", () => {
  test("reads og:image in either attribute order, resolves relative URLs, and skips logos and SVGs", () => {
    expect(extractPreviewImage(`<head><meta content="/img/cover.png?x=1&amp;y=2" property="og:image"></head>`, "https://blog.example/post")).toBe("https://blog.example/img/cover.png?x=1&y=2");
    expect(extractPreviewImage(`<head><meta name='twitter:image' content='https://cdn.example/a.jpg'></head>`, "https://blog.example/")).toBe("https://cdn.example/a.jpg");
    expect(extractPreviewImage(`<head><meta property="og:image" content="https://cdn.example/site-logo.png"><meta name="twitter:image" content="https://cdn.example/real.jpg"></head>`, "https://b.example/")).toBe("https://cdn.example/real.jpg");
    expect(extractPreviewImage(`<head><meta property="og:image" content="https://cdn.example/card.svg"></head>`, "https://b.example/")).toBeUndefined();
    expect(extractPreviewImage(`<head><meta property="og:image" content="javascript:alert(1)"></head>`, "https://b.example/")).toBeUndefined();
    expect(extractPreviewImage(`<head><title>none</title></head>`, "https://b.example/")).toBeUndefined();
  });

  test("covers are re-encoded to small WebP; non-images and tiny images are refused", async () => {
    const dir = await mkdtemp(join(tmpdir(), "covers-"));
    try {
      const png = await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#2a78d6" } }).png().toBuffer();
      const tiny = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#000" } }).png().toBuffer();
      const fetcher = async (url: string) => url.endsWith("big.png") ? new Response(new Uint8Array(png), { headers: { "content-type": "image/png" } })
        : url.endsWith("tiny.png") ? new Response(new Uint8Array(tiny), { headers: { "content-type": "image/png" } })
        : new Response("<html>", { headers: { "content-type": "text/html" } });
      const out = join(dir, "a.webp");
      expect(await saveCover("https://cdn.example/big.png", out, { fetcher })).toBeGreaterThan(0);
      const meta = await sharp(await readFile(out)).metadata();
      expect(meta).toMatchObject({ format: "webp", width: 800, height: 450 });
      await expect(saveCover("https://cdn.example/tiny.png", join(dir, "b.webp"), { fetcher })).rejects.toThrow("too small");
      await expect(saveCover("https://cdn.example/page", join(dir, "c.webp"), { fetcher })).rejects.toThrow("Unsupported image type");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("bounded byte reads stop oversized bodies", async () => {
    await expect(readBoundedBytes(new Response(new Uint8Array(20)), 10)).rejects.toThrow("byte limit");
    expect((await readBoundedBytes(new Response(new Uint8Array(8)), 10)).byteLength).toBe(8);
  });
});

describe("editorial passes", () => {
  test("stories published in recent editions are excluded by id or canonical URL", () => {
    const previous = [{ items: [item("hn-1", { url: "https://a.example/post" }), item("blog-x")] }];
    const fresh = excludePublished([
      { id: "lobsters-9", url: "https://a.example/post/?utm_source=x" },
      { id: "blog-x", url: "https://moved.example/" },
      { id: "hn-2", url: "https://b.example/" },
    ], previous);
    expect(fresh.map((entry) => entry.id)).toEqual(["hn-2"]);
  });

  test("covers go to must-reads and the first story of each topic section", () => {
    const picked = [item("m", { mustRead: true, topic: "ai" }), item("a1", { topic: "ai" }), item("a2", { topic: "ai" }), item("s1", { topic: "security" })];
    expect(coverTargets(picked).map((entry) => entry.id)).toEqual(["m", "a1", "s1"]);
  });

  test("briefs and diagrams are validated; URLs, bad edges and unknown ids are dropped", async () => {
    const items = [item("a"), item("b"), item("c"), item("short")];
    const writer: Writer = async () => ({ items: [
      { id: "a", brief: ["Gateway forwards requests to a batching scheduler.", "GPU workers run the batched prompts."], diagram: { caption: "Request path through the serving stack", nodes: [{ id: "gateway", label: "Gateway" }, { id: "scheduler", label: "Scheduler" }, { id: "gpu", label: "GPU workers" }], edges: [{ from: "gateway", to: "scheduler", label: "requests" }, { from: "scheduler", to: "gpu", label: "" }] } },
      { id: "b", brief: ["Read more at https://evil.example", "Second point is fine here."], diagram: { caption: "Broken", nodes: [{ id: "x", label: "X" }, { id: "y", label: "Y" }], edges: [{ from: "x", to: "ghost", label: "" }] } },
      { id: "ghost", brief: ["Invented story point one.", "Invented story point two."], diagram: null },
    ] });
    const excerpts = { a: longExcerpt, b: longExcerpt, c: longExcerpt, short: "too short" };
    const { failures } = await writeBriefs(items, excerpts, writer);
    expect(failures).toEqual([]);
    expect(items[0].brief).toHaveLength(2);
    expect(items[0].diagram?.edges[1]).toEqual({ from: "scheduler", to: "gpu" });
    expect(items[1].brief).toBeUndefined();
    expect(items[1].diagram).toBeUndefined();
    expect(items[2].brief).toBeUndefined();
  });

  test("a failing writer batch is recorded and leaves stories unchanged", async () => {
    const items = [item("a")];
    const { failures } = await writeBriefs(items, { a: longExcerpt }, async () => { throw new Error("rate limited"); });
    expect(failures).toHaveLength(1);
    expect(items[0].brief).toBeUndefined();
  });

  test("schema accepts local covers only and rejects model URLs in briefs", () => {
    const base = { date: "2026-09-26", generatedAt: "2026-09-26T08:00:00.000Z", model: "test", candidateCount: 10, sources: [] };
    const items = ["a", "b", "c", "d", "e"].map((id) => item(id));
    expect(digestSchema.safeParse({ ...base, items: [{ ...items[0], image: "/covers/2026-09-26/a.webp" }, ...items.slice(1)] }).success).toBe(true);
    expect(digestSchema.safeParse({ ...base, items: [{ ...items[0], image: "https://cdn.example/a.webp" }, ...items.slice(1)] }).success).toBe(false);
    expect(digestSchema.safeParse({ ...base, items: [{ ...items[0], brief: ["See www.example.com now", "Another fine point"] }, ...items.slice(1)] }).success).toBe(false);
  });
});

describe("graphics", () => {
  test("cover art is deterministic per story and differs by kind", () => {
    const paper = item("p1", { kind: "paper" });
    expect(coverSvg(paper)).toBe(coverSvg(paper));
    expect(coverSvg(paper)).not.toBe(coverSvg(item("p1", { kind: "vulnerability" })));
    expect(coverSvg(item("x", { kind: "essay" }))).toContain("<svg");
  });

  test("diagram layout places nodes left to right and curves back edges underneath", () => {
    const layout = layoutDiagram({ caption: "Loop", nodes: [{ id: "a", label: "Client" }, { id: "b", label: "Load balancer" }, { id: "c", label: "Service" }], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "a", label: "retry" }] });
    const x = Object.fromEntries(layout.nodes.map((node) => [node.id, node.x]));
    expect(x.a).toBeLessThan(x.b);
    expect(x.b).toBeLessThan(x.c);
    expect(layout.edges[2].ly).toBeGreaterThan(Math.max(...layout.nodes.map((node) => node.y + node.h)));
  });

  test("pulse spikes rise with score and stay inside the plot", () => {
    const pulse = pulseLine([item("lo", { score: 6 }), item("hi", { score: 10 })], 200, 100);
    expect(pulse.points[1].y).toBeLessThan(pulse.points[0].y);
    for (const point of pulse.points) expect(point.y).toBeGreaterThanOrEqual(0);
  });

  test("social card escapes headlines", () => {
    const items = ["a", "b", "c", "d", "e"].map((id, index) => item(id, { mustRead: index === 0, headline: index === 0 ? "Parsing <script> & friends safely" : `Headline ${id}` }));
    const svg = editionCardSvg({ date: "2026-09-26", generatedAt: "2026-09-26T08:00:00.000Z", model: "m", candidateCount: 9, items, sources: [] });
    expect(svg).toContain("&lt;script&gt; &amp; friends");
    expect(svg).not.toContain("<script>");
  });
});
