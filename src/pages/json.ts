import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { isPublicEdition } from "../lib/schema";

export const GET: APIRoute = async () => {
  const editions = (await getCollection("editions")).filter((edition) => isPublicEdition(edition.data)).sort((a, b) => b.data.date.localeCompare(a.data.date));
  return new Response(JSON.stringify(editions[0]?.data ?? null, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
};
