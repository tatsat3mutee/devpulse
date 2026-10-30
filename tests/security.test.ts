import { describe, expect, test } from "bun:test";
import { ADVISORIES_URL, KEV_URL, parseAdvisories, parseKev, refreshSecurityWatch } from "../scripts/lib/security-watch";
import { recentWatch, securityWatchSchema } from "../src/lib/security";

const now = new Date("2026-10-30T10:00:00Z");
const kev = {
  dateReleased: "2026-10-29T17:00:00Z",
  vulnerabilities: [
    { cveID: "CVE-2026-41234", vendorProject: "Citrix", product: "NetScaler ADC", vulnerabilityName: "Citrix NetScaler ADC Memory Overflow", dateAdded: "2026-10-29", dueDate: "2026-11-19", knownRansomwareCampaignUse: "Known" },
    { cveID: "CVE-2026-40001", vendorProject: "Apache", product: "Tomcat", vulnerabilityName: "Apache Tomcat Path Traversal", dateAdded: "2026-10-20", dueDate: "2026-11-10", knownRansomwareCampaignUse: "Unknown" },
    { cveID: "CVE-2021-44228", vendorProject: "Apache", product: "Log4j2", vulnerabilityName: "Log4Shell", dateAdded: "2021-12-10", dueDate: "2021-12-24", knownRansomwareCampaignUse: "Known" },
    { cveID: "not-a-cve", vendorProject: "X", product: "Y", vulnerabilityName: "bad", dateAdded: "2026-10-29" },
  ],
};
const advisory = (id: string, publishedAt: string, extra: Record<string, unknown> = {}) => ({
  ghsa_id: id, cve_id: "CVE-2026-50001", html_url: `https://github.com/advisories/${id}`, summary: "Remote code execution in package deserializer", severity: "critical",
  published_at: publishedAt, vulnerabilities: [{ package: { ecosystem: "npm", name: "fast-serializer" } }], ...extra,
});

describe("Security Watch parsing", () => {
  test("keeps the last 30 days of exploited CVEs from the source, newest first, and drops bad rows", () => {
    const rows = parseKev(kev, now);
    expect(rows.map((row) => row.cve)).toEqual(["CVE-2026-41234", "CVE-2026-40001"]);
    expect(rows[0]).toEqual({ cve: "CVE-2026-41234", vendor: "Citrix", product: "NetScaler ADC", name: "Citrix NetScaler ADC Memory Overflow", dateAdded: "2026-10-29", dueDate: "2026-11-19", ransomware: true, url: "https://nvd.nist.gov/vuln/detail/CVE-2026-41234" });
    expect(() => parseKev({}, now)).toThrow();
  });

  test("keeps a week of reviewed critical advisories and refuses links that are not the advisory's own page", () => {
    const rows = parseAdvisories([
      advisory("GHSA-abcd-2345-wxyz".replace(/[abdyz]/g, "c"), "2026-10-29T08:00:00Z"),
      advisory("GHSA-cccc-2222-3333", "2026-10-01T08:00:00Z"),
      advisory("GHSA-cccc-4444-5555", "2026-10-28T08:00:00Z", { html_url: "https://evil.example/advisories/GHSA-cccc-4444-5555" }),
      advisory("GHSA-cccc-6666-7777", "2026-10-28T08:00:00Z", { summary: "" }),
    ], now);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ecosystem: "npm", packageName: "fast-serializer", cve: "CVE-2026-50001", url: "https://github.com/advisories/GHSA-cccc-2345-wxcc" });
  });
});

describe("Security Watch refresh", () => {
  const fetcherFor = (kevBody: unknown, advisoryBody: unknown, fail: string[] = []) => async (url: string) => {
    const name = url === KEV_URL ? "kev" : url === ADVISORIES_URL ? "advisories" : "other";
    if (fail.includes(name)) return new Response("down", { status: 503 });
    return Response.json(name === "kev" ? kevBody : advisoryBody);
  };

  test("a first refresh writes a valid watch; an identical one reports no change", async () => {
    const fetcher = fetcherFor(kev, [advisory("GHSA-cccc-2345-wxcc", "2026-10-29T08:00:00Z")]);
    const first = await refreshSecurityWatch(undefined, { now, fetcher: fetcher as never });
    expect(first.changed).toBe(true);
    expect(securityWatchSchema.parse(first.watch).kev).toHaveLength(2);
    const later = new Date(now.getTime() + 3_600_000);
    const second = await refreshSecurityWatch(first.watch, { now: later, fetcher: fetcher as never });
    expect(second.changed).toBe(false);
    expect(second.watch.updatedAt).toBe(first.watch.updatedAt);
  });

  test("a failed source keeps its previous entries instead of emptying the section", async () => {
    const first = await refreshSecurityWatch(undefined, { now, fetcher: fetcherFor(kev, [advisory("GHSA-cccc-2345-wxcc", "2026-10-29T08:00:00Z")]) as never });
    const next = await refreshSecurityWatch(first.watch, { now, fetcher: fetcherFor(kev, [], ["advisories"]) as never });
    expect(next.failures).toEqual(["advisories: HTTP 503"]);
    expect(next.watch.advisories).toHaveLength(1);
    expect(next.changed).toBe(false);
  });

  test("the homepage strip shows only the last week", async () => {
    const { watch } = await refreshSecurityWatch(undefined, { now, fetcher: fetcherFor(kev, []) as never });
    expect(recentWatch(watch, now).kev.map((row) => row.cve)).toEqual(["CVE-2026-41234"]);
    expect(recentWatch(undefined, now)).toEqual({ kev: [], advisories: [] });
  });
});
