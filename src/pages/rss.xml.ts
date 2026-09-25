import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { isPublicEdition } from "../lib/schema";

export const GET: APIRoute = async (context) => {
  const editions = (await getCollection("editions")).filter((edition) => isPublicEdition(edition.data)).sort((a, b) => b.data.date.localeCompare(a.data.date));
  return rss({
    title: "DevPulse Daily Verdict",
    description: "What changed in AI and software engineering — and whether it held up.",
    site: context.site!,
    items: editions.map((edition) => ({
      title: edition.data.title,
      description: edition.data.dek,
      pubDate: new Date(edition.data.publishedAt),
      link: `/edition/${edition.data.date}`,
      categories: [...new Set([edition.data.lead, ...edition.data.stories].map((story) => story.section))],
    })),
    customData: "<language>en-us</language>",
  });
};
