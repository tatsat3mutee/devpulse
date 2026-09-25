import { link, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { editionSchema } from "../src/lib/schema";
import { fetchEvidence, verifyStory, type Candidate } from "./lib/pipeline";

export async function publishEdition(date: string, root = "data", fetcher = fetchEvidence) {
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Usage: bun run edition:publish YYYY-MM-DD");
const draftPath = join(root, "review", `${date}.json`);
const targetPath = join(root, "editions", `${date}.json`);
const edition = editionSchema.parse(JSON.parse(await readFile(draftPath, "utf8")));
if (edition.date !== date) throw new Error("Draft date differs from requested publication date");
if (edition.status !== "draft") throw new Error("Only a draft edition can be published");
if (![edition.lead, ...edition.stories].every((story) => story.provenance.humanReviewed)) {
	throw new Error("Every story must be marked humanReviewed by the editor before publication");
}

for (const story of [edition.lead, ...edition.stories]) {
	const candidate: Candidate = {
		id: story.id,
		source: story.primarySource.type === "release-notes" ? "github-release" : "hn",
		title: story.originalTitle,
		url: story.primarySource.url,
		publishedAt: story.primarySource.publishedAt ? `${story.primarySource.publishedAt}T00:00:00.000Z` : edition.publishedAt,
		metrics: {},
	};
	const fetched = await fetcher(candidate);
	const failures = verifyStory(story, fetched.evidence ?? "");
	if (failures.length) {
		throw new Error(`Refusing to publish ${story.id}: ${failures.join("; ")}`);
	}
}

edition.status = "published";
edition.publishedAt = new Date().toISOString();
const published = editionSchema.parse(edition);
await mkdir(join(root, "editions"), { recursive: true });
const temporaryPath = `${targetPath}.${randomUUID()}.tmp`;
try {
  await writeFile(temporaryPath, `${JSON.stringify(published, null, 2)}\n`, { flag: "wx" });
  await link(temporaryPath, targetPath);
} finally {
  await rm(temporaryPath, { force: true });
}
await rm(draftPath);
return targetPath;
}

if (import.meta.main) {
  console.log(`Published reviewed edition to ${await publishEdition(process.argv[2] ?? "")}`);
}
