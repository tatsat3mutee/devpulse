import { describe, expect, test } from "bun:test";
import { engagementScore, recencyScore } from "./scorer.js";

describe("engagementScore", () => {
  test("returns 0 for zero engagement", () => {
    expect(engagementScore("Reddit", {})).toBe(0);
  });

  test("is log-scaled and capped at 100", () => {
    const small = engagementScore("Reddit", { upvotes: 10 });
    const big = engagementScore("Reddit", { upvotes: 10_000 });
    const huge = engagementScore("Reddit", { upvotes: 100_000_000 });
    expect(small).toBeGreaterThan(0);
    expect(big).toBeGreaterThan(small);
    expect(huge).toBeLessThanOrEqual(100);
  });

  test("weights HN points over comments", () => {
    const points = engagementScore("Hacker News", { points: 100, comments: 0 });
    const comments = engagementScore("Hacker News", { points: 0, comments: 100 });
    expect(points).toBeGreaterThan(comments);
  });

  test("GitHub combines stars, forks, watchers", () => {
    const starsOnly = engagementScore("GitHub", { stars: 1000 });
    const all = engagementScore("GitHub", { stars: 1000, forks: 500, watchers: 200 });
    expect(all).toBeGreaterThan(starsOnly);
  });

  test("arXiv gets a fixed curated boost", () => {
    expect(engagementScore("arXiv", {})).toBeCloseTo(
      Math.min(100, (Math.log(1 + 45) / Math.log(10001)) * 100)
    );
  });

  test("unknown platforms get the default base", () => {
    expect(engagementScore("SomethingNew", {})).toBeGreaterThan(0);
  });
});

describe("recencyScore", () => {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);

  test("null published date gets neutral 30", () => {
    expect(recencyScore(null)).toBe(30);
  });

  test("decays monotonically with age", () => {
    expect(recencyScore(hoursAgo(1))).toBe(100);
    expect(recencyScore(hoursAgo(12))).toBe(90);
    expect(recencyScore(hoursAgo(48))).toBe(70);
    expect(recencyScore(hoursAgo(100))).toBe(50);
    expect(recencyScore(hoursAgo(200))).toBe(30);
    expect(recencyScore(hoursAgo(400))).toBe(10);
  });

  test("accepts ISO string dates", () => {
    expect(recencyScore(hoursAgo(1).toISOString())).toBe(100);
  });
});
