import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { collectAll, enrichSnippets, type SourceReport } from "./lib/collect";
import { openRouterJudge, scoreItems, selectItems } from "./lib/score";
import { validateDate } from "./lib/net";
import { digestSchema, type DigestItem } from "../src/lib/digest";

async function write(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

const date = validateDate(process.env.EDITION_DATE ?? new Date().toISOString().slice(0, 10));
const dryRun = process.argv.includes("--dry-run");
const reselect = process.argv.includes("--reselect");
const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.EDITORIAL_MODEL || "openai/gpt-6-luna";
if (!dryRun && !reselect && !apiKey) throw new Error("OPENROUTER_API_KEY is required; use --dry-run to collect only");
const runDir = join("data", "collection", date);

if (reselect) {
  const { judged, reports, candidateCount } = JSON.parse(await readFile(join(runDir, "judged.json"), "utf8"));
  await publish(judged, reports, candidateCount);
  process.exit(0);
}

async function publish(judged: DigestItem[], reports: SourceReport[], candidateCount: number) {
  const picked = selectItems(judged.map((item) => ({ ...item, mustRead: false })));
  const digest = digestSchema.parse({
    date,
    generatedAt: new Date().toISOString(),
    model,
    candidateCount,
    items: picked,
    sources: reports.map(({ id, label, status, count }) => ({ id, label, status, count })),
  });
  await write(join("data", "digests", `${date}.json`), digest);
  console.log(`Published ${digest.items.length} of ${judged.length} judged items to data/digests/${date}.json`);
}

const { items, reports } = await collectAll({ githubToken: process.env.GITHUB_TOKEN });
for (const report of reports) console.log(`${report.id}: ${report.status} ${report.count}${report.error ? ` (${report.error})` : ""}`);
const hnScore = (item: { points?: number; stars?: number }) => (item.points ?? 0) + (item.stars ?? 0) / 10;
const alwaysScored = items.filter((item) => item.source !== "hn");
const hnBudget = Math.max(120, 320 - alwaysScored.length);
const ranked = [...alwaysScored.slice(0, 200), ...items.filter((item) => item.source === "hn").sort((a, b) => hnScore(b) - hnScore(a)).slice(0, hnBudget)];
console.log(`Collected ${items.length} unique candidates; scoring ${ranked.length}`);
await write(join(runDir, "candidates.json"), ranked);
if (dryRun) process.exit(0);

await enrichSnippets(ranked);
const { judged, failures } = await scoreItems(ranked, openRouterJudge(apiKey!, model));
for (const failure of failures) console.warn(`Scoring ${failure}`);
await write(join(runDir, "judged.json"), { judged, reports, candidateCount: ranked.length });
await publish(judged, reports, ranked.length);
