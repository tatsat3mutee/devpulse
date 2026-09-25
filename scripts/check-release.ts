import { readdir, readFile } from "node:fs/promises";
import { editionSchema, isPublicEdition, type Edition } from "../src/lib/schema";

export function latestApproved(editions: Edition[]): Edition {
  const approved = editions.filter(isPublicEdition).sort((a, b) => b.date.localeCompare(a.date));
  if (!approved.length) throw new Error("No human-reviewed edition exists; refusing production deployment");
  return approved[0];
}

export async function loadLatestApproved(): Promise<Edition> {
  const files = (await readdir("data/editions")).filter((filename) => filename.endsWith(".json"));
  const editions = await Promise.all(files.map(async (filename) => editionSchema.parse(JSON.parse(await readFile(`data/editions/${filename}`, "utf8")))));
  return latestApproved(editions);
}

if (import.meta.main) {
  const edition = await loadLatestApproved();
  console.log(`Release ready: ${edition.date} (${1 + edition.stories.length} reviewed stories)`);
}
