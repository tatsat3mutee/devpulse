import { readFile } from "node:fs/promises";
import { editionSchema } from "../src/lib/schema";
import { fetchEvidence, verifyQuote, type Candidate } from "./lib/pipeline";

const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const edition = editionSchema.parse(JSON.parse(await readFile(`data/editions/${date}.json`, "utf8")));
let failures = 0;

for (const story of [edition.lead, ...edition.stories]) {
  try {
    const candidate: Candidate = {
      id: story.id,
      source: story.primarySource.type === "release-notes" ? "github-release" : "hn",
      title: story.originalTitle,
      url: story.primarySource.url,
      publishedAt: story.primarySource.publishedAt ? `${story.primarySource.publishedAt}T00:00:00.000Z` : edition.publishedAt,
      metrics: {},
    };
    const fetched = await fetchEvidence(candidate);
    const results = story.claims.map((claim) => verifyQuote(claim.quote, fetched.evidence ?? ""));
    if (results.some((result) => !result)) failures++;
    console.log(`${results.every(Boolean) ? "PASS" : "FAIL"} ${story.id} [${results.map((result) => result ? "match" : "missing").join(", ")}]`);
    if (results.some((result) => !result)) {
      const evidence = fetched.evidence ?? "";
      const keyword = story.claims[0].quote
        .split(/\s+/)
        .map((word) => word.replace(/[^a-z0-9-]/gi, ""))
        .filter((word) => word.length >= 7 && evidence.toLowerCase().includes(word.toLowerCase()))
        .sort((left, right) => evidence.toLowerCase().split(left.toLowerCase()).length - evidence.toLowerCase().split(right.toLowerCase()).length)[0];
      const offset = keyword ? evidence.toLowerCase().indexOf(keyword.toLowerCase()) : 0;
      console.log(`  evidence(${evidence.length}): ${evidence.slice(Math.max(0, offset - 160), offset + 560)}`);
    }
  } catch (error) {
    failures++;
    console.log(`BLOCKED ${story.id}: ${error instanceof Error ? error.message : error}`);
  }
}

if (failures) throw new Error(`${failures} stories failed the live evidence audit`);