import type { APIRoute } from "astro";
import { latestDigest } from "../lib/digests";

export const GET: APIRoute = async () => new Response(JSON.stringify((await latestDigest()) ?? null, null, 2), {
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" },
});
