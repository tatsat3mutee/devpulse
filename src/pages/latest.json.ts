import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { isPublicEdition } from "../lib/schema";

export const GET: APIRoute = async () => {
  const editions = (await getCollection("editions")).filter((edition) => isPublicEdition(edition.data)).sort((a, b) => b.data.date.localeCompare(a.data.date));
  const latest = editions[0]?.data;
  return new Response(JSON.stringify(latest ? { date: latest.date, publishedAt: latest.publishedAt, status: latest.status, storyCount: 1 + latest.stories.length } : null), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" },
  });
};
