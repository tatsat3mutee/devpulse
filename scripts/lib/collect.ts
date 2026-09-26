import { XMLParser } from "fast-xml-parser";
import { canonicalizeUrl, createLimiter, htmlToText, readBoundedText, safeFetch } from "./net";
import type { sourceKinds } from "../../src/lib/digest";

export type RawItem = {
  id: string;
  title: string;
  url: string;
  source: (typeof sourceKinds)[number];
  sourceLabel: string;
  discussionUrl?: string;
  points?: number;
  comments?: number;
  stars?: number;
  publishedAt: string;
  snippet?: string;
};

export type SourceReport = { id: string; label: string; status: "ok" | "empty" | "error"; count: number; error?: string };

export const BLOGS = [
  ["cloudflare", "Cloudflare Blog", "https://blog.cloudflare.com/rss/"],
  ["netflix", "Netflix TechBlog", "https://netflixtechblog.com/feed"],
  ["github-eng", "GitHub Engineering", "https://github.blog/engineering/feed/"],
  ["meta-eng", "Engineering at Meta", "https://engineering.fb.com/feed/"],
  ["google-research", "Google Research", "https://research.google/blog/rss/"],
  ["openai", "OpenAI", "https://openai.com/news/rss.xml"],
  ["stripe", "Stripe Engineering", "https://stripe.com/blog/feed.rss"],
  ["dropbox", "Dropbox Tech", "https://dropbox.tech/feed"],
  ["huggingface", "Hugging Face", "https://huggingface.co/blog/feed.xml"],
  ["pytorch", "PyTorch", "https://pytorch.org/feed/"],
  ["kubernetes", "Kubernetes", "https://kubernetes.io/feed.xml"],
  ["lwn", "LWN.net", "https://lwn.net/headlines/rss"],
  ["simonwillison", "Simon Willison", "https://simonwillison.net/atom/everything/"],
  ["jvns", "Julia Evans", "https://jvns.ca/atom.xml"],
  ["lilianweng", "Lilian Weng", "https://lilianweng.github.io/index.xml"],
  ["raschka", "Sebastian Raschka", "https://magazine.sebastianraschka.com/feed"],
  ["rust-blog", "Rust Blog", "https://blog.rust-lang.org/feed.xml"],
] as const;

