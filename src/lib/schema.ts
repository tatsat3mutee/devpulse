import { z } from "zod";

const sourceUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
}, { message: "Source links must be credential-free HTTP(S) URLs" });

export const storyStatusSchema = z.enum(["developing", "holds", "contested", "unverified"]);
export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const sourceSchema = z.object({
  label: z.string().min(1),
  url: sourceUrlSchema,
  type: z.enum(["paper", "repository", "release-notes", "official-docs", "vendor-post", "advisory", "specification", "article"]),
  publishedAt: z.iso.date().optional(),
  vendorAuthored: z.boolean().default(false),
});

export const claimSchema = z.object({
  text: z.string().min(1),
  quote: z.string().min(1),
  sourceUrl: sourceUrlSchema,
});

export const storySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  section: z.enum(["ai-systems", "developer-tools", "infrastructure", "research", "practice"]),
  title: z.string().min(10).max(110),
  originalTitle: z.string().min(1),
  whatChanged: z.string().min(20),
  whyItMatters: z.string().min(20),
  whoShouldCare: z.array(z.string().min(1)).min(1).max(4),
  status: storyStatusSchema,
  confidence: confidenceSchema,
  confidenceReason: z.string().min(10),
  primarySource: sourceSchema,
  claims: z.array(claimSchema).min(1).max(4),
  corroboration: z.array(sourceSchema).max(3).default([]),
  pushback: z.object({
    summary: z.string().min(10),
    url: sourceUrlSchema,
    label: z.string().min(1),
  }).optional(),
  discussion: z.object({
    label: z.string().min(1),
    url: sourceUrlSchema,
    points: z.number().int().nonnegative().optional(),
    comments: z.number().int().nonnegative().optional(),
  }).optional(),
  provenance: z.object({
    summarizedBy: z.string().min(1),
    humanReviewed: z.boolean(),
    fetchedAt: z.iso.datetime(),
  }),
  correction: z.string().optional(),
}).refine((story) => story.claims.every((claim) => claim.sourceUrl === story.primarySource.url), {
  message: "Every claim must cite the checked primary source",
});

export const editionSchema = z.object({
  date: z.iso.date(),
  publishedAt: z.iso.datetime(),
  status: z.enum(["draft", "published", "corrected"]),
  readMinutes: z.number().int().min(1).max(10),
  title: z.string().min(1),
  dek: z.string().min(20),
  lead: storySchema,
  stories: z.array(storySchema).min(2).max(6),
  oneLiners: z.array(z.object({
    title: z.string().min(1),
    url: sourceUrlSchema,
    source: z.string().min(1),
  })).max(5).default([]),
  methodologyNote: z.string().min(20),
}).refine(
  (edition) => edition.status === "draft" || [edition.lead, ...edition.stories].every((story) => story.provenance.humanReviewed),
  { message: "Published stories must be human reviewed" },
).refine(
  (edition) => new Set([edition.lead, ...edition.stories].map((story) => story.id)).size === edition.stories.length + 1,
  { message: "Story IDs must be unique within an edition" },
).refine(
  (edition) => edition.status !== "corrected" || [edition.lead, ...edition.stories].some((story) => story.correction?.trim()),
  { message: "Corrected editions require an explicit correction note" },
);

export const isPublicEdition = (edition: z.infer<typeof editionSchema>) => edition.status !== "draft";

export type Story = z.infer<typeof storySchema>;
export type Edition = z.infer<typeof editionSchema>;
