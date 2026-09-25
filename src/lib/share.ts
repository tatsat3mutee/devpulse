import type { Story } from "./schema";

export const STATUS_LABELS: Record<Story["status"], string> = {
  developing: "Developing",
  holds: "Holds up",
  contested: "Contested",
  unverified: "Unverified",
};

export interface ShareInput {
  title: string;
  summary: string;
  url: string;
  verdict?: string;
}

const clip = (value: string, max: number) => (value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`);

export function sharePost({ title, summary, url, verdict }: ShareInput): string {
  return [
    title,
    "",
    clip(summary, 420),
    ...(verdict ? ["", `Verdict: ${verdict}`] : []),
    "",
    `Receipts: ${url}`,
    "",
    "#AIEngineering #SoftwareEngineering",
  ].join("\n");
}

export function shareLinks(input: ShareInput) {
  const post = sharePost(input);
  const xText = clip(`${input.title}${input.verdict ? ` — ${input.verdict}` : ""}`, 220);
  return {
    post,
    x: `https://x.com/intent/post?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(input.url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(input.url)}`,
  };
}

export function storyPath(id: string, editionDate?: string): string {
  return `/story/${editionDate ? `${editionDate}--` : ""}${id}`;
}

export function storyShare(story: Story, site: URL, editionDate?: string): ShareInput {
  return {
    title: story.title,
    summary: `${story.whatChanged} ${story.whyItMatters}`,
    url: new URL(storyPath(story.id, editionDate), site).toString(),
    verdict: `${STATUS_LABELS[story.status]} · ${story.confidence} confidence`,
  };
}
