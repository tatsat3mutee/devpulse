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
  arxiv:          "bg-purple-500/12 text-purple-400 dark:bg-purple-500/15 dark:text-purple-400",
  github:         "bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  "hacker news":  "bg-orange-500/12 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  huggingface:    "bg-yellow-500/12 text-yellow-600 dark:bg-yellow-400/15 dark:text-yellow-400",
  reddit:         "bg-red-500/12 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  youtube:        "bg-red-500/12 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  twitter:        "bg-sky-500/12 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  linkedin:       "bg-blue-500/12 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
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
      className="group relative bg-surface border border-line rounded-lg px-5 py-4 hover:border-ink/30 hover:shadow-card transition-all cursor-pointer"
    >
      {/* Header strip */}
      <div className="flex items-center justify-between mb-2.5 text-[11px] uppercase tracking-[0.08em]">
        <div className="flex items-center gap-3 text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${typeDotColor(item.type)}`} />
            <span className="font-medium text-ink-soft">{typeLabel[item.type] || item.type}</span>
          </span>
          <span className="text-ink-faint">·</span>
          <PlatformBadge platform={item.source_name || item.platform} />
          <span className="text-ink-faint">·</span>
          <span className="normal-case tracking-normal">{timeAgo(item.published_at)}</span>
        </div>
        <button
          onClick={handleSave}
          className={`p-1 rounded transition-colors ${saved ? "text-accent" : "text-ink-faint hover:text-ink"}`}
          aria-label={saved ? "Remove from library" : "Save to library"}
        >
          <Icon name={saved ? "bookmark-filled" : "bookmark"} size={14} />
        </button>
      </div>

      {/* Title */}
      <h3 className="text-[16px] font-medium text-ink leading-snug tracking-tightish mb-1.5 group-hover:text-accent transition-colors line-clamp-2">
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
