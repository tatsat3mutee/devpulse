import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { evidenceIndex } from "../lib/serialize";

export const GET: APIRoute = async ({ site }) => {
  const editions = (await getCollection("editions")).map((edition) => edition.data);
  const origin = site?.origin ?? "https://devpulse.tatsatpandey.com";
  const text = evidenceIndex(editions, origin);
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
