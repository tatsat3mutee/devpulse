import type { FetchResult } from "./types.js";

/**
 * GNews API fetcher — fetches AI news articles.
 * Free tier: 100 requests/day, 10 articles per request.
 * source.url contains the search query (e.g. "artificial intelligence").
 * Requires GNEWS_API_KEY in .env.
 */
export async function fetchGNews(searchQuery: string): Promise<FetchResult[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    console.log("    ⚠️ GNEWS_API_KEY not set, skipping GNews");
    return [];
  }

  const url =
    `https://gnews.io/api/v4/search?` +
    `q=${encodeURIComponent(searchQuery)}` +
    `&lang=en&max=10&sortby=publishedAt` +
    `&apikey=${apiKey}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "ai-pulse/1.0" },
  });
  if (!res.ok) throw new Error(`GNews API ${res.status}`);

  const data = await res.json();
  const results: FetchResult[] = [];

  for (const article of data.articles || []) {
    results.push({
      title: (article.title || "").slice(0, 500),
      description: (article.description || "").slice(0, 1000),
      url: article.url,
      type: "news",
      platform: article.source?.name || "GNews",
      tags: extractTags(article.title + " " + (article.description || "")),
      publishedAt: new Date(article.publishedAt),
      imageUrl: article.image || undefined,
      author: article.source?.name || undefined,
      metadata: {
        source: article.source?.name,
        sourceUrl: article.source?.url,
        gnewsQuery: searchQuery,
      },
    });
  }

  console.log(`    GNews: ${results.length} articles for "${searchQuery}"`);
  return results;
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();
  const tagMap: Record<string, string> = {
    "openai": "OpenAI",
    "google": "Google AI",
    "anthropic": "Anthropic",
    "microsoft": "Microsoft",
    "nvidia": "NVIDIA",
    "meta": "Meta AI",
    "chatgpt": "ChatGPT",
    "gpt": "GPT",
    "claude": "Claude",
    "gemini": "Gemini",
    "llm": "LLM",
    "copilot": "Copilot",
    "startup": "Startup",
    "regulation": "AI Policy",
  };

  for (const [keyword, tag] of Object.entries(tagMap)) {
    if (lower.includes(keyword) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags.slice(0, 5);
}
