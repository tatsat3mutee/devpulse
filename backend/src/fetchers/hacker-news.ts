import type { FetchResult } from "./types.js";
import { safeFetch } from "./http.js";

const AI_KEYWORDS = /\b(ai|llm|gpt|claude|gemini|openai|anthropic|deepmind|mistral|mixtral|neural|transformer|diffusion|embedding|vector|rag|agent|copilot|chatbot|machine.?learn|deep.?learn|langchain|fine.?tun|llama|hugging\s?face)\b/i;

/**
 * Hacker News Algolia API — AI/ML stories.
 *
 * If sourceUrl is a full query URL (contains ?query=), use it directly.
 * Otherwise, fetch front-page + recent popular stories and filter for AI keywords.
 */
export async function fetchHackerNews(
  sourceUrl: string
): Promise<FetchResult[]> {
  const weekAgo = Math.floor(
    (Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000
  );

  let url: string;
  let filterClientSide = false;

  if (sourceUrl.includes("?query=") || sourceUrl.includes("/search")) {
    // Full search query — use directly with recency filter
    const sep = sourceUrl.includes("?") ? "&" : "?";
    url = `${sourceUrl}${sep}numericFilters=created_at_i>${weekAgo}`;
  } else {
    // Base API URL — get front page + recent popular AI stories
    url = `${sourceUrl}/search?tags=story&numericFilters=points>10,created_at_i>${weekAgo}&hitsPerPage=50`;
    filterClientSide = true;
  }

  const res = await safeFetch(url, {
    headers: { "User-Agent": "ai-pulse/1.0" },
  });
  if (!res.ok) throw new Error(`HN API ${res.status}`);

  const data: any = await res.json();
  let hits = data.hits || [];

  // Filter for AI-related content when using broad queries
  if (filterClientSide) {
    hits = hits.filter((h: any) => {
      const text = `${h.title || ""} ${h.story_text || ""}`;
      return AI_KEYWORDS.test(text);
    });
  }

  const results: FetchResult[] = [];

  for (const hit of hits) {
    const itemUrl =
      hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;

    results.push({
      title: hit.title || "",
      description: hit.story_text?.slice(0, 500) || null,
      url: itemUrl,
      type: "news",
      platform: "Hacker News",
      tags: ["hacker-news"],
      publishedAt: new Date(hit.created_at || Date.now()),
      metadata: {
        points: hit.points || 0,
        comments: hit.num_comments || 0,
        hnId: hit.objectID,
        hnUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        author: hit.author || "",
      },
    });
  }

  return results;
}
