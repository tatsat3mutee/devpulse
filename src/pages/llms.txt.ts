import type { APIRoute } from "astro";
import { allDigests } from "../lib/digests";
import { llmsIndex } from "../lib/format";

export const GET: APIRoute = async ({ site }) => new Response(llmsIndex(await allDigests(), site?.origin ?? "https://devpulse.tatsatpandey.com"), {
  headers: { "Content-Type": "text/plain; charset=utf-8" },
});
