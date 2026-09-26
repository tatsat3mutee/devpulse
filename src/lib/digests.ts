import { getCollection } from "astro:content";
import type { Digest } from "./digest";

export async function allDigests(): Promise<Digest[]> {
  return (await getCollection("digests")).map((entry) => entry.data).sort((a, b) => b.date.localeCompare(a.date));
}

export async function latestDigest(): Promise<Digest | undefined> {
  return (await allDigests())[0];
}

/** Neighbouring editions and the running issue number, counted from the first edition. */
export function editionContext(digests: Digest[], date: string) {
  const index = digests.findIndex((digest) => digest.date === date);
  return { prev: digests[index + 1]?.date, next: index > 0 ? digests[index - 1].date : undefined, issue: digests.length - index };
}
