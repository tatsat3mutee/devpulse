import type { FetchResult } from "./types.js";

/**
 * Hugging Face Daily Papers API — curated research papers.
 * Already filtered by HF editors, so no minimum threshold needed.
 * Stores likes count in metadata.
 */
export async function fetchHuggingFace(
  sourceUrl: string
): Promise<FetchResult[]> {
  const res = await fetch(sourceUrl, {
    headers: { "User-Agent": "ai-pulse/1.0" },
  });
  if (!res.ok) throw new Error(`HuggingFace API ${res.status}`);

  const papers: any[] = await res.json();
  const results: FetchResult[] = [];

  for (const entry of papers) {
    const p = entry.paper || entry;
    const title = p.title || "";
    const summary = p.summary || p.abstract || "";
    const paperId = p.id || p.paperId || "";
    const url = paperId
      ? `https://huggingface.co/papers/${paperId}`
      : p.url || "";

    if (!url || !title) continue;

    const authors = (p.authors || [])
      .map((a: any) => a.name || a.user?.fullname || a)
      .filter(Boolean);

    results.push({
      title,
      description: summary.slice(0, 500),
      url,
      type: "paper",
      platform: "Hugging Face",
      tags: ["huggingface", "daily-papers"],
      publishedAt: new Date(p.publishedAt || p.createdAt || Date.now()),
      metadata: {
        likes: entry.numLikes || p.likes || 0,
        authors,
        paperId,
      },
    });
  }

  return results;
}
