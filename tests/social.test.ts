import { describe, expect, test } from "bun:test";
import { linkedInPost, selectSocialStories, storyUrl, xPost } from "../scripts/lib/social";
import type { Digest, DigestItem } from "../src/lib/digest";

const item = (id: string, overrides: Partial<DigestItem> = {}): DigestItem => ({
  id,
  headline: `Headline ${id}`,
  originalTitle: `Original ${id}`,
  url: `https://example.com/${id}`,
  source: "hn",
  sourceLabel: "Hacker News",
  topic: "systems",
  score: 7,
  whyRead: "Explains a concrete engineering technique and why it matters.",
  publishedAt: "2026-10-01T00:00:00.000Z",
  mustRead: false,
  ...overrides,
});

const digest = (items: DigestItem[]): Digest => ({
  date: "2026-10-01",
  generatedAt: "2026-10-01T07:00:00.000Z",
  model: "test",
  candidateCount: 10,
  items,
  sources: [],
});

describe("social publishing", () => {
  test("selects must-read stories before score and engagement", () => {
    const selected = selectSocialStories(digest([
      item("popular", { score: 9, points: 500 }),
      item("must", { score: 8, mustRead: true }),
      item("higher", { score: 10 }),
    ]));
    expect(selected.map((entry) => entry.id)).toEqual(["must", "higher"]);
  });

  test("uses internal story URLs and keeps X copy within 280 characters", () => {
    const story = item("long", { headline: "H".repeat(140), whyRead: "W".repeat(420) });
    const url = storyUrl("https://devpulse.tatsatpandey.com", "2026-10-01", story);
    expect(url).toBe("https://devpulse.tatsatpandey.com/story/2026-10-01--long/");
    expect(xPost(story, url).length).toBeLessThanOrEqual(280);
    expect(xPost(story, url)).toEndWith(url);
    expect(linkedInPost(story, url)).toContain("Read the DevPulse brief:");
  });
});
