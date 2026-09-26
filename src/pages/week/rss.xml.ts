import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { allDigests } from "../../lib/digests";
import { groupByWeek, weekRange, weeklySummary } from "../../lib/weekly";

export const GET: APIRoute = async (context) => {
  const weeks = groupByWeek(await allDigests()).slice(0, 12);
  return rss({
    title: "DevPulse weekly",
    description: "The week in AI and systems engineering: the stories that mattered most across the daily editions.",
    site: context.site!,
    items: weeks.map(({ week, digests }, index) => {
      const summary = weeklySummary(digests, weeks[index + 1]?.digests);
      const { start, end } = weekRange(week);
      return {
        title: `Week ${week.split("-W")[1].replace(/^0/, "")}: ${summary.top[0]?.headline ?? "the week in AI & systems"}`,
        description: summary.top.map((item, rank) => `${rank + 1}. ${item.headline}`).join("\n"),
        link: `/week/${week}`,
        pubDate: new Date(`${digests[0].date}T12:00:00Z`),
        categories: [`${start} to ${end}`],
      };
    }),
    customData: "<language>en-us</language>",
  });
};
