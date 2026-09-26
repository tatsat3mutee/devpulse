import type { APIRoute } from "astro";
import { allDigests } from "../../lib/digests";
import { digestMarkdown } from "../../lib/format";
import type { Digest } from "../../lib/digest";

export async function getStaticPaths() {
  return (await allDigests()).map((digest) => ({ params: { date: digest.date }, props: { digest } }));
}

export const GET: APIRoute = ({ props }) => new Response(digestMarkdown((props as { digest: Digest }).digest), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
