import type { Item } from "./api";

/** A cluster of items believed to cover the same story. */
export interface ItemCluster {
  primary: Item;
  related: Item[];
}

const STOP = new Set([
  "the", "a", "an", "and", "or", "for", "with", "from", "into", "that", "this",
  "its", "his", "her", "their", "your", "our", "how", "why", "what", "when",
  "now", "new", "top", "can", "will", "has", "have", "are", "was", "were",
]);

function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * Group items that appear to cover the same story (similar titles).
 * The highest-scored item leads the cluster; the rest become "more sources".
 * Threshold 0.5 keeps clustering conservative — only near-duplicates merge.
 */
export function clusterItems(items: Item[], threshold = 0.5): ItemCluster[] {
  const clusters: { tokens: Set<string>; cluster: ItemCluster }[] = [];

  for (const item of items) {
    const tokens = titleTokens(item.title);
    let matched = false;

    for (const c of clusters) {
      if (jaccard(tokens, c.tokens) >= threshold) {
        c.cluster.related.push(item);
        matched = true;
        break;
      }
    }

    if (!matched) {
      clusters.push({ tokens, cluster: { primary: item, related: [] } });
    }
  }

  return clusters.map((c) => c.cluster);
}
