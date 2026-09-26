import type { APIRoute } from "astro";
import { latestDigest } from "../lib/digests";

export const GET: APIRoute = async () => {
  const digest = await latestDigest();
  return new Response(JSON.stringify(digest ? { date: digest.date, publishedAt: digest.generatedAt, status: "published", storyCount: digest.items.length } : null), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" },
  });
};
