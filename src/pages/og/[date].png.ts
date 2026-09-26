import type { APIRoute } from "astro";
import sharp from "sharp";
import { allDigests } from "../../lib/digests";
import { editionCardSvg } from "../../lib/og";
import type { Digest } from "../../lib/digest";

export async function getStaticPaths() {
  return (await allDigests()).map((digest) => ({ params: { date: digest.date }, props: { digest } }));
}

export const GET: APIRoute = async ({ props }) => {
  const png = await sharp(Buffer.from(editionCardSvg((props as { digest: Digest }).digest))).png({ compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
