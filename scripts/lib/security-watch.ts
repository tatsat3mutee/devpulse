// Security Watch: vulnerabilities attackers are using now (CISA KEV) and critical package advisories (GitHub).
// Every field comes from the source; nothing here is written by a model.
import { readBoundedText, safeFetch } from "./net";
import type { SecurityWatch, KevEntry, Advisory } from "../../src/lib/security";

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export const KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
export const ADVISORIES_URL = "https://api.github.com/advisories?type=reviewed&severity=critical&per_page=50";
const DAY = 86_400_000;
const CVE = /^CVE-\d{4}-\d{4,7}$/;
const clip = (value: unknown, max: number) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
const isoDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) && Number.isFinite(Date.parse(value)) ? value.slice(0, 10) : undefined;

/** KEV entries added in the last `days` days, newest first. */
export function parseKev(json: unknown, now: Date, days = 30): KevEntry[] {
  const rows = (json as { vulnerabilities?: unknown[] })?.vulnerabilities;
  if (!Array.isArray(rows)) throw new Error("KEV feed has no vulnerabilities list");
  const since = now.getTime() - days * DAY;
  return rows.flatMap((row) => {
    const r = row as Record<string, unknown>;
    const cve = typeof r.cveID === "string" ? r.cveID.trim() : "";
    const dateAdded = isoDate(r.dateAdded);
    if (!CVE.test(cve) || !dateAdded || Date.parse(dateAdded) < since || Date.parse(dateAdded) > now.getTime() + DAY) return [];
    return [{
      cve,
      vendor: clip(r.vendorProject, 80),
      product: clip(r.product, 80),
      name: clip(r.vulnerabilityName, 160),
      dateAdded,
      dueDate: isoDate(r.dueDate),
      ransomware: String(r.knownRansomwareCampaignUse).toLowerCase() === "known",
      url: `https://nvd.nist.gov/vuln/detail/${cve}`,
    }];
  }).sort((a, b) => b.dateAdded.localeCompare(a.dateAdded) || b.cve.localeCompare(a.cve)).slice(0, 40);
}

/** Reviewed critical advisories published in the last `days` days, newest first. */
export function parseAdvisories(json: unknown, now: Date, days = 7): Advisory[] {
  if (!Array.isArray(json)) throw new Error("Advisory feed is not a list");
  const since = now.getTime() - days * DAY;
  return json.flatMap((row) => {
    const r = row as Record<string, unknown>;
    const id = typeof r.ghsa_id === "string" ? r.ghsa_id : "";
    const url = typeof r.html_url === "string" ? r.html_url : "";
    const publishedAt = typeof r.published_at === "string" ? r.published_at : "";
    const published = Date.parse(publishedAt);
    if (!/^GHSA(-[23456789cfghjmpqrvwx]{4}){3}$/.test(id) || url !== `https://github.com/advisories/${id}` || !Number.isFinite(published) || published < since || published > now.getTime() + DAY) return [];
    const vulnerable = Array.isArray(r.vulnerabilities) ? r.vulnerabilities as Array<{ package?: { ecosystem?: unknown; name?: unknown } }> : [];
    const pkg = vulnerable.find((v) => typeof v.package?.name === "string")?.package;
    const cve = typeof r.cve_id === "string" && CVE.test(r.cve_id) ? r.cve_id : undefined;
    return [{ id, cve, summary: clip(r.summary, 200), ecosystem: clip(pkg?.ecosystem, 20), packageName: clip(pkg?.name, 100), publishedAt: new Date(published).toISOString(), url }];
  }).filter((a) => a.summary && a.packageName).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 30);
}

/** The watch's content without its timestamp, so an unchanged check writes nothing. */
export const watchKey = (watch: Pick<SecurityWatch, "kev" | "advisories">) => JSON.stringify([watch.kev, watch.advisories]);

/**
 * Fetches both sources. A source that fails keeps its previous entries (re-filtered by age), so one outage
 * never empties the section; the run reports which sources failed.
 */
export async function refreshSecurityWatch(previous: SecurityWatch | undefined, options: { now?: Date; fetcher?: Fetcher; githubToken?: string } = {}) {
  const now = options.now ?? new Date();
  const fetcher = options.fetcher ?? safeFetch;
  const getJson = async (url: string, headers: HeadersInit = {}) => {
    const response = await fetcher(url, { headers: { "User-Agent": "Diffbrief/3.0 (+https://diffbrief.tatsatpandey.com)", Accept: "application/json", ...headers }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return JSON.parse(await readBoundedText(response, 8_000_000)) as unknown;
  };
  const failures: string[] = [];
  const keepRecent = <T extends { dateAdded?: string; publishedAt?: string }>(rows: T[], days: number) =>
    rows.filter((row) => Date.parse(row.dateAdded ?? row.publishedAt ?? "") >= now.getTime() - days * DAY);
  let kev: KevEntry[];
  try { kev = parseKev(await getJson(KEV_URL), now); } catch (error) { failures.push(`kev: ${(error as Error).message}`); kev = keepRecent(previous?.kev ?? [], 30); }
  let advisories: Advisory[];
  try {
    advisories = parseAdvisories(await getJson(ADVISORIES_URL, {
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.githubToken ? { Authorization: `Bearer ${options.githubToken}` } : {}),
    }), now);
  } catch (error) { failures.push(`advisories: ${(error as Error).message}`); advisories = keepRecent(previous?.advisories ?? [], 7); }
  const changed = !previous || watchKey(previous) !== watchKey({ kev, advisories });
  const watch: SecurityWatch = { updatedAt: changed || !previous ? now.toISOString() : previous.updatedAt, kev, advisories };
  return { watch, changed, failures };
}
