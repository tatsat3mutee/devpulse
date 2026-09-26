import { z } from "zod";

// Desks group topics for color and page rhythm; four hues validated for CVD separation in both themes.
export const DESKS = {
  ai: { label: "AI" },
  systems: { label: "Systems" },
  security: { label: "Security" },
  software: { label: "Software" },
} as const;
export type Desk = keyof typeof DESKS;

export const TOPICS = [
  { slug: "agents", label: "Agents", desk: "ai" },
  { slug: "inference", label: "Inference", desk: "ai" },
  { slug: "ai", label: "Models & training", desk: "ai" },
  { slug: "research", label: "Research", desk: "ai" },
  { slug: "design", label: "Architecture", desk: "systems" },
  { slug: "systems", label: "Performance & OS", desk: "systems" },
  { slug: "infra", label: "Cloud & infra", desk: "systems" },
  { slug: "data", label: "Databases", desk: "systems" },
  { slug: "security", label: "Security", desk: "security" },
  { slug: "languages", label: "Languages & tools", desk: "software" },
  { slug: "web", label: "Web", desk: "software" },
  { slug: "craft", label: "Practice & careers", desk: "software" },
] as const satisfies readonly { slug: string; label: string; desk: Desk }[];

export type TopicSlug = (typeof TOPICS)[number]["slug"];
export const topicSlugs = TOPICS.map((topic) => topic.slug) as [TopicSlug, ...TopicSlug[]];
export const topicLabel = (slug: TopicSlug) => TOPICS.find((topic) => topic.slug === slug)!.label;
export const topicDesk = (slug: TopicSlug): Desk => TOPICS.find((topic) => topic.slug === slug)!.desk;

export const sourceKinds = ["hn", "lobsters", "github", "papers", "blog", "models"] as const;

export const KINDS = {
  "deep-dive": "Deep dive",
  "case-study": "Case study",
  benchmark: "Benchmark",
  guide: "Guide",
  release: "Release",
  paper: "Paper",
  vulnerability: "Vulnerability",
  tool: "Tool",
  postmortem: "Postmortem",
  essay: "Essay",
  news: "News",
} as const;
export const kindSlugs = Object.keys(KINDS) as [keyof typeof KINDS, ...(keyof typeof KINDS)[]];

const webUrl = z.url().refine((value) => {
  const url = new URL(value);
  return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
}, { message: "Links must be credential-free HTTP(S) URLs" });

const shortText = (max: number) => z.string().min(2).max(max).refine((value) => !/https?:\/\/|www\./i.test(value), { message: "Model text must not contain URLs" });

// A small architecture sketch the model extracts from the article's own text: named components and how data flows between them.
export const diagramSchema = z.object({
  caption: shortText(120),
  nodes: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]{1,24}$/), label: shortText(32) })).min(2).max(6),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: shortText(24).optional() })).min(1).max(8),
}).refine((diagram) => new Set(diagram.nodes.map((node) => node.id)).size === diagram.nodes.length
  && diagram.edges.every((edge) => edge.from !== edge.to && diagram.nodes.some((node) => node.id === edge.from) && diagram.nodes.some((node) => node.id === edge.to)), { message: "Diagram edges must connect distinct known nodes" });
export type Diagram = z.infer<typeof diagramSchema>;

export const itemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  headline: z.string().min(8).max(140),
  originalTitle: z.string().min(1),
  url: webUrl,
  source: z.enum(sourceKinds),
  sourceLabel: z.string().min(1),
  discussionUrl: webUrl.optional(),
  discussions: z.array(z.object({ label: z.string().min(1), url: webUrl, comments: z.number().int().nonnegative().optional(), points: z.number().int().nonnegative().optional() })).max(4).optional(),
  kind: z.enum(kindSlugs).optional(),
  readMinutes: z.number().int().min(1).max(120).optional(),
  points: z.number().int().nonnegative().optional(),
  comments: z.number().int().nonnegative().optional(),
  stars: z.number().int().nonnegative().optional(),
  topic: z.enum(topicSlugs),
  score: z.number().int().min(1).max(10),
  // Mission fit, judged separately from quality: 3 core AI/systems, 2 adjacent, 1 peripheral, 0 off-mission.
  relevance: z.number().int().min(0).max(3).optional(),
  whyRead: z.string().min(20).max(420),
  publishedAt: z.iso.datetime(),
  mustRead: z.boolean().default(false),
  // Re-encoded copy of the source page's own preview image, stored with the site; never chosen by the model.
  image: z.string().regex(/^\/covers\/\d{4}-\d{2}-\d{2}\/[a-z0-9-]+\.webp$/).optional(),
  brief: z.array(shortText(200)).min(2).max(3).optional(),
  diagram: diagramSchema.optional(),
});

export const digestSchema = z.object({
  date: z.iso.date(),
  generatedAt: z.iso.datetime(),
  model: z.string().min(1),
  candidateCount: z.number().int().nonnegative(),
  collectedCount: z.number().int().nonnegative().optional(),
  items: z.array(itemSchema).min(5).max(100),
  sources: z.array(z.object({ id: z.string(), label: z.string(), status: z.enum(["ok", "empty", "error"]), count: z.number().int().nonnegative() })),
}).refine((digest) => new Set(digest.items.map((item) => item.id)).size === digest.items.length, { message: "Item IDs must be unique" });

export type DigestItem = z.infer<typeof itemSchema>;
export type Digest = z.infer<typeof digestSchema>;

export const domainOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

export function groupByTopic(items: DigestItem[]) {
  return TOPICS.map((topic) => ({ ...topic, items: items.filter((item) => item.topic === topic.slug) })).filter((group) => group.items.length);
}
