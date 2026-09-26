import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { collectAll, enrichSnippets, type SourceReport } from "./lib/collect";
import { saveCover } from "./lib/media";
import { coverTargets, excludePublished, openRouterJudge, openRouterLede, openRouterWriter, scoreItems, selectItems, writeBriefs, writeLede } from "./lib/score";
import { validateDate } from "./lib/net";
import { digestSchema, type Digest, type DigestItem } from "../src/lib/digest";

async function write(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

type Saved = { judged: DigestItem[]; reports: SourceReport[]; candidateCount: number; collectedCount?: number; excerpts?: Record<string, string>; media?: Record<string, string> };

const date = validateDate(process.env.EDITION_DATE ?? new Date().toISOString().slice(0, 10));
const dryRun = process.argv.includes("--dry-run");
const reselect = process.argv.includes("--reselect");
const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.EDITORIAL_MODEL || "openai/gpt-6-luna";
if (!dryRun && !reselect && !apiKey) throw new Error("OPENROUTER_API_KEY is required; use --dry-run to collect only");
const runDir = join("data", "collection", date);
const digestDir = join("data", "digests");

if (reselect) {
  await publish(JSON.parse(await readFile(join(runDir, "judged.json"), "utf8")) as Saved);
  process.exit(0);
}

async function recentDigests(days: number): Promise<Digest[]> {
  const files = (await readdir(digestDir).catch(() => [] as string[])).filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file) && file.slice(0, 10) < date).sort().slice(-days);
  return Promise.all(files.map(async (file) => digestSchema.parse(JSON.parse(await readFile(join(digestDir, file), "utf8")))));
}

async function publish({ judged, reports, candidateCount, collectedCount, excerpts = {}, media = {} }: Saved) {
  const picked = selectItems(judged.map(({ brief: _brief, diagram: _diagram, image: _image, ...item }) => ({ ...item, mustRead: false })));

  if (apiKey && !process.argv.includes("--no-briefs")) {
    const { failures } = await writeBriefs(picked, excerpts, openRouterWriter(apiKey, model));
    for (const failure of failures) console.warn(`Writing ${failure}`);
    console.log(`Briefs for ${picked.filter((item) => item.brief).length} stories, diagrams for ${picked.filter((item) => item.diagram).length}`);
  }
  let lede: Awaited<ReturnType<typeof writeLede>>["lede"];
  if (apiKey && !process.argv.includes("--no-briefs")) {
    const result = await writeLede(picked, openRouterLede(apiKey, model));
    lede = result.lede;
    console.log(result.failure ? `Writing ${result.failure}` : `Lede written${lede?.quiet ? " (quiet day)" : ""}`);
  }

  const coverDir = join("public", "covers", date);
  await rm(coverDir, { recursive: true, force: true });
  let bytes = 0;
  for (const item of coverTargets(picked)) {
    const source = media[item.id];
    if (!source) continue;
    try {
      bytes += await saveCover(source, join(coverDir, `${item.id}.webp`));
      item.image = `/covers/${date}/${item.id}.webp`;
    } catch (error) {
      console.warn(`Cover for ${item.id}: ${(error as Error).message.slice(0, 120)}`);
    }
  }
  console.log(`Covers: ${picked.filter((item) => item.image).length} saved (${Math.round(bytes / 1024)} KB)`);

  const digest = digestSchema.parse({
    date,
    generatedAt: new Date().toISOString(),
    model,
    candidateCount,
    collectedCount,
    lede,
    items: picked,
    sources: reports.map(({ id, label, status, count }) => ({ id, label, status, count })),
  });
  await write(join(digestDir, `${date}.json`), digest);
  console.log(`Published ${digest.items.length} of ${judged.length} judged items to data/digests/${date}.json`);
}

const { items, reports } = await collectAll({ githubToken: process.env.GITHUB_TOKEN });
for (const report of reports) console.log(`${report.id}: ${report.status} ${report.count}${report.error ? ` (${report.error})` : ""}`);
const fresh = excludePublished(items, await recentDigests(7));
console.log(`Collected ${items.length} unique candidates; ${items.length - fresh.length} already published this week`);
const hnScore = (item: { points?: number; stars?: number }) => (item.points ?? 0) + (item.stars ?? 0) / 10;
const alwaysScored = fresh.filter((item) => item.source !== "hn");
const hnBudget = Math.max(120, 320 - alwaysScored.length);
const ranked = [...alwaysScored.slice(0, 200), ...fresh.filter((item) => item.source === "hn").sort((a, b) => hnScore(b) - hnScore(a)).slice(0, hnBudget)];
console.log(`Scoring ${ranked.length}`);
await write(join(runDir, "candidates.json"), ranked);
if (dryRun) process.exit(0);

await enrichSnippets(ranked);
const { judged, failures } = await scoreItems(ranked, openRouterJudge(apiKey!, model));
for (const failure of failures) console.warn(`Scoring ${failure}`);
const excerpts = Object.fromEntries(ranked.flatMap((item) => (item.excerpt ?? item.snippet) ? [[item.id, (item.excerpt ?? item.snippet)!.slice(0, 4000)]] : []));
const media = Object.fromEntries(ranked.flatMap((item) => item.imageUrl ? [[item.id, item.imageUrl]] : []));
const saved: Saved = { judged, reports, candidateCount: ranked.length, collectedCount: items.length, excerpts, media };
await write(join(runDir, "judged.json"), saved);
await publish(saved);
