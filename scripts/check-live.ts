import { loadLatestApproved } from "./check-release";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function probeSite(siteUrl: string, expectedDate: string, fetcher: typeof fetch = fetch, now = new Date(), expectedSha?: string): Promise<void> {
  const base = new URL(siteUrl);
  if (base.protocol !== "https:" || base.username || base.password || base.pathname !== "/" || base.search || base.hash) {
    throw new Error("Production probe requires a credential-free HTTPS origin");
  }
  const timestamp = Date.parse(`${expectedDate}T00:00:00.000Z`);
  const ageDays = (now.getTime() - timestamp) / 86_400_000;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDate) || !Number.isFinite(ageDays) || ageDays > 4 || ageDays < 0 || new Date(timestamp).toISOString().slice(0, 10) !== expectedDate) {
    throw new Error(`Edition ${expectedDate} is stale or invalid`);
  }
  if (expectedSha !== undefined && !/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error("Expected a 40-character release SHA");
  const read = async (path: string, contentTypes: string[]) => {
    const url = new URL(path, base);
    const response = await fetcher(url, { signal: AbortSignal.timeout(10_000), cache: "no-store", redirect: "error" });
    if (response.status !== 200 || response.redirected || (response.url && response.url !== url.href)) {
      throw new Error(`${path} returned HTTP ${response.status} or an unexpected redirect`);
    }
    const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (!contentType || !contentTypes.includes(contentType)) throw new Error(`${path} has an unexpected Content-Type`);
    return response.text();
  };
  const [home, latestText, rss, edition, releaseSha] = await Promise.all([
    read("/", ["text/html"]),
    read("/latest.json", ["application/json"]),
    read("/rss.xml", ["application/rss+xml", "application/xml", "text/xml"]),
    read(`/edition/${expectedDate}/`, ["text/html"]),
    expectedSha === undefined ? undefined : read("/release-sha.txt", ["text/plain"]),
  ]);
  const latest = JSON.parse(latestText) as { date?: string; status?: string; storyCount?: number } | null;
  if (latest?.date !== expectedDate || !["published", "corrected"].includes(latest.status ?? "") || !Number.isInteger(latest.storyCount) || latest.storyCount! < 3 || latest.storyCount! > 7) {
    throw new Error("Wrong or unapproved live edition");
  }
  if ([home, edition].some((html) => !/<html[\s>]/i.test(html) || !/<title[^>]*>[^<]*DevPulse/i.test(html) || !html.includes(expectedDate))) {
    throw new Error("Homepage or edition HTML is missing the approved edition");
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(rss) || XMLValidator.validate(rss) !== true) throw new Error("Invalid RSS document");
  const feed = new XMLParser({ ignoreAttributes: false }).parse(rss) as {
    rss?: { "@_version"?: string; channel?: { item?: { link?: unknown } | Array<{ link?: unknown }> } };
  };
  const items = feed.rss?.channel?.item;
  const entries = Array.isArray(items) ? items : items ? [items] : [];
  const editionUrl = new URL(`/edition/${expectedDate}`, base).href;
  if (feed.rss?.["@_version"] !== "2.0" || !entries.some((item) => item.link === editionUrl || item.link === `${editionUrl}/`)) {
    throw new Error("RSS is missing an item for the approved edition on this origin");
  }
  if (expectedSha !== undefined && releaseSha !== `${expectedSha}\n`) {
    throw new Error("Live release SHA differs from the verified artifact");
  }
  console.log(`Healthy: ${base.origin} serves reviewed edition ${expectedDate}`);
}

export async function probeArtifact(directory: string, siteUrl: string, expectedDate: string, expectedSha: string, now = new Date()): Promise<void> {
  const fetcher = (async (input: RequestInfo | URL) => {
    const path = new URL(input.toString()).pathname;
    const filename = `${path.slice(1)}${path.endsWith("/") ? "index.html" : ""}`;
    const contentType = filename.endsWith(".html") ? "text/html" : filename.endsWith(".json") ? "application/json" : filename.endsWith(".xml") ? "application/xml" : "text/plain";
    return new Response(await readFile(resolve(directory, filename)), { headers: { "Content-Type": contentType } });
  }) as typeof fetch;
  await probeSite(siteUrl, expectedDate, fetcher, now, expectedSha);
}

if (import.meta.main) {
  const siteUrl = process.env.PUBLIC_SITE_URL;
  if (!siteUrl) throw new Error("PUBLIC_SITE_URL is required");
  const expectedSha = process.env.RELEASE_SHA;
  if (!expectedSha) throw new Error("RELEASE_SHA is required");
  const expectedDate = (await loadLatestApproved()).date;
  if (process.env.RELEASE_ARTIFACT_DIR) {
    await probeArtifact(process.env.RELEASE_ARTIFACT_DIR, siteUrl, expectedDate, expectedSha);
  } else {
    await probeSite(siteUrl, expectedDate, fetch, new Date(), expectedSha);
  }
}
