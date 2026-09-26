import { domainOf, groupByTopic, type Digest } from "./digest";

export function digestMarkdown(digest: Digest): string {
  const lines = [`# DevPulse — ${digest.date}`, "", `${digest.items.length} engineering stories worth reading, picked from ${digest.candidateCount} candidates.`, ""];
  for (const group of groupByTopic(digest.items)) {
    lines.push(`## ${group.label}`, "");
    for (const item of group.items) {
      lines.push(`- **[${item.headline}](${item.url})** (${domainOf(item.url)})${item.discussionUrl && item.discussionUrl !== item.url ? ` · [discussion](${item.discussionUrl})` : ""}`, `  ${item.whyRead}`, ...(item.brief ?? []).map((point) => `  - ${point}`));
    }
    lines.push("");
  }
  lines.push(`_Headlines and summaries written by ${digest.model} from each source's own text. Follow the link before relying on a claim._`, "");
  return lines.join("\n");
}

export function llmsIndex(digests: Digest[], origin: string): string {
  const latest = digests[0];
  return [
    "# DevPulse",
    "",
    "> A daily engineering newspaper: the stories worth a senior engineer's time, picked from hundreds of candidates and grouped by topic.",
    "",
    "Each story has a plain factual headline, a one-line reason to read it, and a link to the original source and its discussion. Headlines and summaries are model-written from the source's own text; cite the original source, not DevPulse, for technical claims.",
    "",
    "## Latest",
    latest ? `- [${latest.date}: ${latest.items.length} stories](${origin}/digest/${latest.date}.md)` : "- No digest yet.",
    `- [Latest JSON](${origin}/json)`,
    `- [RSS](${origin}/rss.xml)`,
    "",
    "## Topics",
    ...(latest ? groupByTopic(latest.items).map((group) => `- [${group.label}](${origin}/topic/${group.slug}): ${group.items.length} stories today`) : []),
    "",
    "## Archive",
    ...digests.slice(0, 30).map((digest) => `- [${digest.date}](${origin}/digest/${digest.date}.md): ${digest.items.length} stories`),
    "",
  ].join("\n");
}
