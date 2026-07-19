const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "metadata.google.internal",
  "::1",
  "[::1]",
]);

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".localhost")) return true;
  const bare = host.replace(/^\[/, "").replace(/\]$/, "");
  if (bare.includes(":")) {
    if (bare === "::" || bare === "::1") return true;
    if (bare.startsWith("fc") || bare.startsWith("fd")) return true;
    if (bare.startsWith("fe80")) return true;
    if (bare.startsWith("::ffff:")) {
      // IPv4-mapped IPv6 — URL parsers normalize to hex form (::ffff:7f00:1),
      // so handle both dotted-quad and hex tails.
      const tail = bare.slice(7);
      if (tail.includes(".")) return isPrivateIPv4(tail);
      const parts = tail.split(":");
      let hi = 0;
      let lo = NaN;
      if (parts.length === 1) {
        lo = parseInt(parts[0], 16);
      } else if (parts.length === 2) {
        hi = parseInt(parts[0], 16);
        lo = parseInt(parts[1], 16);
      }
      if (Number.isFinite(hi) && Number.isFinite(lo)) {
        return isPrivateIPv4(`${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`);
      }
      return true; // unparseable mapped address — block to be safe
    }
    return false;
  }
  return isPrivateIPv4(bare);
}

/**
 * fetch() wrapper with SSRF protection: blocks non-http(s) protocols and
 * private/loopback/metadata hosts. Applies a default timeout + User-Agent.
 */
export async function safeFetch(
  url: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Blocked URL: invalid URL "${url}"`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Blocked URL: protocol "${parsed.protocol}" not allowed (${url})`);
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new Error(`Blocked URL: ${url}`);
  }

  const { timeoutMs, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", "ai-pulse/1.0");
  }

  return fetch(url, {
    ...rest,
    headers,
    signal: rest.signal ?? AbortSignal.timeout(timeoutMs ?? 10_000),
  });
}

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "ref",
  "ref_src",
  "mc_cid",
  "mc_eid",
]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "\u2013", mdash: "\u2014", hellip: "\u2026",
  lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201C", rdquo: "\u201D",
  copy: "\u00A9", trade: "\u2122", reg: "\u00AE", deg: "\u00B0",
};

function fromCodePointSafe(cp: number): string {
  try {
    // Reject control chars and invalid code points
    if (!Number.isFinite(cp) || cp < 32 || cp > 0x10ffff) return "";
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

/**
 * Decode HTML entities in feed text: numeric decimal (&#8217;),
 * numeric hex (&#x2019;), and common named entities (&amp;, &rsquo;, ...).
 */
export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => fromCodePointSafe(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => fromCodePointSafe(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

/**
 * Canonicalize a URL for dedup: lowercase protocol/host, strip hash,
 * tracking params, and trailing slash. Returns input unchanged on parse failure.
 */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    const toDelete: string[] = [];
    u.searchParams.forEach((_value, key) => {
      const k = key.toLowerCase();
      if (k.startsWith("utm_") || TRACKING_PARAMS.has(k)) toDelete.push(key);
    });
    for (const key of toDelete) u.searchParams.delete(key);
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    }
    return u.toString();
  } catch {
    return url;
  }
}
