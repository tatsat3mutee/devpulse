import { describe, expect, test } from "bun:test";
import { clusterItems } from "./cluster";
import type { Item } from "./api";

function makeItem(id: number, title: string, score = 0): Item {
  return {
    id,
    title,
    description: null,
    url: `https://example.com/${id}`,
    type: "news",
    platform: "Test",
    tags: [],
    score,
    published_at: new Date().toISOString(),
    topic_name: null,
    topic_slug: null,
    source_name: "Test",
  } as unknown as Item;
}

describe("clusterItems", () => {
  test("merges near-duplicate titles into one cluster", () => {
    const items = [
      makeItem(1, "OpenAI releases GPT-5.6 with major reasoning upgrades"),
      makeItem(2, "OpenAI releases GPT-5.6 reasoning upgrades announced"),
      makeItem(3, "Completely unrelated Postgres partitioning deep dive"),
    ];
    const clusters = clusterItems(items);
    expect(clusters.length).toBe(2);
    const merged = clusters.find((c) => c.related.length > 0)!;
    expect(merged.primary.id).toBe(1);
    expect(merged.related.map((r) => r.id)).toEqual([2]);
  });

  test("keeps distinct stories separate", () => {
    const items = [
      makeItem(1, "Anthropic launches Claude Fable 5"),
      makeItem(2, "Meta open sources new vision model"),
      makeItem(3, "Rust rewrite of Bun runtime announced"),
    ];
    expect(clusterItems(items).length).toBe(3);
  });

  test("empty input yields no clusters", () => {
    expect(clusterItems([])).toEqual([]);
  });

  test("stop words and short tokens don't cause false merges", () => {
    const items = [
      makeItem(1, "How the new AI can now do this"),
      makeItem(2, "Why a top AI will now have that"),
    ];
    // Titles share only stop words → must NOT merge
    expect(clusterItems(items).length).toBe(2);
  });

  test("respects a custom threshold", () => {
    const items = [
      makeItem(1, "GPT-5.6 model release benchmark results"),
      makeItem(2, "GPT-5.6 model release performance details"),
    ];
    expect(clusterItems(items, 0.99).length).toBe(2); // strict: no merge
    expect(clusterItems(items, 0.3).length).toBe(1); // loose: merge
  });
});
