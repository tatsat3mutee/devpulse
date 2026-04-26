import { Item } from "../lib/api";
import { timeAgo } from "../lib/utils";

interface Props {
  item: Item;
}

export default function VideoCard({ item }: Props) {
  const videoId = item.metadata?.videoId || item.url.match(/v=([^&]+)/)?.[1];
  const thumbnail = item.image_url || (videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null);

  return (
    <div
      onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Thumbnail */}
      {thumbnail && (
        <div className="relative aspect-video bg-gray-100">
          <img
            src={thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/70 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-lg ml-0.5">▶</span>
            </div>
          </div>
          {item.duration && (
            <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
              {item.duration}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug mb-1.5 group-hover:text-blue-700 transition-colors line-clamp-2">
          {item.title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          {item.author && <span className="font-medium text-gray-500">{item.author}</span>}
          {item.author && <span>·</span>}
          <span>{timeAgo(item.published_at)}</span>
        </div>
        {item.description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}
        {/* Tags */}
        {item.tags?.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {item.tags.slice(0, 3).map((tag, i) => (
              <span key={`${tag}-${i}`} className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-[10px]">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
