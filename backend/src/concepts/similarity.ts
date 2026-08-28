/**
 * Title similarity — ported from the frontend's `lib/cluster.ts`, which already
 * ships this logic (tested in `frontend/src/lib/cluster.test.ts`) to collapse
 * near-duplicate feed items into "more sources".
 *
 * Concept dedupe needs the same primitive on the backend. At 2-5 concepts a
 * week there is no case for embeddings or pgvector: lexical overlap plus a
 * single LLM confirm for near-misses is cheaper, deterministic, and testable.
 */

const STOP = new Set([
  "the", "a", "an", "and", "or", "for", "with", "from", "into", "that", "this",
  "its", "his", "her", "their", "your", "our", "how", "why", "what", "when",
  "now", "new", "top", "can", "will", "has", "have", "are", "was", "were",
]);

/** Lowercased, punctuation-stripped, stop-word-filtered tokens of length > 2. */
export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
  );
}

/** Jaccard index: |A ∩ B| / |A ∪ B|. Returns 0 if either side is empty. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Convenience wrapper for two raw strings. */
export function titleSimilarity(a: string, b: string): number {
  return jaccard(titleTokens(a), titleTokens(b));
}

/**
 * Dedupe thresholds.
 *
 * Above CERTAIN we merge without asking the LLM. Between MAYBE and CERTAIN we
 * pay for one confirm call. Below MAYBE it is a new concept.
 *
 * These are deliberately lower than the frontend's 0.5 story-clustering
 * threshold: two write-ups of the same *mechanism* often share far less
 * vocabulary than two write-ups of the same *news story*, so the band where a
 * human (or an LLM) needs to arbitrate is wider.
 */
export const DEDUPE_CERTAIN = 0.55;
export const DEDUPE_MAYBE = 0.28;

export type DedupeVerdict = "duplicate" | "uncertain" | "distinct";

export function classifyOverlap(similarity: number): DedupeVerdict {
  if (similarity >= DEDUPE_CERTAIN) return "duplicate";
  if (similarity >= DEDUPE_MAYBE) return "uncertain";
  return "distinct";
}

/**
 * Best match for `title` among `candidates`. Used to decide whether an
 * extraction becomes a new concept row or a corroborating source on an
 * existing one.
 */
export function bestMatch<T extends { id: number; title: string }>(
  title: string,
  candidates: T[]
): { candidate: T; similarity: number } | null {
  const tokens = titleTokens(title);
  let best: { candidate: T; similarity: number } | null = null;

  for (const candidate of candidates) {
    const similarity = jaccard(tokens, titleTokens(candidate.title));
    if (!best || similarity > best.similarity) best = { candidate, similarity };
  }

  return best;
}
