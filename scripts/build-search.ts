// Builds the story search index: one Pagefind record per story across every edition, with topic, kind,
// desk and month filters and date/score sorting. Run after `astro build`; writes dist/pagefind/.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as pagefind from "pagefind";
import { DESKS, KINDS, digestSchema, domainOf, topicDesk, topicLabel, type Digest } from "../src/lib/digest";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
// One <meta> per value (Pagefind's key[content] form), so URLs, colons and commas in values are never parsed as separators.
const tags = (kind: "meta" | "filter" | "sort", entries: Record<string, string | undefined>) => Object.entries(entries)
  .filter(([, value]) => value)
  .map(([key, value]) => `<meta data-pagefind-${kind}="${key}[content]" content="${escapeHtml(value!)}">`).join("");

export type SearchRecord = { url: string; meta: Record<string, string>; filters: Record<string, string[]>; sort: Record<string, string>; text: string[]; content: string };

/** One search document per story: the headline is the page's h1 so Pagefind weights it above the summary. */
export function searchRecords(digests: Digest[]): SearchRecord[] {
  const seen = new Set<string>();
  return [...digests].sort((a, b) => b.date.localeCompare(a.date)).flatMap((digest) => digest.items.flatMap((item) => {
    // A story that ran on two days is indexed once, at its most recent edition.
    if (seen.has(item.url)) return [];
    seen.add(item.url);
    const topic = topicLabel(item.topic);
    const kind = item.kind ? KINDS[item.kind] : "";
    const domain = domainOf(item.url);
    const meta = { link: item.url, date: digest.date, topic, kind, domain, author: item.author ?? "", score: String(item.score) };
    const filters: Record<string, string[]> = { topic: [topic], desk: [DESKS[topicDesk(item.topic)].label], month: [digest.date.slice(0, 7)], ...(kind ? { kind: [kind] } : {}) };
    const sort = { date: digest.date, score: String(item.score) };
    const text = [item.whyRead, ...(item.brief ?? []), [item.originalTitle, item.author, domain].filter(Boolean).join(" · ")];
    const content = `<!doctype html><html lang="en"><head><title>${escapeHtml(item.headline)}</title></head><body>`
      + `<article data-pagefind-body>`
      + tags("meta", meta) + tags("filter", Object.fromEntries(Object.entries(filters).map(([key, [value]]) => [key, value]))) + tags("sort", sort)
      + `<h1 data-pagefind-meta="title">${escapeHtml(item.headline)}</h1>`
      + text.map((line) => `<p>${escapeHtml(line)}</p>`).join("")
      + `</article></body></html>`;
    return [{ url: `/edition/${digest.date}/#${item.id}`, meta, filters, sort, text, content }];
  }));
}

if (import.meta.main) {
  const dir = join("data", "digests");
  const files = (await readdir(dir)).filter((file) => file.endsWith(".json"));
  const digests = await Promise.all(files.map(async (file) => digestSchema.parse(JSON.parse(await readFile(join(dir, file), "utf8")))));
  const records = searchRecords(digests);
  const { index, errors } = await pagefind.createIndex({ forceLanguage: "en" });
  if (!index) throw new Error(`Pagefind: ${errors.join("; ")}`);
  for (const record of records) {
    const { errors: recordErrors } = await index.addHTMLFile({ url: record.url, content: record.content });
    if (recordErrors.length) throw new Error(`Pagefind record ${record.url}: ${recordErrors.join("; ")}`);
  }
  const written = await index.writeFiles({ outputPath: join("dist", "pagefind") });
  if (written.errors.length) throw new Error(`Pagefind write: ${written.errors.join("; ")}`);
  await pagefind.close();
  console.log(`Search index: ${records.length} stories from ${digests.length} editions`);
}
