import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// Refreshed hourly by scripts/security-watch.ts; every field is the source's own.
const kevSchema = z.object({
  cve: z.string().regex(/^CVE-\d{4}-\d{4,7}$/),
  vendor: z.string().max(80),
  product: z.string().max(80),
  name: z.string().max(160),
  dateAdded: z.iso.date(),
  dueDate: z.iso.date().optional(),
  ransomware: z.boolean(),
  url: z.url().startsWith("https://nvd.nist.gov/vuln/detail/"),
});
const advisorySchema = z.object({
  id: z.string().regex(/^GHSA(-[23456789cfghjmpqrvwx]{4}){3}$/),
  cve: z.string().regex(/^CVE-\d{4}-\d{4,7}$/).optional(),
  summary: z.string().min(1).max(200),
  ecosystem: z.string().max(20),
  packageName: z.string().min(1).max(100),
  publishedAt: z.iso.datetime(),
  url: z.url().startsWith("https://github.com/advisories/GHSA-"),
});
export const securityWatchSchema = z.object({ updatedAt: z.iso.datetime(), kev: z.array(kevSchema), advisories: z.array(advisorySchema) });

export type KevEntry = z.infer<typeof kevSchema>;
export type Advisory = z.infer<typeof advisorySchema>;
export type SecurityWatch = z.infer<typeof securityWatchSchema>;

export const SECURITY_WATCH_PATH = join("data", "security-watch.json");

export function loadSecurityWatch(path = SECURITY_WATCH_PATH): SecurityWatch | undefined {
  if (!existsSync(path)) return undefined;
  return securityWatchSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

const ECOSYSTEMS: Record<string, string> = { npm: "npm", pip: "PyPI", go: "Go", maven: "Maven", rust: "crates.io", nuget: "NuGet", rubygems: "RubyGems", composer: "Packagist", pub: "Pub", swift: "Swift", erlang: "Hex", actions: "GitHub Actions" };
export const ecosystemLabel = (ecosystem: string) => ECOSYSTEMS[ecosystem] ?? ecosystem;

/** What the homepage strip shows: the last week of actively exploited CVEs and critical advisories. */
export function recentWatch(watch: SecurityWatch | undefined, now: Date, days = 7) {
  if (!watch) return { kev: [], advisories: [] };
  const since = now.getTime() - days * 86_400_000;
  return {
    kev: watch.kev.filter((entry) => Date.parse(entry.dateAdded) >= since),
    advisories: watch.advisories.filter((entry) => Date.parse(entry.publishedAt) >= since),
  };
}
