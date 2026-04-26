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
      className="group bg-surface rounded-lg border border-line overflow-hidden hover:border-ink/30 hover:shadow-card transition-all cursor-pointer"
    >
      {thumbnail && (
        <div className="relative aspect-video bg-paper overflow-hidden">
          <img
            src={thumbnail}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-ink/85 backdrop-blur flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#fafaf7"><polygon points="7 4 21 12 7 20" /></svg>
            </div>
          </div>
          {item.duration && (
            <span className="absolute bottom-2 right-2 bg-ink/85 text-paper text-[10.5px] font-mono px-1.5 py-0.5 rounded">
              {item.duration}
            </span>
          )}
        </div>
      )}

      <div className="p-3.5">
        <h3 className="text-[13.5px] font-medium text-ink leading-snug tracking-tightish mb-1.5 group-hover:text-accent transition-colors line-clamp-2">
          {item.title}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-ink-faint">
          {item.author && <span className="text-ink-muted">{item.author}</span>}
          {item.author && <span>·</span>}
          <span>{timeAgo(item.published_at)}</span>
        </div>
      </div>
    </div>
  );
}
