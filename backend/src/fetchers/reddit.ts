import type { FetchResult } from "./types.js";

const MIN_SCORE = Number(process.env.MIN_REDDIT_SCORE) || 20;
const UA = "ai-pulse:v1.0 (automated AI news aggregator)";

/**
 * Reddit JSON API — top posts from a subreddit in the past week.
 * Filters out posts below MIN_SCORE upvotes to avoid noise.
 * Stores upvotes + comments in metadata for the UI.
 */
export async function fetchReddit(sourceUrl: string): Promise<FetchResult[]> {
  // sourceUrl = "https://www.reddit.com/r/MachineLearning"
  const jsonUrl = `${sourceUrl}/top.json?t=week&limit=25`;

  const res = await fetch(jsonUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Reddit ${res.status} for ${sourceUrl}`);

  const data: any = await res.json();
  const posts = data?.data?.children || [];
  const results: FetchResult[] = [];

  for (const post of posts) {
    const d = post.data;
    if (!d || d.stickied) continue;
    if ((d.score || 0) < MIN_SCORE) continue; // popularity gate

    const subreddit = d.subreddit || "";
    const permalink = `https://www.reddit.com${d.permalink}`;

    results.push({
      title: d.title || "",
      description: (d.selftext || "").slice(0, 500) || null,
      url: d.url && d.url !== permalink ? d.url : permalink,
      type: "social",
      platform: "Reddit",
      tags: [subreddit, d.link_flair_text].filter(Boolean) as string[],
      publishedAt: new Date((d.created_utc || 0) * 1000),
      metadata: {
        upvotes: d.score || 0,
        comments: d.num_comments || 0,
        subreddit,
        author: d.author || "",
        flair: d.link_flair_text || null,
        redditUrl: permalink,
      },
    });
  }

  return results;
}
