import { DESKS, TOPICS, topicDesk, type Desk, type Digest, type DigestItem } from "./digest";

export type WeekStory = DigestItem & { date: string };

/** ISO 8601 week, e.g. "2026-W39" (weeks start on Monday; week 1 contains the year's first Thursday). */
export function isoWeek(date: string): string {
  const day = new Date(`${date}T12:00:00Z`);
  const weekday = (day.getUTCDay() + 6) % 7;
  const thursday = new Date(day);
  thursday.setUTCDate(day.getUTCDate() - weekday + 3);
  const year = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Monday and Sunday of an ISO week, as YYYY-MM-DD. */
export function weekRange(week: string): { start: string; end: string } {
  const [year, number] = week.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (number - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
}

/** Editions grouped by ISO week, newest week first. */
export function groupByWeek(digests: Digest[]): { week: string; digests: Digest[] }[] {
  const weeks = new Map<string, Digest[]>();
  for (const digest of [...digests].sort((a, b) => b.date.localeCompare(a.date))) {
    const week = isoWeek(digest.date);
    weeks.set(week, [...(weeks.get(week) ?? []), digest]);
  }
  return [...weeks].map(([week, list]) => ({ week, digests: list }));
}

const engagement = (item: DigestItem) => Math.log2(1 + (item.points ?? 0) + (item.comments ?? 0) + (item.stars ?? 0) / 10);
const rank = (a: DigestItem, b: DigestItem) => b.score - a.score || Number(b.mustRead) - Number(a.mustRead) || engagement(b) - engagement(a);

/** The week in review: built entirely from the week's editions, so every line links to a source the daily edition already vetted. */
export function weeklySummary(digests: Digest[], previousWeek: Digest[] = []) {
  const seen = new Set<string>();
  const stories: WeekStory[] = [];
  for (const digest of [...digests].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const item of digest.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      stories.push({ ...item, date: digest.date });
    }
  }
  const top = [...stories].sort(rank).slice(0, 10);
  const topIds = new Set(top.map((item) => item.id));
  const deskLeaders = (Object.keys(DESKS) as Desk[]).map((desk) => ({
    desk,
    label: DESKS[desk].label,
    items: stories.filter((item) => topicDesk(item.topic) === desk && !topIds.has(item.id)).sort(rank).slice(0, 3),
  })).filter((group) => group.items.length);
  const mostDiscussed = stories.filter((item) => (item.comments ?? 0) > 0).sort((a, b) => (b.comments ?? 0) - (a.comments ?? 0)).slice(0, 5);
  const count = (list: DigestItem[], slug: string) => list.filter((item) => item.topic === slug).length;
  const lastWeekItems = previousWeek.flatMap((digest) => digest.items);
  const topics = TOPICS.map((topic) => ({ slug: topic.slug, label: topic.label, desk: topic.desk, count: count(stories, topic.slug), delta: previousWeek.length ? count(stories, topic.slug) - count(lastWeekItems, topic.slug) : undefined }))
    .filter((topic) => topic.count > 0 || (topic.delta ?? 0) !== 0)
    .sort((a, b) => b.count - a.count);
  const knownModels = new Set(previousWeek.flatMap((digest) => digest.radar?.models.map((model) => model.id) ?? []));
  const newModels = [...new Map(digests.flatMap((digest) => digest.radar?.models ?? []).filter((model) => !knownModels.has(model.id)).map((model) => [model.id, model])).values()].slice(0, 8);
  return {
    editions: digests.length,
    storyCount: stories.length,
    candidateCount: digests.reduce((sum, digest) => sum + digest.candidateCount, 0),
    top,
    deskLeaders,
    mostDiscussed,
    topics,
    newModels,
  };
}
