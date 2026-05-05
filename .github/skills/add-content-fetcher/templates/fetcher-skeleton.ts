import type { FetchResult } from "./types.js";

/**
 * {{PLATFORM_NAME}} fetcher — {{SHORT_DESCRIPTION}}
 * Fetches recent items from the {{PLATFORM_NAME}} API.
 */
export async function fetch{{PlatformPascal}}(
  sourceUrl: string
): Promise<FetchResult[]> {
  // sourceUrl comes from the sources.url column in the database.
  // It may be a base URL, API endpoint, search query, or channel ID
  // depending on how you configured the source row.

  const url = `${sourceUrl}`; // Build the full API URL here

  const res = await fetch(url, {
    headers: {
      "User-Agent": "ai-pulse/1.0",
      // Add API key headers if needed:
      // "Authorization": `Bearer ${process.env.{{PLATFORM_UPPER}}_API_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`{{PlatformName}} API ${res.status}`);

  const data = await res.json();
  const results: FetchResult[] = [];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const entry of data.items ?? []) {
    const pubDate = new Date(entry.published_at ?? entry.created_at);
    if (pubDate < weekAgo) continue; // recency gate

    results.push({
      title: entry.title,
      description: (entry.description ?? entry.summary ?? "").slice(0, 500),
      url: entry.url ?? entry.link,
      type: "article", // "paper" | "repo" | "social" | "news" | "video" | "article"
      platform: "{{PlatformName}}",
      tags: entry.tags ?? [],
      publishedAt: pubDate,
      metadata: {
        // Store platform-specific fields here:
        // score: entry.score,
        // author: entry.author,
      },
      // Optional fields:
      // imageUrl: entry.image ?? undefined,
      // author: entry.author ?? undefined,
      // duration: entry.duration ?? undefined,
    });
  }

  return results;
}
