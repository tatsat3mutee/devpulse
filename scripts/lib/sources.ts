import { createHash } from "node:crypto";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { canonicalizeUrl, htmlToText, safeFetch, type Candidate } from "./pipeline";

export type FeedSource = {
  id: string;
  label: string;
  url: string;
  articleOrigin: string;
  articlePath: string;
  primarySourceType: "vendor-post" | "official-docs";
  vendorAuthored: boolean;
};

export const officialFeeds: readonly FeedSource[] = [
  { id: "huggingface-blog", label: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", articleOrigin: "https://huggingface.co", articlePath: "/blog/", primarySourceType: "vendor-post", vendorAuthored: true },
  { id: "pytorch-blog", label: "PyTorch Blog", url: "https://pytorch.org/feed/", articleOrigin: "https://pytorch.org", articlePath: "/blog/", primarySourceType: "vendor-post", vendorAuthored: false },
  { id: "kubernetes-blog", label: "Kubernetes Blog", url: "https://kubernetes.io/feed.xml", articleOrigin: "https://kubernetes.io", articlePath: "/blog/", primarySourceType: "vendor-post", vendorAuthored: false },
];

export type OfficialCandidate = Omit<Candidate, "source"> & {
  source: "official-feed";
  sourceInfo: FeedSource;
};
export type CollectedCandidate = Candidate | OfficialCandidate;
export type SourceHealth = {
  id: string;
  label: string;
  url: string;
  status: "ok" | "empty" | "partial" | "error";
  fetched: number;
  accepted: number;
  rejected: number;
  truncated: boolean;
  errors: string[];
  durationMs: number;
};

export function validateEditionDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Edition date must be YYYY-MM-DD");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error("Edition date is not a calendar date");
  return value;
}

export function createLimiter(concurrency: number) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) throw new Error("Concurrency must be between 1 and 16");
  let active = 0;
  const waiting: (() => void)[] = [];
  return async function limited<Result>(work: () => Promise<Result>): Promise<Result> {
    if (active >= concurrency) await new Promise<void>((resolve) => waiting.push(resolve));
    else active++;
    try { return await work(); }
    finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}

const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, trimValues: true });
const list = (value: unknown): unknown[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): string => typeof value === "string" ? value : typeof record(value)["#text"] === "string" ? record(value)["#text"] as string : "";

function inWindow(value: unknown, until: Date, days: number): string | undefined {
  if (typeof value !== "string" || !value.trim()) return;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp > until.getTime() || timestamp < until.getTime() - days * 86_400_000) return;
  return new Date(timestamp).toISOString();
}

export function parseOfficialFeed(xml: string, source: FeedSource, until: Date) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("DTD/entity declarations are not supported");
  if (XMLValidator.validate(xml) !== true) throw new Error("Invalid feed XML");
  const document = parser.parse(xml);
  const atom = document.feed !== undefined;
  if (!atom && !document.rss?.channel) throw new Error("Expected RSS or Atom feed");
  const entries = list(atom ? document.feed.entry : document.rss.channel.item);
  const candidates: OfficialCandidate[] = [];
  const seen = new Set<string>();
  let rejected = 0;
  for (const entry of entries.slice(0, 100)) {
    try {
      const item = record(entry);
      const title = htmlToText(text(item.title)).slice(0, 300);
      const publishedAt = inWindow(text(item.published ?? item.pubDate ?? item.date ?? item.updated), until, 7);
      const link = atom ? list(item.link).map(record).find((value) => (!value["@_rel"] || value["@_rel"] === "alternate") && (!value["@_type"] || value["@_type"] === "text/html"))?.["@_href"] : text(item.link);
      if (!title || !publishedAt || typeof link !== "string" || !link.trim()) throw new Error("Missing fields");
      const url = new URL(link, source.url);
      if (url.origin !== source.articleOrigin || !url.pathname.startsWith(source.articlePath) || url.username || url.password) throw new Error("Outside publisher scope");
      const canonical = canonicalizeUrl(url.toString());
      if (seen.has(canonical)) throw new Error("Duplicate entry");
      seen.add(canonical);
      candidates.push({ id: `feed-${source.id}-${createHash("sha256").update(canonical).digest("hex").slice(0, 16)}`, source: "official-feed", title, url: canonical, publishedAt, metrics: {}, sourceInfo: { ...source } });
    } catch { rejected++; }
  }
  return { candidates, fetched: Math.min(entries.length, 100), rejected, truncated: entries.length > 100 };
}

