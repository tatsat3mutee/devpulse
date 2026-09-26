import type { DigestItem } from "./digest";

/** Quick reads fit a coffee break (under 10 minutes, or unknown length and not a paper); everything else is deep work. */
export const readingBucket = (item: DigestItem): "quick" | "deep" =>
  item.kind !== "paper" && (item.readMinutes ?? 5) < 10 ? "quick" : "deep";

const isLaunch = (item: DigestItem) => item.kind === "tool" || item.source === "github" || /^show hn\b/i.test(item.originalTitle);

/** The day's standout tool: the best-scored new tool, launch or repository that is not already a must-read. */
export function toolOfTheDay(items: DigestItem[]): DigestItem | undefined {
  return items
    .filter((item) => !item.mustRead && isLaunch(item) && item.score >= 7)
    .sort((a, b) => b.score - a.score || Number(Boolean(b.brief)) - Number(Boolean(a.brief)) || (b.stars ?? b.points ?? 0) - (a.stars ?? a.points ?? 0))[0];
}

/** Labels for a three-point brief: papers read as problem, method and payoff; everything else as what, how and why. */
export const briefLabels = (item: DigestItem) => item.kind === "paper" ? ["What", "Method", "Why it matters"] : ["What", "How", "Why it matters"];
