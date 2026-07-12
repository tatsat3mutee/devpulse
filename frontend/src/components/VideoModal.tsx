import { useEffect } from "react";
import { Item } from "../lib/api";
import Icon from "./Icon";

interface Props {
  item: Item;
  onClose: () => void;
}

/** Extract a YouTube video id from an Item's metadata or url. */
export function getYouTubeId(item: Item): string | null {
  const fromMeta = item.metadata?.videoId as string | undefined;
  if (fromMeta) return fromMeta;
  const m =
    item.url.match(/[?&]v=([^&]+)/) ||
    item.url.match(/youtu\.be\/([^?&]+)/) ||
    item.url.match(/youtube\.com\/embed\/([^?&]+)/);
  return m ? m[1] : null;
}

export function isYouTube(item: Item): boolean {
  const platform = (item.platform || "").toLowerCase();
  return (
    (platform === "youtube" || item.type === "video") && getYouTubeId(item) != null
  );
}

export default function VideoModal({ item, onClose }: Props) {
  const videoId = getYouTubeId(item);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!videoId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-ink/70 backdrop-blur-sm"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-3xl bg-surface border border-line rounded-xl overflow-hidden shadow-cardHover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-line">
          <h3 className="text-[14px] font-semibold text-ink leading-snug line-clamp-2 min-w-0">
            {item.title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 shrink-0 rounded-md flex items-center justify-center text-ink-muted hover:bg-paper hover:text-ink transition-colors"
            aria-label="Close"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="relative aspect-video bg-black">
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12px] text-ink-faint">
          <span className="truncate">{item.author || item.source_name || "YouTube"}</span>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-ink-muted hover:text-ink transition-colors shrink-0"
          >
            Open on YouTube
            <Icon name="external" size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
