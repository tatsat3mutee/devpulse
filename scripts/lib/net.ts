import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";

const trackingParams = new Set(["fbclid", "gclid", "ref", "ref_src", "mc_cid", "mc_eid"]);
const stop = new Set(["the", "and", "for", "with", "from", "that", "this", "into", "your", "new", "how", "why", "are"]);

export function canonicalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || trackingParams.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

function tokens(title: string): Set<string> {
  return new Set(title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !stop.has(word)));
}

export function titleSimilarity(left: string, right: string): number {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap++;
  return overlap / (a.size + b.size - overlap);
}

export function validateDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Date must be YYYY-MM-DD");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error("Date is not a calendar date");
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

export function isPrivateAddress(address: string): boolean {
  return !ipaddr.isValid(address) || ipaddr.parse(address).range() !== "unicast";
}

async function assertPublicUrl(value: string): Promise<URL> {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(`Unsupported protocol: ${url.protocol}`);
  if (url.username || url.password) throw new Error("Credentialed URL blocked");
  if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) throw new Error("Private host blocked");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error(`Private address blocked: ${url.hostname}`);
  return url;
}

export async function safeFetch(urlValue: string, init: RequestInit = {}, redirects = 0): Promise<Response> {
  if (redirects > 3) throw new Error("Too many redirects");
  const url = await assertPublicUrl(urlValue);
  const headers = new Headers(init.headers);
  if (!headers.has("User-Agent")) headers.set("User-Agent", "DevPulse/3.0 (+https://devpulse.tatsatpandey.com)");
  if (!headers.has("Accept")) headers.set("Accept", "text/html,application/json");
  const response = await fetch(url, { ...init, redirect: "manual", headers, signal: init.signal ?? AbortSignal.timeout(15_000) });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new Error(`Redirect without location: ${url}`);
    const next = new URL(location, url);
    if (url.protocol === "https:" && next.protocol !== "https:") throw new Error("Insecure redirect blocked");
    if (next.origin !== url.origin) {
      for (const key of [...headers.keys()]) if (!["accept", "user-agent"].includes(key)) headers.delete(key);
      if (init.body || (init.method && init.method !== "GET" && init.method !== "HEAD")) throw new Error("Cross-origin request body blocked");
    }
    return safeFetch(next.toString(), { ...init, headers }, redirects + 1);
  }
  return response;
}

export async function readBoundedText(response: Response, limit: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return text + decoder.decode();
      size += chunk.value.byteLength;
      if (size > limit) throw new Error("Response exceeds byte limit");
      text += decoder.decode(chunk.value, { stream: true });
    }
  } finally { await reader.cancel(); }
}

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function htmlToText(html: string): string {
  const primaryRegion = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    ?? html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    ?? html;
  return primaryRegion
    .replace(/<(nav|aside|header|footer|form)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(script|style|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => { const code = parseInt(value, 16); return code <= 0x10ffff ? String.fromCodePoint(code) : " "; })
    .replace(/&#(\d+);/g, (_, value) => { const code = Number(value); return code <= 0x10ffff ? String.fromCodePoint(code) : " "; })
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match)
    .replace(/\s+/g, " ")
    .trim();
}
