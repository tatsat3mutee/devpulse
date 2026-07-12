import type { FetchResult } from "./types.js";
import { safeFetch } from "./http.js";

/**
 * GitHub Search API — finds trending AI/ML repos pushed recently.
 * Sorts by stars descending. Stores stars, forks, language in metadata.
 * No scraping needed — uses the official REST search endpoint.
 */
export async function fetchGithubTrending(
  sourceUrl: string
): Promise<FetchResult[]> {
  // Parse source URL to determine query type
  const urlObj = new URL(sourceUrl);

  let q: string;
  let sortBy = "stars";

  // If it's a GitHub search URL, extract the query
  if (urlObj.hostname === "api.github.com" || urlObj.searchParams.has("q")) {
    q = urlObj.searchParams.get("q") || "";
    sortBy = urlObj.searchParams.get("sort") || urlObj.searchParams.get("s") || "stars";
    // Replace any hardcoded dates or placeholders with dynamic ones (pushed:>YYYY-MM-DD)
    q = q.replace(/pushed:>(\d{4}-\d{2}-\d{2}|DATEPLACEHOLDER)/, () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return `pushed:>${weekAgo.toISOString().split("T")[0]}`;
    });
  } else {
    // Legacy: parse /trending/python?since=weekly format
    const language = urlObj.pathname.split("/trending/")[1] || "";
    const since = urlObj.searchParams.get("since") || "daily";

    const daysMap: Record<string, number> = { daily: 3, weekly: 7, monthly: 30 };
    const days = daysMap[since] || 7;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const dateStr = cutoff.toISOString().split("T")[0];

    const langQ = language ? ` language:${language}` : "";
    q = `machine-learning OR deep-learning OR LLM OR artificial-intelligence${langQ} pushed:>${dateStr} stars:>50`;
  }

  const apiUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(
    q
  )}&sort=${sortBy}&order=desc&per_page=25`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ai-pulse/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  const res = await safeFetch(apiUrl, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data: any = await res.json();
  const repos = data.items || [];
  const results: FetchResult[] = [];

  for (const r of repos) {
    results.push({
      title: `${r.full_name}: ${(r.description || "").slice(0, 150)}`,
      description: r.description || null,
      url: r.html_url,
      type: "repo",
      platform: "GitHub",
      tags: (r.topics || []).slice(0, 10),
      publishedAt: new Date(r.pushed_at || r.created_at),
      metadata: {
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        watchers: r.watchers_count || 0,
        language: r.language || null,
        owner: r.owner?.login || "",
        openIssues: r.open_issues_count || 0,
        license: r.license?.spdx_id || null,
      },
    });
  }

  return results;
}
