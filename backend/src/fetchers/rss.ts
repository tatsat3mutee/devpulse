import type { FetchResult } from "./types.js";
import { safeFetch } from "./http.js";

/**
 * Generic RSS/Atom feed fetcher.
 * Works for VS Code blog, GitHub Copilot changelog, OpenAI blog, etc.
 * Parses both RSS 2.0 (<item>) and Atom (<entry>) formats with regex.
 */
export async function fetchRSS(sourceUrl: string): Promise<FetchResult[]> {
  const res = await safeFetch(sourceUrl, {
    headers: {
      "User-Agent": "ai-pulse/1.0",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
    },
  });
  if (!res.ok) throw new Error(`RSS fetch ${res.status}: ${sourceUrl}`);

  const xml = await res.text();
  const results: FetchResult[] = [];
  const weekAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 2 weeks

  // Detect feed format
  const isAtom = xml.includes("<feed") && xml.includes("<entry>");

  if (isAtom) {
    const entries = xml.split("<entry>").slice(1);
    for (const entry of entries) {
      const title = stripCDATA(tag(entry, "title"));
      const link =
        entry.match(/href="([^"]+)"/)?.[1] || tag(entry, "link") || tag(entry, "id");
      const summary = stripCDATA(tag(entry, "summary") || tag(entry, "content"));
      const published = tag(entry, "published") || tag(entry, "updated");
      const author = tag(entry, "name"); // inside <author><name>

      if (!title || !link) continue;
      const pubDate = published ? new Date(published) : null;
      if (pubDate && pubDate < weekAgo) continue;

      results.push({
        title: cleanHTML(title).slice(0, 500),
        description: cleanHTML(summary).slice(0, 1000),
        url: link,
        type: "article",
        platform: guessPlatform(sourceUrl),
        tags: extractCategories(entry),
        publishedAt: pubDate,
        author: author || undefined,
        metadata: { feedUrl: sourceUrl },
      });
    }
  } else {
    // RSS 2.0
    const items = xml.split("<item>").slice(1);
    for (const item of items) {
      const title = stripCDATA(tag(item, "title"));
      const link = tag(item, "link") || tag(item, "guid");
      const desc = stripCDATA(
        tag(item, "description") || tag(item, "content:encoded")
      );
      const pubDate = tag(item, "pubDate") || tag(item, "dc:date");
      const author =
        tag(item, "dc:creator") || tag(item, "author") || tag(item, "creator");
      const imageMatch = item.match(
        /<media:thumbnail[^>]+url="([^"]+)"|<enclosure[^>]+url="([^"]+)"[^>]+type="image/
      );

      if (!title || !link) continue;
      const date = pubDate ? new Date(pubDate) : null;
      if (date && date < weekAgo) continue;

      results.push({
        title: cleanHTML(title).slice(0, 500),
        description: cleanHTML(desc).slice(0, 1000),
        url: cleanLink(link),
        type: "article",
        platform: guessPlatform(sourceUrl),
        tags: extractCategories(item),
        publishedAt: date,
        author: author ? cleanHTML(author) : undefined,
        imageUrl: imageMatch?.[1] || imageMatch?.[2] || undefined,
        metadata: { feedUrl: sourceUrl },
      });
    }
  }

  console.log(`    RSS parsed ${results.length} items from ${sourceUrl}`);
  return results.slice(0, 20); // cap per source
}

// ── Helpers ──────────────────────────────────────────────────────────

function tag(xml: string, name: string): string {
  // Match both <tag>content</tag> and <tag><![CDATA[content]]></tag>
  const regex = new RegExp(
    `<${name}[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*</${name}>`,
    "i"
  );
  const m = xml.match(regex);
  return m ? (m[1] || m[2] || "").trim() : "";
}

function stripCDATA(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function cleanHTML(html: string): string {
  return html
    .replace(/<[^>]+>/g, "") // strip tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLink(link: string): string {
  return link.replace(/<[^>]*>/g, "").trim();
}

function extractCategories(xml: string): string[] {
  const cats = [...xml.matchAll(/<category[^>]*>([^<]+)<\/category>/gi)];
  return cats.map((m) => cleanHTML(m[1])).slice(0, 5);
}

function guessPlatform(url: string): string {
  if (url.includes("code.visualstudio")) return "VS Code";
  if (url.includes("github.blog")) return "GitHub";
  if (url.includes("openai.com")) return "OpenAI";
  if (url.includes("anthropic.com")) return "Anthropic";
  if (url.includes("blog.google") || url.includes("deepmind")) return "Google";
  if (url.includes("microsoft.com") || url.includes("blogs.microsoft")) return "Microsoft";
  if (url.includes("ai.meta.com")) return "Meta";
  if (url.includes("nvidia")) return "NVIDIA";
  if (url.includes("techcrunch")) return "TechCrunch";
  if (url.includes("theverge")) return "The Verge";
  if (url.includes("arstechnica")) return "Ars Technica";
  if (url.includes("venturebeat")) return "VentureBeat";
  return "Blog";
}
