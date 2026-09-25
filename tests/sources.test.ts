import { describe, expect, test } from "bun:test";
import { collectSources, createLimiter, officialFeeds, parseOfficialFeed, validateEditionDate } from "../scripts/lib/sources";
import { preparationOptions, prepareEdition } from "../scripts/prepare-edition";
import { editionSchema, type Edition } from "../src/lib/schema";

const source = officialFeeds[0];
const now = new Date("2026-09-25T12:00:00.000Z");
const rss = (items: string) => `<rss version="2.0"><channel><title>Publisher</title>${items}</channel></rss>`;
const item = (link = "https://huggingface.co/blog/cache", date = "Thu, 24 Sep 2026 12:00:00 GMT") => `<item><title><![CDATA[Inference &amp; caching]]></title><link>${link}</link><pubDate>${date}</pubDate></item>`;

describe("official source collection", () => {
  test("official candidates reach evidence and drafting without losing publisher identity", async () => {
    const pilot = editionSchema.parse(await Bun.file(new URL("../data/editions/2026-09-24.json", import.meta.url)).json());
    const titles = ["GPU memory allocation", "Kubernetes networking controls", "Compiler lowering semantics"];
    const collected = await collectSources({ date: "2026-09-25", now, includeSignals: false, fetcher: async (url) => {
      const index = officialFeeds.findIndex((feed) => feed.url === url);
      const feed = officialFeeds[index];
      return new Response(rss(item(`${feed.articleOrigin}${feed.articlePath}source-${index}`).replace("Inference &amp; caching", titles[index])));
    } });
    const writes = new Map<string, unknown>();
    const result = await prepareEdition(preparationOptions([], { EDITION_DATE: "2026-09-25", OPENROUTER_API_KEY: "synthetic-not-a-real-key" }), {
      collect: async () => collected,
      write: async (path, value) => { writes.set(path.replaceAll("\\", "/"), structuredClone(value)); },
      evidence: async (candidate) => ({ ...candidate, evidence: "Synthetic exact source quotation." }),
      draft: async (candidate) => {
        expect(candidate.source).toBe("official-feed");
        expect(candidate.sourceInfo?.label).toBeDefined();
        expect(candidate.evidence).toBe("Synthetic exact source quotation.");
        return { ...pilot.lead, id: candidate.id, title: candidate.title, primarySource: { label: candidate.sourceInfo!.label, url: candidate.url, type: candidate.sourceInfo!.primarySourceType, vendorAuthored: candidate.sourceInfo!.vendorAuthored }, claims: [{ text: "Synthetic source quotation.", quote: candidate.evidence!, sourceUrl: candidate.url }] };
      },
    });
    expect(result.draftedCount).toBe(3);
    expect(result.excluded).toEqual([]);
    const drafted = writes.get("data/review/2026-09-25.json") as Edition;
    expect(drafted.status).toBe("draft");
    expect([drafted.lead, ...drafted.stories].every((story) => !story.provenance.humanReviewed)).toBe(true);
  });

  test("workflow defaults to no model and passes dispatch dates through environment rather than shell interpolation", async () => {
    const workflow = Bun.YAML.parse(await Bun.file(new URL("../.github/workflows/prepare-edition.yml", import.meta.url)).text()) as any;
    expect(workflow.on.workflow_dispatch.inputs.collect_only.default).toBe(true);
    const steps = workflow.jobs.prepare.steps;
    const dateStep = steps.find((step: any) => step.id === "date");
    expect(dateStep.env.REQUESTED_EDITION_DATE).toBe("${{ inputs.edition_date }}");
    expect(dateStep.run).not.toContain("${{ inputs.");
    expect(dateStep.run).toContain("validateEditionDate");
    const collectStep = steps.find((step: any) => step.name === "Collect candidates without a model");
    expect(collectStep.run).toContain("--dry-run");
    expect(collectStep.env.OPENROUTER_API_KEY).toBeUndefined();
    expect(steps.find((step: any) => step.name === "Open editorial review pull request").if).toContain("env.COLLECT_ONLY != 'true'");
    expect(steps.find((step: any) => step.name === "Retain candidates and source health").if).toContain("always()");
  });

    test("dry-run works without a key and never fetches evidence, invokes a model, or writes a review", async () => {
      const writes = new Map<string, unknown>();
      const options = preparationOptions(["--dry-run", "--official-only"], { EDITION_DATE: "2026-09-25" });
      const result = await prepareEdition(options, {
        collect: async () => collectSources({ date: options.date, now, includeSignals: false, feeds: [source], fetcher: async () => new Response(rss(item())) }),
        write: async (path, value) => { writes.set(path.replaceAll("\\", "/"), value); },
        evidence: async () => { throw new Error("Evidence must not run"); },
        draft: async () => { throw new Error("Model must not run"); },
      });
      expect(result.mode).toBe("collect-only");
      expect([...writes.keys()]).toEqual(["data/collection/2026-09-25/candidates.json", "data/collection/2026-09-25/run.json"]);
      expect(result.draftedCount).toBe(0);
    });

    test("all dry-run aliases bypass drafting, while invalid flags and env values fail closed", () => {
      for (const argument of ["--dry-run", "--collect-only", "--no-model"]) expect(preparationOptions([argument], {}).collectOnly).toBe(true);
      expect(preparationOptions([], { COLLECT_ONLY: "true" }).collectOnly).toBe(true);
      expect(() => preparationOptions(["--unknown"], {})).toThrow();
      expect(() => preparationOptions([], { COLLECT_ONLY: "yes" })).toThrow();
    });

  test("RSS decodes titles and keeps exact publisher metadata without treating summaries as evidence", () => {
    const result = parseOfficialFeed(rss(item()), source, now);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ source: "official-feed", title: "Inference & caching", sourceInfo: source, metrics: {} });
    expect(result.candidates[0].evidence).toBeUndefined();
  });

  test("namespaced Atom selects alternate HTML, resolves relative URLs, and uses published before updated", () => {
    const atom = `<atom:feed xmlns:atom="http://www.w3.org/2005/Atom"><atom:entry><atom:title>Model runtime</atom:title><atom:published>2026-09-24T10:00:00Z</atom:published><atom:updated>2026-09-25T10:00:00Z</atom:updated><atom:link rel="self" href="/api/feed"/><atom:link rel="alternate" type="text/html" href="/blog/runtime"/></atom:entry></atom:feed>`;
    expect(parseOfficialFeed(atom, source, now).candidates[0]).toMatchObject({ url: "https://huggingface.co/blog/runtime", publishedAt: "2026-09-24T10:00:00.000Z" });
  });

  test("rejects stale, future, missing-date, off-domain, non-HTTP, and out-of-scope entries", () => {
    const entries = [item(undefined, "2020-01-01"), item(undefined, "2026-09-26"), item(undefined, ""), item("https://evil.example/blog/cache"), item("javascript:alert(1)"), item("https://huggingface.co/jobs")].join("");
    expect(parseOfficialFeed(rss(entries), source, now)).toMatchObject({ candidates: [], fetched: 6, rejected: 6 });
  });

  test("deduplicates canonical URLs with stable IDs and caps per-feed processing", () => {
    const result = parseOfficialFeed(rss(item() + item("https://huggingface.co/blog/cache?utm_source=rss")), source, now);
    expect(result.candidates).toHaveLength(1);
    expect(result.rejected).toBe(1);
    expect(result.candidates[0].id).toBe(parseOfficialFeed(rss(item()), source, now).candidates[0].id);
    expect(parseOfficialFeed(rss(item().repeat(101)), source, now)).toMatchObject({ fetched: 100, truncated: true });
  });

  test("rejects malformed XML, HTML masquerading as a feed, and entity declarations", () => {
    for (const xml of ["<rss><channel></rss>", "<html><body>Not a feed</body></html>", '<!DOCTYPE rss [<!ENTITY secret SYSTEM "file:///etc/passwd">]><rss/>']) {
      expect(() => parseOfficialFeed(xml, source, now)).toThrow();
    }
  });

  test("validates calendar dates before path construction or requests", async () => {
    for (const date of ["2026-02-29", "2026-09-31", "2026-13-01", "../../file", "2026-09-25\nBAD=x", "$(whoami)"]) {
      expect(() => validateEditionDate(date)).toThrow();
    }
    expect(validateEditionDate("2024-02-29")).toBe("2024-02-29");
    let calls = 0;
    await expect(collectSources({ date: "bad", fetcher: async () => { calls++; return new Response(""); } })).rejects.toThrow();
    expect(calls).toBe(0);
  });

  test("shared limiter enforces concurrency and releases slots after failures", async () => {
    const limited = createLimiter(2);
    let active = 0;
    let peak = 0;
    await Promise.allSettled(Array.from({ length: 12 }, (_, index) => limited(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      if (index % 2) throw new Error("fixture failure");
    })));
    expect(peak).toBe(2);
    expect(active).toBe(0);
    expect(await limited(async () => "available")).toBe("available");
    expect(() => createLimiter(0)).toThrow();
  });

  test("offline run reports HTTP failure separately from empty and successful feeds", async () => {
    const result = await collectSources({ date: "2026-09-25", now, includeSignals: false, fetcher: async (url) => url === source.url ? new Response(rss(item())) : url.includes("pytorch") ? new Response("unavailable", { status: 503 }) : new Response(rss("")) });
    expect(result.candidates).toHaveLength(1);
    expect(result.manifest.degraded).toBe(true);
    expect(result.manifest.sources.map((entry) => entry.status)).toEqual(["ok", "empty", "error"]);
    expect(result.manifest.sources[2].errors).toEqual(["HTTP 503"]);
  });

  test("oversized responses and timeouts are recorded rather than disappearing", async () => {
    for (const fetcher of [async () => new Response("x".repeat(2_000_001)), async () => { throw new DOMException("Timed out", "TimeoutError"); }]) {
      const result = await collectSources({ date: "2026-09-25", now, includeSignals: false, feeds: [source], fetcher });
      expect(result.manifest.sources[0].status).toBe("error");
      expect(result.manifest.degraded).toBe(true);
    }
  });

  test("historical editions use their own time window", async () => {
    const result = await collectSources({ date: "2026-09-20", now, includeSignals: false, feeds: [source], fetcher: async () => new Response(rss(item())) });
    expect(result.candidates).toHaveLength(0);
    expect(result.manifest.windowEnd).toBe("2026-09-20T23:59:59.999Z");
  });

  test("GitHub failures and HN item failures are visible, engineering signals remain bounded", async () => {
    let active = 0;
    let peak = 0;
    const result = await collectSources({ date: "2026-09-25", now, feeds: [], concurrency: 2, fetcher: async (url) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      if (url.includes("api.github.com")) return new Response("rate limited", { status: 429 });
      if (url.endsWith("topstories.json")) return Response.json([1, 2, 3]);
      if (url.endsWith("/3.json")) throw new Error("fixture timeout");
      if (url.endsWith("/4.json")) return Response.json({ type: "comment", text: "<p>Memory pressure remains.</p>" });
      if (url.endsWith("/5.json")) return Response.json({ type: "comment", deleted: true, text: "Removed" });
      return Response.json({ id: url.endsWith("/1.json") ? 1 : 2, type: "story", title: url.endsWith("/1.json") ? "GPU inference runtime" : "Election results", url: "https://example.org/runtime", time: now.getTime() / 1000 - 60, score: 30, descendants: 4, kids: [4, 5] });
    } });
    expect(peak).toBeLessThanOrEqual(2);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].source).toBe("hn");
    expect(result.candidates[0].discussionExcerpt).toBe("Memory pressure remains.");
    expect(result.manifest.sources.find((entry) => entry.id === "hn")).toMatchObject({ status: "partial", fetched: 3, accepted: 1, rejected: 2, errors: ["Item 3 failed"] });
    expect(result.manifest.sources.filter((entry) => entry.status === "error")).toHaveLength(6);
  });

  test("GitHub only admits published stable releases in the requested window", async () => {
    const result = await collectSources({ date: "2026-09-25", now, feeds: [], fetcher: async (url) => {
      if (url.endsWith("topstories.json")) return Response.json([]);
      if (!url.includes("vllm-project/vllm")) return Response.json([]);
      const release = { id: 1, name: "v1.0", published_at: "2026-09-24T00:00:00Z", html_url: "https://github.com/vllm-project/vllm/releases/tag/v1.0", draft: false, prerelease: false };
      return Response.json([release, { ...release, id: 2, prerelease: true }, { ...release, id: 3, published_at: "2026-09-26T00:00:00Z" }]);
    } });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ source: "github-release", title: "vllm-project/vllm v1.0" });
    expect(result.manifest.sources.find((entry) => entry.id === "github-vllm-project/vllm")).toMatchObject({ accepted: 1, rejected: 2, truncated: true });
  });

  test("a zero-candidate run fails after retaining its health manifest and never drafts", async () => {
    const writes = new Map<string, any>();
    const options = preparationOptions(["--dry-run"], { EDITION_DATE: "2026-09-25" });
    await expect(prepareEdition(options, {
      collect: async () => collectSources({ date: options.date, now, includeSignals: false, feeds: [source], fetcher: async () => new Response("Unavailable", { status: 503 }) }),
      write: async (path, value) => { writes.set(path.replaceAll("\\", "/"), value); },
      evidence: async () => { throw new Error("Evidence must not run"); },
      draft: async () => { throw new Error("Model must not run"); },
    })).rejects.toThrow("No eligible candidates");
    expect(writes.get("data/collection/2026-09-25/run.json")).toMatchObject({ phase: "failed", degraded: true });
  });
});