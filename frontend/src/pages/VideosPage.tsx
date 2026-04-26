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
      <div className="mb-5">
        <h1 className="text-2xl font-bold">AI Videos</h1>
        <p className="text-gray-400 text-sm">Latest AI tutorials, reviews, and tech talks from YouTube</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
          />
        </div>
        <span className="text-xs text-gray-400">{total} videos</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl animate-pulse aspect-video" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🎬</p>
          <p className="text-lg mb-1">No videos yet</p>
          <p className="text-sm">Trigger a fetch to load YouTube content</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <VideoCard key={video.id} item={video} />
            ))}
          </div>

          {total > LIMIT && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                disabled={offset === 0}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-500">
                {Math.floor(offset / LIMIT) + 1} / {Math.ceil(total / LIMIT)}
              </span>
              <button
                onClick={() => setOffset(offset + LIMIT)}
                disabled={offset + LIMIT >= total}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 transition-colors"
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
