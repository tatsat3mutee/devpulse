import { z } from "zod";

export const TOPICS = [
  { slug: "ai", label: "AI & ML systems" },
  { slug: "systems", label: "Systems & performance" },
  { slug: "infra", label: "Infrastructure & cloud" },
  { slug: "security", label: "Security" },
  { slug: "data", label: "Databases & data" },
  { slug: "languages", label: "Languages & tooling" },
  { slug: "web", label: "Web & frontend" },
  { slug: "research", label: "Papers & research" },
  { slug: "craft", label: "Engineering practice" },
] as const;

export type TopicSlug = (typeof TOPICS)[number]["slug"];
export const topicSlugs = TOPICS.map((topic) => topic.slug) as [TopicSlug, ...TopicSlug[]];
export const topicLabel = (slug: TopicSlug) => TOPICS.find((topic) => topic.slug === slug)!.label;

export const sourceKinds = ["hn", "lobsters", "github", "papers", "blog"] as const;

const webUrl = z.url().refine((value) => {
  const url = new URL(value);
  return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
}, { message: "Links must be credential-free HTTP(S) URLs" });

export const itemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  headline: z.string().min(8).max(140),
  originalTitle: z.string().min(1),
  url: webUrl,
  source: z.enum(sourceKinds),
  sourceLabel: z.string().min(1),
  discussionUrl: webUrl.optional(),
  points: z.number().int().nonnegative().optional(),
  comments: z.number().int().nonnegative().optional(),
  stars: z.number().int().nonnegative().optional(),
  topic: z.enum(topicSlugs),
  score: z.number().int().min(1).max(10),
  whyRead: z.string().min(20).max(420),
  publishedAt: z.iso.datetime(),
  mustRead: z.boolean().default(false),
});

export const digestSchema = z.object({
  date: z.iso.date(),
  generatedAt: z.iso.datetime(),
  model: z.string().min(1),
  candidateCount: z.number().int().nonnegative(),
  items: z.array(itemSchema).min(5).max(100),
  sources: z.array(z.object({ id: z.string(), label: z.string(), status: z.enum(["ok", "empty", "error"]), count: z.number().int().nonnegative() })),
}).refine((digest) => new Set(digest.items.map((item) => item.id)).size === digest.items.length, { message: "Item IDs must be unique" });

export type DigestItem = z.infer<typeof itemSchema>;
export type Digest = z.infer<typeof digestSchema>;

export const domainOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

export function groupByTopic(items: DigestItem[]) {
  return TOPICS.map((topic) => ({ ...topic, items: items.filter((item) => item.topic === topic.slug) })).filter((group) => group.items.length);
}
