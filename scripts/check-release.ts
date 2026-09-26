import { readdir, readFile } from "node:fs/promises";
import { digestSchema, type Digest } from "../src/lib/digest";

export async function loadLatestApproved(directory = "data/digests"): Promise<Digest> {
  const files = (await readdir(directory).catch(() => [])).filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
  if (!files.length) throw new Error("No digest exists; refusing production deployment");
  return digestSchema.parse(JSON.parse(await readFile(`${directory}/${files.at(-1)}`, "utf8")));
}

if (import.meta.main) {
  const digest = await loadLatestApproved();
  console.log(`Release ready: ${digest.date} (${digest.items.length} stories)`);
}
