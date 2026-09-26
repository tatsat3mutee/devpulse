import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { allDigests } from "../lib/digests";

export const GET: APIRoute = async (context) => {
  const digests = await allDigests();
  return rss({
    title: "DevPulse",
    description: "Engineering stories worth reading, every day.",
    site: context.site!,
    items: digests.slice(0, 30).map((digest) => ({
      title: `${digest.date}: ${digest.items.filter((item) => item.mustRead).map((item) => item.headline).join(" · ")}`,
      description: `${digest.items.length} stories. ${digest.items.slice(0, 8).map((item) => item.headline).join("; ")}.`,
      pubDate: new Date(digest.generatedAt),
      link: `/edition/${digest.date}`,
      categories: [...new Set(digest.items.map((item) => item.topic))],
    })),
    customData: "<language>en-us</language>",
  });
};
