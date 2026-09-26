import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { allDigests } from "../../../lib/digests";
import { TOPICS, topicLabel, type TopicSlug } from "../../../lib/digest";

export function getStaticPaths() {
  return TOPICS.map((topic) => ({ params: { topic: topic.slug } }));
}

export const GET: APIRoute = async (context) => {
  const topic = context.params.topic as TopicSlug;
  const items = (await allDigests()).slice(0, 14).flatMap((digest) => digest.items.filter((item) => item.topic === topic).map((item) => ({ item, digest })));
  return rss({
    title: `DevPulse · ${topicLabel(topic)}`,
    description: `Daily ${topicLabel(topic).toLowerCase()} stories worth an engineer's time.`,
    site: context.site!,
    items: items.slice(0, 100).map(({ item, digest }) => ({
      title: item.headline,
      description: item.whyRead,
      link: item.url,
      pubDate: new Date(digest.generatedAt),
      categories: [topicLabel(topic), ...(item.kind ? [item.kind] : [])],
    })),
    customData: "<language>en-us</language>",
  });
};
