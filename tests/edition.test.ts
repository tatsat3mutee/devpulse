import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publishEdition } from "../scripts/publish-edition";
import type { Candidate } from "../scripts/lib/pipeline";
import { editionSchema, isPublicEdition } from "../src/lib/schema";
import { editionMarkdown, evidenceIndex } from "../src/lib/serialize";
import { latestApproved } from "../scripts/check-release";
import { probeSite } from "../scripts/check-live";
import { shareLinks } from "../src/lib/share";

const raw = JSON.parse(await readFile(new URL("../data/editions/2026-09-24.json", import.meta.url), "utf8"));
const edition = editionSchema.parse(raw);

describe("pilot edition", () => {
  test("edition contract rejects unsafe links, mixed receipts and duplicate IDs", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,unsafe", "https://user:secret@example.org/source"]) {
      const unsafe = structuredClone(raw);
      unsafe.lead.primarySource.url = url;
      expect(editionSchema.safeParse(unsafe).success).toBe(false);
    }
    const mixed = structuredClone(raw);
    mixed.lead.claims.push({ ...mixed.lead.claims[0], sourceUrl: "https://another.example/source" });
    expect(editionSchema.safeParse(mixed).success).toBe(false);
    const duplicate = structuredClone(raw);
    duplicate.stories[0].id = duplicate.lead.id;
    expect(editionSchema.safeParse(duplicate).success).toBe(false);
    const corrected = structuredClone(raw);
    corrected.status = "corrected";
    for (const story of [corrected.lead, ...corrected.stories]) story.provenance.humanReviewed = true;
    expect(editionSchema.safeParse(corrected).success).toBe(false);
    corrected.lead.correction = "2026-09-25: corrected the scope of the claim.";
    expect(editionSchema.safeParse(corrected).success).toBe(true);
  });

  test("publication preserves drafts on failure and never overwrites an edition", async () => {
    const root = await mkdtemp(join(tmpdir(), "devpulse-publish-"));
    const draft = structuredClone(raw);
    for (const story of [draft.lead, ...draft.stories]) {
      story.provenance.humanReviewed = true;
      story.claims = [{ text: "A supported source statement.", quote: "A supported source statement.", sourceUrl: story.primarySource.url }];
    }
    const draftPath = join(root, "review", `${draft.date}.json`);
    const targetPath = join(root, "editions", `${draft.date}.json`);
    const fetcher = async (candidate: Candidate) => ({ ...candidate, evidence: "A supported source statement." });
    try {
      await mkdir(join(root, "review"));
      const original = JSON.stringify(draft);
      await writeFile(draftPath, original);
      await expect(publishEdition(draft.date, root, async () => { throw new Error("Source unavailable"); })).rejects.toThrow("Source unavailable");
      expect(await readFile(draftPath, "utf8")).toBe(original);
      await publishEdition(draft.date, root, fetcher);
      expect(JSON.parse(await readFile(targetPath, "utf8")).status).toBe("published");
      await writeFile(draftPath, original);
      const published = await readFile(targetPath, "utf8");
      await expect(publishEdition(draft.date, root, fetcher)).rejects.toThrow();
      expect(await readFile(targetPath, "utf8")).toBe(published);
      expect(await readFile(draftPath, "utf8")).toBe(original);
      draft.date = "2026-09-23";
      await writeFile(draftPath, JSON.stringify(draft));
      await expect(publishEdition(edition.date, root, fetcher)).rejects.toThrow("Draft date differs");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("stays finite but is not published before human review", () => {
    const stories = [edition.lead, ...edition.stories];
    expect(stories.length).toBeGreaterThanOrEqual(3);
    expect(stories.length).toBeLessThanOrEqual(7);
    expect(isPublicEdition(edition)).toBe(false);
    expect(stories.every((story) => !story.provenance.humanReviewed)).toBe(true);
    expect(editionSchema.safeParse({ ...raw, status: "published" }).success).toBe(false);
  });

  test("every story has a receipt and an uncertainty label", () => {
    for (const story of [edition.lead, ...edition.stories]) {
      expect(story.claims.length).toBeGreaterThan(0);
      expect(story.primarySource.url).toStartWith("https://");
      expect(["developing", "holds", "contested", "unverified"]).toContain(story.status);
    }
  });

  test("machine-readable Markdown carries primary sources and statuses", () => {
    const markdown = editionMarkdown(edition);
    expect(markdown).toContain("**Status:**");
    expect(markdown).toContain("**Primary source:**");
    expect(markdown).toContain(edition.lead.title);
    for (const story of [edition.lead, ...edition.stories]) {
      expect(markdown).toContain(story.confidenceReason);
      expect(markdown).toContain(story.provenance.fetchedAt);
      for (const claim of story.claims) {
        expect(markdown).toContain(claim.text);
        expect(markdown).toContain(claim.quote);
        expect(markdown).toContain(`[Quoted source](${claim.sourceUrl})`);
      }
    }
    const corrected = structuredClone(edition);
    corrected.lead.correction = "The earlier scope was too broad.";
    expect(editionMarkdown(corrected)).toContain("**Correction:** The earlier scope was too broad.");
    expect(markdown).toContain("editor approved: no");
  });

  test("evidence index excludes drafts and states when there is nothing to cite", () => {
    const index = evidenceIndex([edition], "https://example.org");
    expect(index).toContain("No human-reviewed edition has been published");
    expect(index).not.toContain(edition.lead.title);
    expect(index).not.toContain(`/edition/${edition.date}`);
    expect(index).toContain("Text matching establishes");
    expect(index).toContain("Confidence is an editorial label");
  });

  test("evidence index links dated receipts and preserves publication uncertainty", () => {
    const published = structuredClone(edition);
    published.status = "corrected";
    for (const story of [published.lead, ...published.stories]) story.provenance.humanReviewed = true;
    published.lead.correction = "A corrected scope.";
    const older = structuredClone(published);
    older.date = "2026-09-23";
    const index = evidenceIndex([older, edition, published], "https://example.org");
    expect(index).toContain(`Latest reviewed edition: ${published.date}`);
    expect(index).toContain(`https://example.org/story/${published.date}--${published.lead.id}`);
    expect(index).toContain("Correction recorded.");
    expect(index).toContain(`Edition state: corrected. Publication timestamp: ${published.publishedAt}`);
    expect(index).toContain(`/edition/${published.date}.json`);
    expect(index).not.toContain(`/story/${older.date}--`);
    expect(index).toContain("not a claim of independent reproduction");
  });

  test("production cannot deploy an unapproved pilot", () => {
    expect(() => latestApproved([edition])).toThrow("No human-reviewed edition");
  });

  test("live probe requires the approved edition on HTML, JSON and RSS", async () => {
    const fetcher = (async (input: RequestInfo | URL) => {
      const path = new URL(input.toString()).pathname;
      const bodies: Record<string, string> = {
        "/": "<html><title>DevPulse</title><body>2026-09-24</body></html>",
        "/latest.json": JSON.stringify({ date: "2026-09-24", status: "published", storyCount: 6 }),
        "/rss.xml": '<rss version="2.0"><channel><item><link>https://example.org/edition/2026-09-24</link></item></channel></rss>',
        "/edition/2026-09-24/": "<html><title>DevPulse</title><body>2026-09-24</body></html>",
      };
      const contentType = path.endsWith(".json") ? "application/json" : path.endsWith(".xml") ? "application/rss+xml" : "text/html";
      return new Response(bodies[path] ?? "", { status: path in bodies ? 200 : 404, headers: { "Content-Type": contentType } });
    }) as typeof fetch;
    const now = new Date("2026-09-25T10:00:00.000Z");
    await expect(probeSite("https://example.org", "2026-09-24", fetcher, now)).resolves.toBeUndefined();
    await expect(probeSite("https://example.org", "2026-09-25", fetcher, now)).rejects.toThrow();
    await expect(probeSite("https://example.org", "2026-09-18", fetcher, now)).rejects.toThrow("stale");
  });

  test("published share links contain a sourced summary", () => {
    const links = shareLinks({ title: "A supported change", summary: "The source states what changed.", verdict: "Holds up", url: "https://example.org/story/approved" });
    expect(links.post).toContain("Receipts: https://example.org/story/approved");
    expect(links.linkedin).toContain("linkedin.com/sharing/share-offsite/?url=");
    expect(links.x).toContain("x.com/intent/post?text=");
  });
});
