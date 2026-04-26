import { useEffect, useState, useCallback } from "react";
import { api, Item } from "../lib/api";
import VideoCard from "../components/VideoCard";

export default function VideosPage() {
  const [videos, setVideos] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 12;

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {
      type: "video",
      sort: "recent",
      limit: String(LIMIT),
      offset: String(offset),
    };
    if (search.length >= 2) params.search = search;

    api.getItems(params).then((res) => {
      setVideos(res.items);
      setTotal(res.total);
      setLoading(false);
    });
  }, [search, offset]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setOffset(0); }, [search]);

  return (
    <div>
      <header className="mb-8 pb-5 border-b border-line">
        <div className="eyebrow mb-2">Watch</div>
        <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">Videos worth your time</h1>
        <p className="text-ink-muted text-[14px] max-w-xl">
          Tutorials, conference talks and product demos pulled from the channels
          that actually ship signal.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <input
            type="text"
            placeholder="Search videos…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-3 py-2 text-[13.5px] rounded-md border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5"
          />
        </div>
        <span className="ml-auto text-[11.5px] text-ink-faint font-mono">
          {total} videos
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-line rounded-lg animate-pulse aspect-video" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20">
          <p className="display text-[28px] text-ink-soft mb-1">No videos yet.</p>
          <p className="text-[13.5px] text-ink-muted">Trigger a fetch on the Sources page.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <VideoCard key={video.id} item={video} />
            ))}
          </div>

          {total > LIMIT && (
            <div className="flex justify-center items-center gap-4 mt-10">
              <button
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                disabled={offset === 0}
                className="px-4 py-2 text-[13px] rounded-md border border-line bg-surface text-ink-soft hover:border-ink/30 hover:text-ink disabled:opacity-30 disabled:hover:border-line transition-colors"
              >
                ← Previous
              </button>
              <span className="text-[12px] text-ink-faint font-mono">
                {Math.floor(offset / LIMIT) + 1} / {Math.ceil(total / LIMIT)}
              </span>
              <button
                onClick={() => setOffset(offset + LIMIT)}
                disabled={offset + LIMIT >= total}
                className="px-4 py-2 text-[13px] rounded-md border border-line bg-surface text-ink-soft hover:border-ink/30 hover:text-ink disabled:opacity-30 disabled:hover:border-line transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

