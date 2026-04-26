import { Item, api } from "../lib/api";
import {
  timeAgo,
  engagementText,
  typeDotColor,
  stripHtml,
} from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Icon from "./Icon";

interface Props {
  item: Item;
  showTopic?: boolean;
}

const typeLabel: Record<string, string> = {
  paper: "Paper",
  repo: "Repo",
  social: "Discussion",
  news: "News",
  article: "Article",
  video: "Video",
};

export default function FeedItem({ item, showTopic }: Props) {
  const engagement = engagementText(item.platform, item.metadata || {});
  const [bookmarked, setBookmarked] = useState(item.is_bookmarked);
  const navigate = useNavigate();

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = await api.toggleBookmark(item.id);
    setBookmarked(updated.is_bookmarked);
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
          <span>{item.source_name || item.platform}</span>
          <span className="text-ink-faint">·</span>
          <span className="normal-case tracking-normal">{timeAgo(item.published_at)}</span>
        </div>
        <button
          onClick={handleBookmark}
          className={`p-1 rounded transition-colors ${bookmarked ? "text-accent" : "text-ink-faint hover:text-ink"}`}
          aria-label="Bookmark"
        >
          <Icon name={bookmarked ? "bookmark-filled" : "bookmark"} size={14} />
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
        </div>
      </div>
    </article>
  );
}
