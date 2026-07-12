import { useState, useRef, useEffect } from "react";
import { Item, api } from "../lib/api";
import {
  timeAgo,
  engagementText,
  typeDotColor,
  stripHtml,
} from "../lib/utils";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon";
import VideoModal, { isYouTube } from "./VideoModal";
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

// Module-level batch queue for seen tracking — shared across all FeedItem instances
let seenQueue: Set<number> = new Set();
let seenTimer: ReturnType<typeof setTimeout> | null = null;

function enqueueSeen(id: number) {
  seenQueue.add(id);
  if (seenTimer) clearTimeout(seenTimer);
  seenTimer = setTimeout(() => {
    const ids = Array.from(seenQueue);
    seenQueue = new Set();
    seenTimer = null;
    api.markSeen(ids).catch(() => {});
  }, 2000);
}

export default function FeedItem({ item, showTopic, note }: Props) {
  const engagement = engagementText(item.platform, item.metadata || {});
  const navigate = useNavigate();
  const { user, isSaved, saveItem, unsaveItem, muteSource, mutedSourceIds } = useAuth();
  const articleRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mutedLocally, setMutedLocally] = useState(false);

  // Local bookmark state for unauthenticated users
  const [localSaved, setLocalSaved] = useState(() => isLocalBookmarked(item.id));
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const isVideo = isYouTube(item);

  const saved = user ? isSaved(item.id) : localSaved;

  // IntersectionObserver: mark item as seen after 2s dwell
  useEffect(() => {
    if (!user || !articleRef.current) return;
    const el = articleRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          enqueueSeen(item.id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [user, item.id]);

  const isMuted = mutedLocally || (item.source_id != null && mutedSourceIds.has(item.source_id));

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
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
          description: item.description ?? undefined,
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

  const handleMuteSource = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen(false);
    if (!user || item.source_id == null) return;
    setMutedLocally(true);
    try {
      await muteSource(item.source_id);
    } catch {
      setMutedLocally(false);
    }
  };

  if (isMuted) return null;

  return (
    <article
      ref={articleRef}
      onClick={() => {
        if (isVideo) setVideoOpen(true);
        else window.open(item.url, "_blank", "noopener,noreferrer");
      }}
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
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            className={`p-1 rounded transition-colors ${saved ? "text-accent" : "text-ink-faint/50 hover:text-ink-muted"}`}
            aria-label={saved ? "Remove from library" : "Save to library"}
          >
            <Icon name={saved ? "bookmark-filled" : "bookmark"} size={13} />
          </button>
          {user && item.source_id != null && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(o => !o); }}
                className="p-1 rounded transition-colors text-ink-faint/50 hover:text-ink-muted"
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <Icon name="more" size={13} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                  <div className="absolute right-0 top-6 z-50 bg-surface border border-line rounded-lg shadow-card w-40 py-1 text-[12.5px]">
                    <button
                      onClick={handleMuteSource}
                      className="w-full text-left px-3 py-2 text-ink-muted hover:text-ink hover:bg-paper transition-colors"
                    >
                      Mute {item.source_name || "this source"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-ink leading-snug tracking-tightish mb-1.5 group-hover:text-accent transition-colors line-clamp-2">
        {item.title}
      </h3>

      {/* Description */}
      {item.description && (
        <p className="text-[13.5px] text-ink-muted line-clamp-3 leading-relaxed mb-3">
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
            <span
              className="font-mono text-accent inline-flex items-center gap-0.5"
              title="Hotness score — ranked by recency + engagement"
            >
              <Icon name="trending" size={11} />
              {Math.round(item.score)}
            </span>
          )}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setShareOpen((o) => !o);
              }}
              className="p-1 rounded transition-colors text-ink-faint hover:text-ink"
              title="Share"
              aria-label="Share"
            >
              {copied ? (
                <span className="text-accent text-[10px] font-medium">Copied!</span>
              ) : (
                <Icon name="share" size={13} />
              )}
            </button>
            {shareOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareOpen(false);
                  }}
                />
                <div className="absolute right-0 top-7 z-50 bg-surface border border-line rounded-lg shadow-card w-44 py-1 text-[12.5px]">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      try {
                        await navigator.clipboard.writeText(item.url);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch { /* clipboard unavailable */ }
                      setShareOpen(false);
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-ink-soft hover:text-ink hover:bg-paper transition-colors"
                  >
                    <Icon name="link" size={13} /> Copy link
                  </button>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(item.url)}&text=${encodeURIComponent(item.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { e.stopPropagation(); setShareOpen(false); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-ink-soft hover:text-ink hover:bg-paper transition-colors"
                  >
                    <Icon name="share" size={13} /> Share on X
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(item.url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { e.stopPropagation(); setShareOpen(false); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-ink-soft hover:text-ink hover:bg-paper transition-colors"
                  >
                    <Icon name="share" size={13} /> Share on LinkedIn
                  </a>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${item.title} ${item.url}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { e.stopPropagation(); setShareOpen(false); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-ink-soft hover:text-ink hover:bg-paper transition-colors"
                  >
                    <Icon name="chat" size={13} /> Share on WhatsApp
                  </a>
                  {typeof navigator !== "undefined" && "share" in navigator && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        navigator.share({ title: item.title, url: item.url }).catch(() => {});
                        setShareOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-ink-soft hover:text-ink hover:bg-paper transition-colors border-t border-line mt-1 pt-2"
                    >
                      <Icon name="more" size={13} /> More…
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {videoOpen && <VideoModal item={item} onClose={() => setVideoOpen(false)} />}
    </article>
  );
}
