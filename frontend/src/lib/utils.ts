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

/** Type badge dot color (subtle) */
export function typeDotColor(type: string): string {
  const map: Record<string, string> = {
    paper: "bg-sky-500",
    repo: "bg-emerald-500",
    social: "bg-violet-500",
    news: "bg-amber-500",
    article: "bg-teal-500",
    video: "bg-rose-500",
  };
  return map[type] || "bg-ink-faint";
}

/** Type badge colors (legacy) */
export function typeBadgeColor(type: string): string {
  const map: Record<string, string> = {
    paper: "bg-sky-50 text-sky-700 border-sky-100",
    repo: "bg-emerald-50 text-emerald-700 border-emerald-100",
    social: "bg-violet-50 text-violet-700 border-violet-100",
    news: "bg-amber-50 text-amber-800 border-amber-100",
    article: "bg-teal-50 text-teal-700 border-teal-100",
    video: "bg-rose-50 text-rose-700 border-rose-100",
  };
  return map[type] || "bg-paper text-ink-soft border-line";
}
