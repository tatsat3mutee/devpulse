/** Strip HTML tags from a string */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

/** Format a date string to relative time ("2h ago", "3d ago") */
export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/** Get icon/emoji for platform */
export function platformIcon(platform: string): string {
  const map: Record<string, string> = {
    arXiv: "📄",
    GitHub: "⭐",
    "Hacker News": "🔶",
    Reddit: "💬",
    "Hugging Face": "🤗",
    X: "𝕏",
    LinkedIn: "💼",
    YouTube: "▶",
    "VS Code": "⚡",
    OpenAI: "🟢",
    Anthropic: "🟠",
    Google: "🔵",
    Microsoft: "🟦",
    Meta: "🔷",
    NVIDIA: "🟩",
    TechCrunch: "📰",
    "The Verge": "📰",
    "Ars Technica": "📰",
    VentureBeat: "📰",
    GNews: "📰",
  };
  return map[platform] || "📰";
}

/** Get engagement text from metadata */
export function engagementText(
  platform: string,
  meta: Record<string, any>
): string {
  switch (platform) {
    case "Reddit":
      return `↑${meta.upvotes ?? 0} · 💬${meta.comments ?? 0}`;
    case "Hacker News":
      return `▲${meta.points ?? 0} · 💬${meta.comments ?? 0}`;
    case "GitHub":
      return `⭐${meta.stars ?? 0} · 🍴${meta.forks ?? 0}`;
    case "Hugging Face":
      return `❤️${meta.likes ?? 0}`;
    case "X":
      return `❤️${meta.likes ?? 0} · 🔄${meta.retweets ?? 0}`;
    default:
      return "";
  }
}

/** Type badge colors */
export function typeBadgeColor(type: string): string {
  const map: Record<string, string> = {
    paper: "bg-blue-100 text-blue-700",
    repo: "bg-green-100 text-green-700",
    social: "bg-purple-100 text-purple-700",
    news: "bg-orange-100 text-orange-700",
    article: "bg-teal-100 text-teal-700",
    video: "bg-red-100 text-red-700",
  };
  return map[type] || "bg-gray-100 text-gray-700";
}
