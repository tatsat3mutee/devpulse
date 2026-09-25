import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { clusterCandidates, draftStory, fetchEvidence, type Candidate } from "./lib/pipeline";
import { collectSources, validateEditionDate } from "./lib/sources";
import { editionSchema } from "../src/lib/schema";

async function writeArtifact(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function preparationOptions(args: string[], env: Record<string, string | undefined>) {
  const allowed = new Set(["--dry-run", "--collect-only", "--no-model", "--official-only"]);
  if (args.some((argument) => !allowed.has(argument))) throw new Error("Unknown preparation argument");
  if (env.COLLECT_ONLY !== undefined && !["true", "false"].includes(env.COLLECT_ONLY)) throw new Error("COLLECT_ONLY must be true or false");
  return {
    date: validateEditionDate(env.EDITION_DATE ?? new Date().toISOString().slice(0, 10)),
    collectOnly: env.COLLECT_ONLY === "true" || args.some((argument) => ["--dry-run", "--collect-only", "--no-model"].includes(argument)),
    includeSignals: !args.includes("--official-only"),
    apiKey: env.OPENROUTER_API_KEY,
    model: env.EDITORIAL_MODEL ?? "google/gemini-2.5-flash",
    githubToken: env.GITHUB_TOKEN,
  };
}

export async function prepareEdition(
  options: ReturnType<typeof preparationOptions>,
  dependencies = { collect: collectSources, write: writeArtifact, evidence: fetchEvidence, draft: draftStory },
) {
  const date = validateEditionDate(options.date);
  if (!options.collectOnly && !options.apiKey) throw new Error("OPENROUTER_API_KEY is required for drafting; use --dry-run for no-model collection");
  const collected = await dependencies.collect({ date, githubToken: options.githubToken, includeSignals: options.includeSignals });
  const outputDirectory = join("data", "collection", date);
  const manifest = {
    ...collected.manifest,
    mode: options.collectOnly ? "collect-only" : "draft",
    phase: collected.candidates.length ? "collected" : "failed",
    draftedCount: 0,
    evidenceRejected: [] as string[],
    draftRejected: [] as string[],
    excluded: [] as { id: string; reason: string }[],
  };
  await dependencies.write(join(outputDirectory, "candidates.json"), collected.candidates);
  await dependencies.write(join(outputDirectory, "run.json"), manifest);
  for (const source of manifest.sources) console.log(`${source.id}: ${source.status}; accepted=${source.accepted}; rejected=${source.rejected}; failures=${source.errors.length}`);
  if (!collected.candidates.length) throw new Error("No eligible candidates collected; inspect the collection run manifest");
  if (options.collectOnly) {
    console.log(`Collected ${collected.candidates.length} candidates at ${outputDirectory}; no model or evidence calls; no review draft written`);
    return manifest;
  }

  const pipelineCandidates: Candidate[] = collected.candidates;
  try {
    const evidenced: Candidate[] = [];
    for (const candidate of clusterCandidates(pipelineCandidates).slice(0, 16)) {
      try { evidenced.push(await dependencies.evidence(candidate)); }
      catch (error) { manifest.evidenceRejected.push(`${candidate.id}: ${String((error as Error).message).slice(0, 200)}`); }
    }
    const drafted = [];
    for (const candidate of evidenced) {
      if (drafted.length >= 6) break;
      try { drafted.push(await dependencies.draft(candidate, options.apiKey!, options.model)); }
      catch (error) { manifest.draftRejected.push(`${candidate.id}: ${String((error as Error).message).slice(0, 300)}`); }
    }
    manifest.draftedCount = drafted.length;
    if (drafted.length < 3) throw new Error(`Only ${drafted.length} stories passed verification; refusing to create an edition`);
    const edition = editionSchema.parse({
      date,
      publishedAt: new Date().toISOString(),
      status: "draft",
      readMinutes: Math.min(10, drafted.length + 1),
      title: drafted[0].title,
      dek: `${drafted.length} evidence-backed changes shortlisted for human review. Inspect every receipt and status before publishing.`,
      lead: drafted[0],
      stories: drafted.slice(1),
      oneLiners: [],
      methodologyNote: "Generated from a deterministic shortlist. Every quote passed exact-source verification; no story is published until a human approves the review pull request.",
    });
    const output = join("data", "review", `${date}.json`);
    await dependencies.write(output, edition);
    manifest.phase = "drafted";
    console.log(`Prepared ${drafted.length} verified stories at ${output}`);
    return manifest;
  } catch (error) {
    manifest.phase = "failed";
    throw error;
  } finally { await dependencies.write(join(outputDirectory, "run.json"), manifest); }
}

if (import.meta.main) await prepareEdition(preparationOptions(process.argv.slice(2), process.env));
