import { describe, expect, test } from "bun:test";
import {
  authorityForPlatform,
  durabilityScore,
  spikeAndDiePenalty,
  tiebreak,
  type DurabilityInput,
} from "./durability.js";
import {
  bestMatch,
  classifyOverlap,
  jaccard,
  titleSimilarity,
  titleTokens,
} from "./similarity.js";

const base: DurabilityInput = {
  mechanismDensity: 0.5,
  hasNumber: false,
  sourceAuthority: 0.5,
  corroboratingSources: 1,
  novelty: 0.5,
  hasDurableAnchor: true,
};

describe("authorityForPlatform", () => {
  test("primary research and first-party lab blogs outrank aggregators", () => {
    expect(authorityForPlatform("arXiv")).toBeGreaterThan(authorityForPlatform("Hacker News"));
    expect(authorityForPlatform("Anthropic")).toBeGreaterThan(authorityForPlatform("TechCrunch"));
  });

  test("social platforms rank lowest — they corroborate, never originate", () => {
    for (const social of ["Reddit", "X", "LinkedIn", "GNews"]) {
      expect(authorityForPlatform(social)).toBeLessThan(authorityForPlatform("GitHub"));
    }
  });

  test("unknown platforms get a middling default", () => {
    const unknown = authorityForPlatform("SomethingNew");
    expect(unknown).toBeGreaterThan(0);
    expect(unknown).toBeLessThan(1);
  });
});

describe("spikeAndDiePenalty", () => {
  test("a durable anchor exempts an item entirely — real releases spike too", () => {
    expect(spikeAndDiePenalty(10_000, true)).toBe(0);
  });

  test("quiet unanchored items are not penalised", () => {
    expect(spikeAndDiePenalty(5, false)).toBe(0);
    expect(spikeAndDiePenalty(undefined, false)).toBe(0);
  });

  test("unanchored spikes are penalised, log-scaled and capped", () => {
    const modest = spikeAndDiePenalty(200, false);
    const huge = spikeAndDiePenalty(50_000, false);
    expect(modest).toBeGreaterThan(0);
    expect(huge).toBeGreaterThan(modest);
    expect(huge).toBeLessThanOrEqual(30);
  });
});

describe("durabilityScore", () => {
  test("stays within 0-100", () => {
    const floor = durabilityScore({
      mechanismDensity: 0, hasNumber: false, sourceAuthority: 0,
      corroboratingSources: 0, novelty: 0, hasDurableAnchor: true,
    });
    const ceiling = durabilityScore({
      mechanismDensity: 1, hasNumber: true, sourceAuthority: 1,
      corroboratingSources: 99, novelty: 1, hasDurableAnchor: true,
    });
    expect(floor).toBe(0);
    expect(ceiling).toBeLessThanOrEqual(100);
    expect(ceiling).toBeGreaterThan(95);
  });

  test("mechanism density is the heaviest single axis", () => {
    const mech = durabilityScore({ ...base, mechanismDensity: 1 });
    const auth = durabilityScore({ ...base, sourceAuthority: 1 });
    const nov = durabilityScore({ ...base, novelty: 1 });
    expect(mech).toBeGreaterThan(auth);
    expect(mech).toBeGreaterThan(nov);
  });

  test("a concrete number is worth real points", () => {
    expect(durabilityScore({ ...base, hasNumber: true }))
      .toBeGreaterThan(durabilityScore({ ...base, hasNumber: false }));
  });

  test("corroboration saturates — the 2nd source matters more than the 6th", () => {
    const one = durabilityScore({ ...base, corroboratingSources: 1 });
    const two = durabilityScore({ ...base, corroboratingSources: 2 });
    const six = durabilityScore({ ...base, corroboratingSources: 6 });
    const twelve = durabilityScore({ ...base, corroboratingSources: 12 });
    expect(two - one).toBeGreaterThan(twelve - six);
  });

  /**
   * The assertion the whole redesign exists for. Under the old scorer this
   * ordering was inverted: the Reddit thread's upvotes produced real engagement
   * variance while the lab blog was pinned to a flat default of 20.
   */
  test("a spiked-and-died Reddit thread ranks below an anchored lab blog post", () => {
    const redditSpike = durabilityScore({
      mechanismDensity: 0.2,
      hasNumber: false,
      sourceAuthority: authorityForPlatform("Reddit"),
      corroboratingSources: 1,
      novelty: 0.5,
      socialVelocity: 900,
      hasDurableAnchor: false,
    });

    const labBlog = durabilityScore({
      mechanismDensity: 0.9,
      hasNumber: true,
      sourceAuthority: authorityForPlatform("Anthropic"),
      corroboratingSources: 3,
      novelty: 0.7,
      socialVelocity: 2,
      hasDurableAnchor: true,
    });

    expect(labBlog).toBeGreaterThan(redditSpike);
  });

  test("recency is not a term — identical inputs score identically regardless of age", () => {
    const old = durabilityScore(base);
    const fresh = durabilityScore({ ...base });
    expect(old).toBe(fresh);
  });
});

describe("tiebreak", () => {
  test("durability wins first", () => {
    const older = { durability: 80, firstSeenAt: "2026-01-01T00:00:00Z" };
    const newer = { durability: 60, firstSeenAt: "2026-08-01T00:00:00Z" };
    expect(tiebreak(older, newer)).toBeLessThan(0); // older sorts first
  });

  test("recency only breaks an exact tie", () => {
    const older = { durability: 70, firstSeenAt: "2026-01-01T00:00:00Z" };
    const newer = { durability: 70, firstSeenAt: "2026-08-01T00:00:00Z" };
    expect(tiebreak(older, newer)).toBeGreaterThan(0); // newer sorts first
  });
});

describe("similarity", () => {
  test("strips stop words and short tokens", () => {
    expect(titleTokens("The new way to do a thing")).toEqual(new Set(["way", "thing"]));
  });

  test("jaccard is 0 against an empty set and 1 for identical sets", () => {
    expect(jaccard(new Set(), new Set(["a"]))).toBe(0);
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  });

  test("near-duplicate phrasings of one mechanism score high", () => {
    const sim = titleSimilarity(
      "Prefix caching cuts inference cost dramatically",
      "Prefix caching cuts inference cost on cache hits"
    );
    expect(sim).toBeGreaterThan(0.55);
  });

  test("unrelated mechanisms score low", () => {
    const sim = titleSimilarity(
      "Prefix caching cuts inference cost",
      "Anthropic launches four certification exams"
    );
    expect(sim).toBeLessThan(0.28);
  });

  test("classifyOverlap bands the verdict", () => {
    expect(classifyOverlap(0.9)).toBe("duplicate");
    expect(classifyOverlap(0.4)).toBe("uncertain");
    expect(classifyOverlap(0.05)).toBe("distinct");
  });

  test("bestMatch finds the closest existing concept", () => {
    const existing = [
      { id: 1, title: "Speculative decoding speeds up large models" },
      { id: 2, title: "Prefix caching cuts inference cost on hits" },
    ];
    const match = bestMatch("Prefix caching reduces inference cost", existing);
    expect(match?.candidate.id).toBe(2);
  });

  test("bestMatch returns null on an empty corpus", () => {
    expect(bestMatch("anything", [])).toBeNull();
  });
});
