import { getCollection } from "astro:content";
import type { Digest } from "./digest";

export async function allDigests(): Promise<Digest[]> {
  return (await getCollection("digests")).map((entry) => entry.data).sort((a, b) => b.date.localeCompare(a.date));
}

export async function latestDigest(): Promise<Digest | undefined> {
  return (await allDigests())[0];
}