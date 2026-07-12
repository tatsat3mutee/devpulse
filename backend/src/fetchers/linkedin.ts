import type { FetchResult } from "./types.js";
import { safeFetch } from "./http.js";

/**
 * LinkedIn fetcher — aggregates AI content from LinkedIn via multiple strategies:
 *
 * 1. Google News RSS filtered for "site:linkedin.com AI" (no API key needed)
 * 2. LinkedIn official blog RSS (engineering.linkedin.com)
 *
 * LinkedIn has no public content API, so we use indirect feeds.
 * Falls back gracefully if RSS is unavailable.
 */

/**
 * Resolve a Google News redirect URL to the actual destination URL.
 * Google News RSS wraps real URLs in news.google.com/rss/articles/... redirects.
 */
async function resolveGoogleNewsUrl(url: string): Promise<string> {
  if (!url.includes("news.google.com/rss/articles/")) return url;
  try {
    const res = await safeFetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": "ai-pulse/1.0" },
    });
    // The final URL after redirects is the real article URL
    if (res.url && res.url !== url) return res.url;
  } catch {
    // If HEAD fails, try GET with manual redirect
    try {
      const res = await safeFetch(url, {
        redirect: "manual",
        headers: { "User-Agent": "ai-pulse/1.0" },
      });
      const location = res.headers.get("location");
      if (location) return location;
    } catch { /* fall through */ }
  }
  return url;
}

export async function fetchLinkedIn(
  sourceUrl: string
): Promise<FetchResult[]> {
  const results: FetchResult[] = [];

  // Strategy: Use Google News RSS to find LinkedIn AI posts
  // sourceUrl = "https://news.google.com/rss/search?q=site:linkedin.com+AI+OR+LLM+OR+GPT"
  try {
    const res = await safeFetch(sourceUrl, {
      headers: { "User-Agent": "ai-pulse/1.0" },
    });
    if (!res.ok) throw new Error(`LinkedIn/Google RSS ${res.status}`);

    const xml = await res.text();
    const items = xml.split("<item>").slice(1);

    for (const item of items.slice(0, 20)) {
      const title = extractTag(item, "title")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"');
      const rawLink = extractTag(item, "link");
      const pubDate = extractTag(item, "pubDate");
      const description = extractTag(item, "description")
        .replace(/<[^>]+>/g, "")
        .slice(0, 500);
      const source = extractTag(item, "source");

      if (!title || !rawLink) continue;

      // Resolve Google News redirect to actual article URL
      const link = await resolveGoogleNewsUrl(rawLink);

      results.push({
        title,
        description: description || "",
        url: link,
        type: "news",
        platform: "LinkedIn",
        tags: ["linkedin"],
        publishedAt: pubDate ? new Date(pubDate) : new Date(),
        metadata: {
          googleNewsSource: source || null,
          via: "google-news-rss",
          originalGoogleUrl: rawLink !== link ? rawLink : undefined,
        },
      });
    }
  } catch (err) {
    console.error("  ⚠️  LinkedIn Google News RSS failed:", err);
  }

  return results;
}

function extractTag(xml: string, tag: string): string {
  // Handle both <tag>content</tag> and <tag><![CDATA[content]]></tag>
  const cdataMatch = xml.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`)
  );
  if (cdataMatch) return cdataMatch[1].trim();

  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : "";
}
