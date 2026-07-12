import type { FetchResult } from "./types.js";
import { safeFetch } from "./http.js";

/**
 * YouTube Data API v3 fetcher.
 * Fetches recent videos from a channel ID (stored in source.url).
 * Requires YOUTUBE_API_KEY in .env.
 * Falls back to YouTube RSS feed if no API key.
 */
export async function fetchYouTube(channelId: string): Promise<FetchResult[]> {
  // Normalize: strip full URL prefix if present (some SQL seeds store full URLs)
  channelId = channelId
    .replace(/^https?:\/\/(www\.)?youtube\.com\/channel\//i, "")
    .replace(/\/$/, "");

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey) {
    return fetchViaAPI(channelId, apiKey);
  }

  // Fallback: YouTube provides free RSS feeds per channel
  return fetchViaRSS(channelId);
}

async function fetchViaAPI(
  channelId: string,
  apiKey: string
): Promise<FetchResult[]> {
  const weekAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const url =
    `https://www.googleapis.com/youtube/v3/search?` +
    `part=snippet&channelId=${channelId}&order=date&type=video` +
    `&publishedAfter=${weekAgo.toISOString()}&maxResults=10` +
    `&key=${apiKey}`;

  const res = await safeFetch(url);
  if (!res.ok) {
    console.warn(`  YouTube API ${res.status} for ${channelId}, falling back to RSS`);
    return fetchViaRSS(channelId);
  }

  const data = await res.json();
  const results: FetchResult[] = [];

  for (const item of data.items || []) {
    const snippet = item.snippet;
    const videoId = item.id?.videoId;
    if (!videoId) continue;

    results.push({
      title: snippet.title,
      description: snippet.description?.slice(0, 500) || "",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      type: "video",
      platform: "YouTube",
      tags: filterAITags(snippet.title + " " + (snippet.description || "")),
      publishedAt: new Date(snippet.publishedAt),
      imageUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      author: snippet.channelTitle,
      metadata: {
        channelId,
        channelTitle: snippet.channelTitle,
        videoId,
      },
    });
  }

  return results;
}

async function fetchViaRSS(channelId: string): Promise<FetchResult[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await safeFetch(feedUrl, {
    headers: { "User-Agent": "ai-pulse/1.0" },
  });
  if (!res.ok) throw new Error(`YouTube RSS ${res.status} for ${channelId}`);

  const xml = await res.text();
  const entries = xml.split("<entry>").slice(1);
  const results: FetchResult[] = [];
  const weekAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Get channel title from feed
  const channelTitle = xml.match(/<author>\s*<name>([^<]+)<\/name>/)?.[1] || "YouTube";

  for (const entry of entries) {
    const title = tag(entry, "title");
    const videoId = entry.match(/videoId>([^<]+)</)?.[1];
    const published = tag(entry, "published");
    const description =
      entry.match(/<media:description>([^]*?)<\/media:description>/)?.[1] || "";
    const thumbnail =
      entry.match(/url="(https:\/\/i[^"]+)"/)?.[1] || "";

    if (!title || !videoId) continue;
    const pubDate = new Date(published);
    if (pubDate < weekAgo) continue;

    // Only include AI-related videos (for general channels)
    if (!isAIRelated(title + " " + description)) continue;

    results.push({
      title: title.slice(0, 500),
      description: cleanText(description).slice(0, 1000),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      type: "video",
      platform: "YouTube",
      tags: filterAITags(title + " " + description),
      publishedAt: pubDate,
      imageUrl: thumbnail || undefined,
      author: channelTitle,
      metadata: { channelId, channelTitle, videoId },
    });
  }

  console.log(`    YouTube RSS: ${results.length} AI videos from ${channelTitle}`);
  return results.slice(0, 10);
}

// ── Helpers ──────────────────────────────────────────────────────────

function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].trim() : "";
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const AI_KEYWORDS =
  /\b(ai|artificial intelligence|machine learning|deep learning|llm|gpt|copilot|chatgpt|claude|gemini|neural|transformer|diffusion|langchain|openai|anthropic|embedding|fine-tun|rag|agent|mcp|coding assistant|cursor|windsurf|devin|cline|aider)\b/i;

// Negative keywords — if these dominate the text, skip the video even if AI_KEYWORDS match
const NON_AI_KEYWORDS =
  /\b(ffmpeg|x264|x265|av1|h\.?264|h\.?265|h\.?266|video codec|video encoding|vlc|obs studio|premiere pro|davinci resolve|color grading|cinematography)\b/i;

function isAIRelated(text: string): boolean {
  if (NON_AI_KEYWORDS.test(text)) return false;
  return AI_KEYWORDS.test(text);
}

function filterAITags(text: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();
  const tagMap: Record<string, string> = {
    gpt: "GPT",
    copilot: "Copilot",
    claude: "Claude",
    gemini: "Gemini",
    llm: "LLM",
    "machine learning": "ML",
    "deep learning": "Deep Learning",
    langchain: "LangChain",
    rag: "RAG",
    agent: "AI Agents",
    "vs code": "VS Code",
    vscode: "VS Code",
    python: "Python",
    typescript: "TypeScript",
  };

  for (const [keyword, tag] of Object.entries(tagMap)) {
    if (lower.includes(keyword) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags.slice(0, 5);
}
