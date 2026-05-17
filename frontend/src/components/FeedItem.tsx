import { useState } from "react";
import { Item } from "../lib/api";
import {
  timeAgo,
  engagementText,
  typeDotColor,
  stripHtml,
} from "../lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { useAuth } from "../context/AuthContext";
import {
  isLocalBookmarked,
  addLocalBookmark,
  removeLocalBookmark,
} from "../lib/localBookmarks";

interface Props {
  item: Item;
  showTopic?: boolean;
  note?: string | null;
}

const typeLabel: Record<string, string> = {
  paper: "Paper",
  repo: "Repo",
  social: "Discussion",
  news: "News",
  article: "Article",
  video: "Video",
};

const PLATFORM_BADGE: Record<string, string> = {
  arxiv:          "bg-purple-500/10 text-purple-500 dark:bg-purple-500/18 dark:text-purple-300",
  github:         "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/18 dark:text-emerald-300",
  "hacker news":  "bg-orange-500/10 text-orange-600 dark:bg-orange-500/18 dark:text-orange-300",
  huggingface:    "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-400/18 dark:text-yellow-300",
  reddit:         "bg-red-500/10 text-red-600 dark:bg-red-500/18 dark:text-red-300",
  youtube:        "bg-red-500/10 text-red-600 dark:bg-red-500/18 dark:text-red-300",
  twitter:        "bg-sky-500/10 text-sky-600 dark:bg-sky-500/18 dark:text-sky-300",
  linkedin:       "bg-blue-500/10 text-blue-600 dark:bg-blue-500/18 dark:text-blue-300",
};

function PlatformBadge({ platform }: { platform: string }) {
  const key = platform?.toLowerCase() ?? "";
  const cls = PLATFORM_BADGE[key] ?? "bg-line text-ink-faint";
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none ${cls}`}>
      {platform}
    </span>
  );
}

export default function FeedItem({ item, showTopic, note }: Props) {
  const engagement = engagementText(item.platform, item.metadata || {});
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isSaved, saveItem, unsaveItem } = useAuth();

  // Local bookmark state for unauthenticated users
  const [localSaved, setLocalSaved] = useState(() => isLocalBookmarked(item.id));
  const [copied, setCopied] = useState(false);

  const saved = user ? isSaved(item.id) : localSaved;

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      // Save to localStorage without requiring login
      if (localSaved) {
        removeLocalBookmark(item.id);
        setLocalSaved(false);
      } else {
        addLocalBookmark({
          id: item.id,
          title: item.title,
          url: item.url,
          platform: item.platform,
          type: item.type,
          topic_name: item.topic_name,
          topic_slug: item.topic_slug,
          source_name: item.source_name,
          description: item.description,
          published_at: item.published_at,
          tags: item.tags,
          score: item.score,
          metadata: item.metadata || {},
          savedAt: new Date().toISOString(),
        });
        setLocalSaved(true);
      }
      return;
    }

    try {
      if (isSaved(item.id)) {
        await unsaveItem(item.id);
      } else {
        await saveItem(item.id);
      }
    } catch { /* optimistic update already reverted in context */ }
  };

  return (
    <article
      onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
      className="group relative bg-surface border border-line rounded-xl px-5 py-4 hover:border-ink/20 hover:shadow-cardHover transition-all cursor-pointer"
    >
      {/* Header strip */}
      <div className="flex items-center justify-between mb-2 text-[11px]">
        <div className="flex items-center gap-2 text-ink-muted">
          <PlatformBadge platform={item.source_name || item.platform} />
          <span className="text-ink-faint/60">·</span>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeDotColor(item.type)}`} />
          <span className="text-ink-faint">{typeLabel[item.type] || item.type}</span>
          <span className="text-ink-faint/60">·</span>
          <span className="text-ink-faint">{timeAgo(item.published_at || item.fetched_at)}</span>
        </div>
        <button
          onClick={handleSave}
          className={`p-1 rounded transition-colors ${saved ? "text-accent" : "text-ink-faint/50 hover:text-ink-muted"}`}
          aria-label={saved ? "Remove from library" : "Save to library"}
        >
          <Icon name={saved ? "bookmark-filled" : "bookmark"} size={13} />
        </button>
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-ink leading-snug tracking-tightish mb-1.5 group-hover:text-accent transition-colors line-clamp-2">
        {item.title}
      </h3>

      {/* Description */}
      {item.description && (
        <p className="text-[13.5px] text-ink-muted line-clamp-2 leading-relaxed mb-3">
          {stripHtml(item.description)}
        </p>
      )}

      {/* Personal note (shown in Library) */}
      {note && (
        <p className="text-[12.5px] text-ink-soft italic border-l-2 border-accent/40 pl-3 mb-3 leading-relaxed">
          {note}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {showTopic && item.topic_name && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/topic/${item.topic_slug}`);
              }}
              className="text-[11px] font-medium text-ink-soft hover:text-ink underline decoration-line hover:decoration-ink underline-offset-2"
            >
              {item.topic_name}
            </button>
          )}
          {(item.tags || []).slice(0, 3).map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="text-[11px] text-ink-faint font-mono"
            >
              #{tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-ink-faint shrink-0">
          {engagement && <span className="font-mono">{engagement}</span>}
          {item.score > 0 && (
            <span className="font-mono text-accent">
              {Math.round(item.score)}
            </span>
          )}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              e.preventDefault();
              try {
                await navigator.clipboard.writeText(item.url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                // fallback: open native share if available
                if (navigator.share) {
                  navigator.share({ title: item.title, url: item.url }).catch(() => {});
                }
              }
            }}
            className="p-1 rounded transition-colors text-ink-faint hover:text-ink"
            title="Copy link"
            aria-label="Copy link"
          >
            {copied ? (
              <span className="text-accent text-[10px] font-medium">Copied!</span>
            ) : (
              <Icon name="share" size={13} />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
