import { Item, api } from "../lib/api";
import {
  timeAgo,
  platformIcon,
  engagementText,
  typeBadgeColor,
  stripHtml,
} from "../lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

interface Props {
  item: Item;
  showTopic?: boolean;
}

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
    <div
      onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
      className="bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
    >
      {/* Top row: type badge + bookmark */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${typeBadgeColor(item.type)}`}>
            {item.type === "paper" && "📄"}
            {item.type === "repo" && "⭐"}
            {item.type === "social" && "💬"}
            {item.type === "news" && "📰"}
            {item.type === "article" && "📝"}
            {item.type === "video" && "🎬"}
            {" "}{item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </span>
          {showTopic && item.topic_name && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/topic/${item.topic_slug}`);
              }}
              className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs transition-colors"
            >
              {item.topic_name}
            </button>
          )}
        </div>
        <button
          onClick={handleBookmark}
          className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-300 hover:text-gray-600"
          title="Bookmark"
        >
          {bookmarked ? "★" : "☆"}
        </button>
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-gray-900 leading-snug mb-1.5 group-hover:text-blue-700 transition-colors line-clamp-2">
        {item.title}
      </h3>

      {/* Source line */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
        <span>{item.source_name || item.platform}</span>
        <span>·</span>
        <span>{platformIcon(item.platform)} {item.platform}</span>
        <span>·</span>
        <span>{timeAgo(item.published_at)}</span>
      </div>

      {/* Description (LLM summary) */}
      {item.description && (
        <p className="text-sm text-gray-500 line-clamp-2 mb-2.5 leading-relaxed">
          {stripHtml(item.description)}
        </p>
      )}

      {/* Bottom row: tags + engagement + score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(item.tags || []).slice(0, 4).map((tag, i) => (
            <span key={`${tag}-${i}`} className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-[11px]">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {engagement && <span>{engagement}</span>}
          {item.score > 0 && (
            <span className="font-medium text-orange-500">
              🔥 {Math.round(item.score)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
