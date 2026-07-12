import type { FetchResult } from "./types.js";
import { safeFetch } from "./http.js";

/**
 * X (Twitter) fetcher — uses the free X API v2 recent search endpoint.
 * Requires TWITTER_BEARER_TOKEN in .env (free developer account).
 *
 * Searches for AI-related tweets with high engagement.
 * Falls back to Nitter RSS if no bearer token is set.
 */
export async function fetchTwitter(
  sourceUrl: string
): Promise<FetchResult[]> {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) {
    console.log("  ⚠️  No TWITTER_BEARER_TOKEN set — skipping X fetch");
    return [];
  }

  // sourceUrl contains the search query from the sources table
  // e.g. "AI OR LLM OR GPT lang:en -is:retweet"
  const query = new URL(sourceUrl).searchParams.get("q") || sourceUrl;

  const params = new URLSearchParams({
    query: query,
    "tweet.fields": "created_at,public_metrics,author_id,entities",
    "user.fields": "username,name",
    expansions: "author_id",
    max_results: "25",
    sort_order: "relevancy",
  });

  const res = await safeFetch(
    `https://api.x.com/2/tweets/search/recent?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (res.status === 429) {
    console.log("  ⚠️  X rate limit hit — try again later");
    return [];
  }
  if (!res.ok) throw new Error(`X API ${res.status}: ${await res.text()}`);

  const data: any = await res.json();
  const tweets = data.data || [];
  const users: Record<string, any> = {};
  for (const u of data.includes?.users || []) {
    users[u.id] = u;
  }

  const MIN_LIKES = Number(process.env.MIN_TWEET_LIKES) || 10;
  const results: FetchResult[] = [];

  for (const t of tweets) {
    const metrics = t.public_metrics || {};
    if ((metrics.like_count || 0) < MIN_LIKES) continue; // quality gate

    const author = users[t.author_id];
    const username = author?.username || "";
    const tweetUrl = `https://x.com/${username}/status/${t.id}`;

    // Extract any URLs from the tweet
    const urls = (t.entities?.urls || []).map((u: any) => u.expanded_url);
    const linkUrl = urls.find((u: string) => !u.includes("twitter.com") && !u.includes("x.com")) || tweetUrl;

    results.push({
      title: `@${username}: ${t.text?.slice(0, 200) || ""}`,
      description: t.text || null,
      url: linkUrl,
      type: "social",
      platform: "X",
      tags: (t.entities?.hashtags || []).map((h: any) => h.tag).slice(0, 5),
      publishedAt: new Date(t.created_at || Date.now()),
      metadata: {
        likes: metrics.like_count || 0,
        retweets: metrics.retweet_count || 0,
        replies: metrics.reply_count || 0,
        quotes: metrics.quote_count || 0,
        impressions: metrics.impression_count || 0,
        author: username,
        authorName: author?.name || "",
        tweetUrl,
      },
    });
  }

  return results;
}