export type SourceFetch = (url: string, init?: RequestInit) => Promise<Response>;

async function boundedBody(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty response body");
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return body + decoder.decode();
      bytes += chunk.value.byteLength;
      if (bytes > 2_000_000) throw new Error("Response exceeds 2 MB limit");
      body += decoder.decode(chunk.value, { stream: true });
    }
  } finally { await reader.cancel(); }
}

const trackedRepos = ["vllm-project/vllm", "ggml-org/llama.cpp", "huggingface/transformers", "langchain-ai/langchain", "openai/openai-python", "anthropics/anthropic-sdk-python"];

export async function collectSources(options: { date: string; now?: Date; fetcher?: SourceFetch; concurrency?: number; githubToken?: string; feeds?: readonly FeedSource[]; includeSignals?: boolean }) {
  const date = validateEditionDate(options.date);
  const started = options.now ?? new Date();
  if (!Number.isFinite(started.getTime())) throw new Error("Invalid collection clock");
  const until = new Date(Math.min(started.getTime(), Date.parse(`${date}T23:59:59.999Z`)));
  const limited = createLimiter(options.concurrency ?? 4);
  const fetcher = options.fetcher ?? safeFetch;
  const request = (url: string, headers: HeadersInit = {}) => limited(async () => boundedBody(await fetcher(url, { headers, signal: AbortSignal.timeout(15_000) })));
  const json = async (url: string, headers: HeadersInit = {}) => JSON.parse(await request(url, { Accept: "application/json", ...headers }));
  const health: SourceHealth[] = [];
  const run = async (id: string, label: string, url: string, work: (report: SourceHealth) => Promise<CollectedCandidate[]>) => {
    const begin = Date.now();
    const report: SourceHealth = { id, label, url, status: "empty", fetched: 0, accepted: 0, rejected: 0, truncated: false, errors: [], durationMs: 0 };
    let candidates: CollectedCandidate[] = [];
    try {
      candidates = await work(report);
      report.accepted = candidates.length;
      report.status = report.errors.length ? "partial" : candidates.length ? "ok" : "empty";
    } catch (error) {
      report.status = "error";
      report.errors.push(error instanceof Error && /^(HTTP \d{3}|Invalid feed XML|Expected RSS or Atom feed|DTD\/entity declarations are not supported|Response exceeds 2 MB limit|Empty response body)$/.test(error.message) ? error.message : "Request, timeout, or response validation failed");
    }
    report.durationMs = Date.now() - begin;
    health.push(report);
    return candidates;
  };
  const jobs = (options.feeds ?? officialFeeds).map((source) => run(source.id, source.label, source.url, async (report) => {
    const result = parseOfficialFeed(await request(source.url, { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" }), source, until);
    Object.assign(report, { fetched: result.fetched, rejected: result.rejected, truncated: result.truncated });
    return result.candidates;
  }));
  if (options.includeSignals !== false) {
    for (const repo of trackedRepos) {
      const url = `https://api.github.com/repos/${repo}/releases?per_page=3`;
      jobs.push(run(`github-${repo}`, `${repo} releases`, url, async (report) => {
        const items: unknown = await json(url, options.githubToken ? { Authorization: `Bearer ${options.githubToken}`, "X-GitHub-Api-Version": "2022-11-28" } : {});
        if (!Array.isArray(items)) throw new Error("Invalid releases response");
        report.fetched = Math.min(items.length, 3);
        report.truncated = items.length >= 3;
        const candidates: Candidate[] = [];
        for (const value of items.slice(0, 3)) {
          const release = record(value);
          const publishedAt = inWindow(release.published_at, until, 7);
          const title = text(release.name) || text(release.tag_name);
          const link = text(release.html_url);
          if (!publishedAt || !title || release.draft || release.prerelease || !Number.isSafeInteger(release.id) || !link.startsWith(`https://github.com/${repo}/releases/tag/`)) { report.rejected++; continue; }
          candidates.push({ id: `github-${repo.replace("/", "-")}-${release.id}`, source: "github-release", title: `${repo} ${title}`, url: link, publishedAt, metrics: {} });
        }
        return candidates;
      }));
    }
    const url = "https://hacker-news.firebaseio.com/v0/topstories.json";
    jobs.push(run("hn", "Hacker News engineering signals", url, async (report) => {
      const ids: unknown = await json(url);
      if (!Array.isArray(ids) || !ids.every(Number.isSafeInteger)) throw new Error("Invalid HN IDs");
      report.truncated = ids.length > 90;
      const items = await Promise.all(ids.slice(0, 90).map(async (id) => {
        try { report.fetched++; return record(await json(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)); }
        catch { report.errors.push(`Item ${id} failed`); return {}; }
      }));
      const candidates: Candidate[] = [];
      for (const item of items) {
        const timestamp = typeof item.time === "number" ? item.time * 1000 : NaN;
        const publishedAt = Number.isFinite(timestamp) && Math.abs(timestamp) <= 8.64e15 ? inWindow(new Date(timestamp).toISOString(), until, 3) : undefined;
        const title = text(item.title);
        const link = text(item.url);
        if (item.type !== "story" || !Number.isSafeInteger(item.id) || !publishedAt || !/^https?:\/\//.test(link) || typeof item.score !== "number" || item.score < 10 || !/\b(ai|llm|model|inference|compiler|database|kubernetes|linux|rust|python|javascript|typescript|api|sdk|software|developer|programming|security|vulnerability|runtime|gpu|cache|distributed)\b/i.test(title)) { report.rejected++; continue; }
        let canonical: string;
        try {
          const article = new URL(link);
          if (article.username || article.password) throw new Error("Credentialed URL");
          canonical = canonicalizeUrl(article.toString());
        } catch { report.rejected++; continue; }
        const commentIds = list(item.kids).filter(Number.isSafeInteger);
        const comments = await Promise.all(commentIds.slice(0, 8).map(async (id) => {
          try {
            const comment = record(await json(`https://hacker-news.firebaseio.com/v0/item/${id}.json`));
            return comment.deleted || comment.dead ? "" : htmlToText(text(comment.text));
          } catch { report.errors.push(`Comment ${id} failed`); return ""; }
        }));
        candidates.push({ id: `hn-${item.id}`, source: "hn", title, url: canonical, discussionUrl: `https://news.ycombinator.com/item?id=${item.id}`, discussionExcerpt: comments.filter(Boolean).join("\n").slice(0, 5000), publishedAt, metrics: { points: item.score, comments: typeof item.descendants === "number" ? item.descendants : 0 } });
      }
      return candidates;
    }));
  }
  const candidates = (await Promise.all(jobs)).flat();
  health.sort((left, right) => left.id.localeCompare(right.id));
  return {
    candidates,
    manifest: { version: 1, date, startedAt: started.toISOString(), completedAt: new Date().toISOString(), windowEnd: until.toISOString(), feedLookbackDays: 7, hnLookbackDays: 3, concurrency: options.concurrency ?? 4, candidateCount: candidates.length, degraded: health.some((source) => source.status === "error" || source.status === "partial"), sources: health },
  };
}