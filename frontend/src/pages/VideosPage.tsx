import { useEffect, useState, useCallback, useMemo } from "react";
import { api, Item } from "../lib/api";
import VideoCard from "../components/VideoCard";

const SORT_TABS = [
  { value: "top", label: "Trending" },
  { value: "recent", label: "Latest" },
];

// Pinned creator chips — official AI labs first, then top educators.
// These match the channels seeded by backend/src/seed-sources.ts.
const FEATURED_CREATORS = [
  "Anthropic", "OpenAI", "Google DeepMind", "Hugging Face", "Meta AI",
  "AI Engineer", "Fireship",
  "Andrej Karpathy", "Two Minute Papers",
  "Yannic Kilcher", "AI Explained", "3Blue1Brown",
  "Piyush Garg", "Hitesh Choudhary", "Harkirat Singh",
];

export default function VideosPage() {
  const [videos, setVideos] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("top");
  const [creatorFilter, setCreatorFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 24;

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {
      type: "video",
      sort,
      limit: String(LIMIT),
      offset: String(offset),
    };
    const q = creatorFilter || (search.length >= 2 ? search : "");
    if (q) params.search = q;

    api.getItems(params).then((res) => {
      setVideos(res.items);
      setTotal(res.total);
      setLoading(false);
    });
  }, [search, sort, creatorFilter, offset]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setOffset(0); }, [search, sort, creatorFilter]);

  // Merge featured creators with anyone showing up in the loaded videos,
  // so chips never disappear just because the current page has no items
  // from that creator.
  const creators = useMemo(() => {
    const seen = new Map<string, number>();
    for (const c of FEATURED_CREATORS) seen.set(c, 0);
    for (const v of videos) {
      if (v.author) seen.set(v.author, (seen.get(v.author) || 0) + 1);
    }
    return Array.from(seen.entries())
      .sort((a, b) => {
        // Featured first (in declared order), then by frequency in loaded items
        const ai = FEATURED_CREATORS.indexOf(a[0]);
        const bi = FEATURED_CREATORS.indexOf(b[0]);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return b[1] - a[1];
      })
      .slice(0, 14)
      .map(([name]) => name);
  }, [videos]);

  return (
    <div>
      <header className="mb-8 pb-5 border-b border-line">
        <div className="eyebrow mb-2">Watch</div>
        <h1 className="display text-[26px] sm:text-[32px] md:text-[38px] text-ink mb-2">AI on video</h1>
        <p className="text-ink-muted text-[14px] max-w-xl">
          Talks, tutorials and demos straight from Anthropic, OpenAI, DeepMind, Hugging Face,
          AI Engineer, plus the researchers actually shipping AI.
        </p>
      </header>

      {/* Sort + search bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-px bg-paper border border-line rounded-md p-0.5">
          {SORT_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setSort(t.value)}
              className={`px-3 py-1 text-[12px] font-medium rounded transition-colors ${
                sort === t.value ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[160px] max-w-sm">
          <input
            type="text"
            placeholder="Search videos…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCreatorFilter(""); }}
            className="w-full px-3 py-2 text-[13.5px] rounded-md border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink/40"
          />
        </div>
        <span className="ml-auto text-[11.5px] text-ink-faint font-mono shrink-0">
          {total} videos
        </span>
      </div>

      {/* Creator chips — featured + live */}
      {creators.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          <span className="text-[11px] text-ink-faint self-center mr-1">By creator:</span>
          {creators.map((c) => (
            <button
              key={c}
              onClick={() => setCreatorFilter(creatorFilter === c ? "" : c)}
              className={`text-[11.5px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                creatorFilter === c
                  ? "bg-accent/15 border-accent/30 text-accent"
                  : "border-line text-ink-muted hover:border-ink/30 hover:text-ink"
              }`}
            >
              {c}
            </button>
          ))}
          {creatorFilter && (
            <button
              onClick={() => setCreatorFilter("")}
              className="text-[11px] text-ink-faint hover:text-ink transition-colors px-1"
            >
              ✕ clear
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video) => (
              <VideoCard key={video.id} item={video} />
            ))}
          </div>

          {total > LIMIT && (
            <div className="flex justify-center items-center gap-4 mt-10">
              <button
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                disabled={offset === 0}
                className="px-4 py-2 text-[13px] rounded-md border border-line bg-surface text-ink-soft hover:border-ink/30 hover:text-ink disabled:opacity-30 transition-colors"
              >
                ← Previous
              </button>
              <span className="text-[12px] text-ink-faint font-mono">
                {Math.floor(offset / LIMIT) + 1} / {Math.ceil(total / LIMIT)}
              </span>
              <button
                onClick={() => setOffset(offset + LIMIT)}
                disabled={offset + LIMIT >= total}
                className="px-4 py-2 text-[13px] rounded-md border border-line bg-surface text-ink-soft hover:border-ink/30 hover:text-ink disabled:opacity-30 transition-colors"
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