const DAY = 86_400_000;
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const isWebUrl = (value: unknown): value is string => typeof value === "string" && /^https?:\/\//.test(value);
const text = (value: unknown): string => typeof value === "string" ? value : value && typeof value === "object" && typeof (value as Record<string, unknown>)["#text"] === "string" ? (value as Record<string, string>)["#text"] : "";
const list = (value: unknown): unknown[] => value === undefined ? [] : Array.isArray(value) ? value : [value];

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export async function collectAll(options: { now?: Date; fetcher?: Fetcher; githubToken?: string; concurrency?: number } = {}) {
  const now = options.now ?? new Date();
  const fetcher = options.fetcher ?? safeFetch;
  const limit = createLimiter(options.concurrency ?? 8);
  const get = (url: string, headers: HeadersInit = {}) => limit(async () => {
    const response = await fetcher(url, { headers: { "User-Agent": "DevPulse/3.0 (+https://devpulse.tatsatpandey.com)", ...headers }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return readBoundedText(response, 3_000_000);
  });
  const json = async <T>(url: string, headers: HeadersInit = {}) => JSON.parse(await get(url, { Accept: "application/json", ...headers })) as T;
  const reports: SourceReport[] = [];
  const within = (iso: string, days: number) => { const t = Date.parse(iso); return Number.isFinite(t) && t <= now.getTime() + 3_600_000 && t >= now.getTime() - days * DAY; };
  const run = async (id: string, label: string, work: () => Promise<RawItem[]>) => {
    try {
      const items = await work();
      reports.push({ id, label, status: items.length ? "ok" : "empty", count: items.length });
      return items;
    } catch (error) {
      reports.push({ id, label, status: "error", count: 0, error: (error as Error).message.slice(0, 120) });
      return [];
    }
  };

  const hn = run("hn", "Hacker News", async () => {
    const [top, best] = await Promise.all([json<number[]>("https://hacker-news.firebaseio.com/v0/topstories.json"), json<number[]>("https://hacker-news.firebaseio.com/v0/beststories.json")]);
    const ids = [...new Set([...top.slice(0, 150), ...best.slice(0, 100)])];
    const items = await Promise.all(ids.map((id) => json<Record<string, unknown>>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null)));
    return items.flatMap((item) => {
      if (!item || item.type !== "story" || item.dead || item.deleted || typeof item.title !== "string" || typeof item.time !== "number") return [];
      const publishedAt = new Date(item.time * 1000).toISOString();
      const points = typeof item.score === "number" ? item.score : 0;
      if (points < 25 || !within(publishedAt, 3)) return [];
      const discussionUrl = `https://news.ycombinator.com/item?id=${item.id}`;
      return [{ id: `hn-${item.id}`, title: item.title, url: isWebUrl(item.url) ? item.url : discussionUrl, source: "hn" as const, sourceLabel: "Hacker News", discussionUrl, points, comments: typeof item.descendants === "number" ? item.descendants : 0, publishedAt, snippet: typeof item.text === "string" ? htmlToText(item.text).slice(0, 1200) : undefined }];
    });
  });

  const lobsters = run("lobsters", "Lobsters", async () => {
    const stories = await json<Array<Record<string, unknown>>>("https://lobste.rs/hottest.json");
    return stories.flatMap((story) => {
      const publishedAt = new Date(String(story.created_at)).toISOString();
      if (typeof story.title !== "string" || !within(publishedAt, 4)) return [];
      const discussionUrl = isWebUrl(story.comments_url) ? story.comments_url : undefined;
      const url = isWebUrl(story.url) && story.url ? story.url : discussionUrl;
      if (!url) return [];
      return [{ id: `lobsters-${slug(String(story.short_id))}`, title: story.title, url, source: "lobsters" as const, sourceLabel: "Lobsters", discussionUrl, points: Number(story.score) || 0, comments: Number(story.comment_count) || 0, publishedAt, snippet: typeof story.description_plain === "string" ? story.description_plain.slice(0, 1200) : undefined }];
    });
  });

  const github = run("github", "GitHub (new repositories)", async () => {
    const since = new Date(now.getTime() - 7 * DAY).toISOString().slice(0, 10);
    const headers: HeadersInit = { Accept: "application/vnd.github+json", ...(options.githubToken ? { Authorization: `Bearer ${options.githubToken}` } : {}) };
    const result = await json<{ items?: Array<Record<string, unknown>> }>(`https://api.github.com/search/repositories?q=created:%3E${since}+stars:%3E150&sort=stars&order=desc&per_page=30`, headers);
    return (result.items ?? []).flatMap((repo) => {
      if (typeof repo.full_name !== "string" || !isWebUrl(repo.html_url) || repo.fork || repo.archived) return [];
      const description = typeof repo.description === "string" ? repo.description : "";
      return [{ id: `github-${slug(repo.full_name)}`, title: description ? `${repo.full_name}: ${description}` : repo.full_name, url: repo.html_url, source: "github" as const, sourceLabel: "GitHub", stars: Number(repo.stargazers_count) || 0, publishedAt: new Date(String(repo.created_at)).toISOString(), snippet: [description, typeof repo.language === "string" ? `Language: ${repo.language}` : "", Array.isArray(repo.topics) ? `Topics: ${repo.topics.join(", ")}` : ""].filter(Boolean).join(". ") }];
    });
  });

  const papers = run("hf-papers", "Hugging Face Daily Papers", async () => {
    const entries = await json<Array<{ paper?: Record<string, unknown>; publishedAt?: string }>>("https://huggingface.co/api/daily_papers");
    return entries.flatMap(({ paper, publishedAt }) => {
      if (!paper || typeof paper.id !== "string" || typeof paper.title !== "string") return [];
      const upvotes = Number(paper.upvotes) || 0;
      if (upvotes < 5) return [];
      return [{ id: `paper-${slug(paper.id)}`, title: paper.title.replace(/\s+/g, " ").trim(), url: `https://huggingface.co/papers/${paper.id}`, source: "papers" as const, sourceLabel: "Hugging Face Papers", points: upvotes, publishedAt: new Date(publishedAt ?? now).toISOString(), snippet: typeof paper.summary === "string" ? paper.summary.replace(/\s+/g, " ").slice(0, 1400) : undefined }];
    });
  });

  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, processEntities: true });
  const blogs = BLOGS.map(([id, label, url]) => run(`blog-${id}`, label, async () => {
    const xml = await get(url, { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" });
    if (/<!ENTITY/i.test(xml)) throw new Error("Entity declarations are not supported");
    const doc = parser.parse(xml) as Record<string, any>;
    const entries = list(doc.feed ? doc.feed.entry : doc.rss?.channel?.item).slice(0, 30) as Array<Record<string, unknown>>;
    return entries.flatMap((entry) => {
      const title = htmlToText(text(entry.title));
      const link = doc.feed ? (list(entry.link) as Array<Record<string, string>>).find((l) => !l["@_rel"] || l["@_rel"] === "alternate")?.["@_href"] : text(entry.link);
      const date = text(entry.published ?? entry.pubDate ?? entry.updated ?? entry.date);
      if (!title || !isWebUrl(link) || !date) return [];
      const publishedAt = new Date(date).toISOString();
      if (!within(publishedAt, 3)) return [];
      const summary = htmlToText(text(entry.summary ?? entry.description ?? entry.content ?? "")).slice(0, 1200);
      return [{ id: `blog-${id}-${slug(link.split("/").filter(Boolean).pop() ?? title)}`, title, url: link, source: "blog" as const, sourceLabel: label, publishedAt, snippet: summary || undefined }];
    });
  }));

  const all = (await Promise.all([hn, lobsters, github, papers, ...blogs])).flat();
  const seen = new Map<string, RawItem>();
  for (const item of all) {
    let key: string;
    try { key = canonicalizeUrl(item.url); } catch { continue; }
    const existing = seen.get(key);
    if (!existing) { seen.set(key, item); continue; }
    existing.points = Math.max(existing.points ?? 0, item.points ?? 0) || undefined;
    existing.discussionUrl ??= item.discussionUrl;
    existing.snippet ??= item.snippet;
  }
  reports.sort((a, b) => a.id.localeCompare(b.id));
  return { items: [...seen.values()], reports };
}

export async function enrichSnippets(items: RawItem[], options: { fetcher?: Fetcher; concurrency?: number } = {}) {
  const fetcher = options.fetcher ?? safeFetch;
  const limit = createLimiter(options.concurrency ?? 8);
  await Promise.all(items.map((item) => limit(async () => {
    if ((item.snippet?.length ?? 0) >= 400 || item.source === "github" || item.source === "papers") return;
    try {
      const response = await fetcher(item.url, { signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "DevPulse/3.0 (+https://devpulse.tatsatpandey.com)", Accept: "text/html" } });
      if (!response.ok || !(response.headers.get("content-type") ?? "").includes("html")) { await response.body?.cancel(); return; }
      const body = htmlToText(await readBoundedText(response, 1_500_000));
      if (body.length > 200) item.snippet = body.slice(0, 1500);
    } catch { /* keep title-only candidate */ }
  })));
  return items;
}
