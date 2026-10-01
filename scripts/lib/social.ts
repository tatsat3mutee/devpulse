import type { Digest, DigestItem } from "../../src/lib/digest";

export type SocialPlatform = "linkedin" | "x";

const engagement = (item: DigestItem) => (item.points ?? 0) + (item.comments ?? 0) + (item.stars ?? 0);

export function selectSocialStories(digest: Digest, limit = 2): DigestItem[] {
  return [...digest.items]
    .sort((a, b) => Number(b.mustRead) - Number(a.mustRead) || b.score - a.score || engagement(b) - engagement(a))
    .slice(0, limit);
}

export function storyUrl(siteUrl: string, date: string, item: DigestItem): string {
  return new URL(`/story/${date}--${item.id}/`, siteUrl).toString();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function linkedInPost(item: DigestItem, url: string): string {
  return `${item.headline}\n\n${item.whyRead}\n\nRead the DevPulse brief: ${url}\n\n#AI #Engineering`;
}

export function xPost(item: DigestItem, url: string): string {
  const suffix = `\n\n${url}`;
  return `${truncate(`${item.headline}\n\n${item.whyRead}`, 280 - suffix.length)}${suffix}`;
}
