import type { FetchResult } from "./types.js";

/**
 * arXiv API — recent AI papers from cs.AI, cs.CL, cs.LG
 * Only papers from last 7 days. Atom XML parsed with regex (format is stable).
 */
export async function fetchArxiv(sourceUrl: string): Promise<FetchResult[]> {
  const categories = "cat:cs.AI+OR+cat:cs.CL+OR+cat:cs.LG+OR+cat:cs.CV+OR+cat:cs.NE+OR+cat:cs.RO+OR+cat:cs.SE+OR+cat:stat.ML";
  const url = `${sourceUrl}?search_query=${categories}&start=0&max_results=40&sortBy=submittedDate&sortOrder=descending`;

  const res = await fetch(url, {
    headers: { "User-Agent": "ai-pulse/1.0" },
  });
  if (!res.ok) throw new Error(`arXiv API ${res.status}`);

  const xml = await res.text();
  const entries = xml.split("<entry>").slice(1);
  const results: FetchResult[] = [];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const entry of entries) {
    const title = tag(entry, "title").replace(/\s+/g, " ");
    const summary = tag(entry, "summary").replace(/\s+/g, " ");
    const published = tag(entry, "published");
    const id = tag(entry, "id");

    const cats = [...entry.matchAll(/category term="([^"]+)"/g)].map((m) => m[1]);
    const authors = [...entry.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)].map(
      (m) => m[1].trim()
    );
    const pdfMatch = entry.match(/link[^>]*title="pdf"[^>]*href="([^"]+)"/);

    const pubDate = new Date(published);
    if (pubDate < weekAgo) continue; // recency gate

    results.push({
      title,
      description: summary.slice(0, 500),
      url: id.startsWith("http") ? id : `https://arxiv.org/abs/${id}`,
      type: "paper",
      platform: "arXiv",
      tags: cats,
      publishedAt: pubDate,
      metadata: {
        authors,
        pdfUrl: pdfMatch?.[1] || null,
        categories: cats,
        arxivId: id.split("/abs/").pop() || id,
      },
    });
  }

  return results;
}

function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : "";
}
