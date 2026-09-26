import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import sharp from "sharp";
import { readBoundedBytes, safeFetch } from "./net";

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

const decode = (value: string) => value.replace(/&amp;/g, "&").replace(/&#x2F;/gi, "/").replace(/&#47;/g, "/").replace(/&quot;/g, '"').trim();
const generic = /(logo|favicon|default|placeholder|avatar|sprite|blank|spacer)[^/]*$/i;

/** The page's own preview image (og:image, then twitter:image), resolved against the page URL. Never model-chosen. */
export function extractPreviewImage(html: string, pageUrl: string): string | undefined {
  const head = html.slice(0, 200_000).match(/<head\b[\s\S]*?<\/head>/i)?.[0] ?? html.slice(0, 200_000);
  const metas = head.match(/<meta\b[^>]*>/gi) ?? [];
  const read = (tag: string, name: string) => new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag)?.slice(1).find((v) => v !== undefined);
  for (const key of ["og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src"]) {
    for (const tag of metas) {
      const name = (read(tag, "property") ?? read(tag, "name") ?? "").toLowerCase();
      if (name !== key) continue;
      const content = read(tag, "content");
      if (!content) continue;
      try {
        const url = new URL(decode(content), pageUrl);
        if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password && !generic.test(url.pathname) && !/\.svg$/i.test(url.pathname)) return url.toString();
      } catch { /* malformed */ }
    }
  }
  return undefined;
}

/**
 * Downloads a source preview image through the SSRF-safe fetcher, rejects tiny or non-raster images,
 * and re-encodes it as a small WebP so readers never load third-party media.
 */
export async function saveCover(imageUrl: string, destination: string, options: { fetcher?: Fetcher } = {}) {
  const fetcher = options.fetcher ?? safeFetch;
  const response = await fetcher(imageUrl, { signal: AbortSignal.timeout(15_000), headers: { Accept: "image/avif,image/webp,image/png,image/jpeg;q=0.9" } });
  if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
  const type = response.headers.get("content-type") ?? "";
  if (!/^image\/(jpeg|jpg|png|webp|gif|avif)\b/i.test(type)) { await response.body?.cancel(); throw new Error(`Unsupported image type: ${type || "none"}`); }
  const bytes = await readBoundedBytes(response, 6_000_000);
  const image = sharp(bytes, { limitInputPixels: 40_000_000, animated: false, failOn: "error" });
  const meta = await image.metadata();
  if (!meta.width || !meta.height || meta.width < 400 || meta.height < 200) throw new Error("Image too small for a cover");
  const output = await image.rotate().resize(800, 450, { fit: "cover", position: "attention" }).webp({ quality: 64 }).toBuffer();
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, output);
  return output.byteLength;
}
