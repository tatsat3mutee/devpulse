import { useEffect, useState, useCallback } from "react";
import { api, Item, ItemsResponse } from "../lib/api";
import FeedItem from "../components/FeedItem";

const TYPES = [
  { value: "", label: "All" },
  { value: "paper", label: "Papers" },
  { value: "repo", label: "Repos" },
  { value: "social", label: "Social" },
  { value: "news", label: "News" },
  { value: "article", label: "Articles" },
  { value: "video", label: "Videos" },
];

const PLATFORMS = ["", "arXiv", "GitHub", "Reddit", "Hacker News", "Hugging Face", "X", "LinkedIn", "YouTube", "VS Code", "OpenAI", "Anthropic", "Google", "Microsoft", "TechCrunch", "The Verge", "GNews"];

export default function FeedPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [platform, setPlatform] = useState("");
  const [sort, setSort] = useState("top");
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {
      sort,
      limit: String(LIMIT),
      offset: String(offset),
    };
    if (type) params.type = type;
    if (platform) params.platform = platform;
    if (search.length >= 2) params.search = search;

    api.getItems(params).then((res) => {
      setItems(res.items);
      setTotal(res.total);
      setLoading(false);
    });
  }, [sort, type, platform, search, offset]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setOffset(0); }, [sort, type, platform, search]);

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Feed</h1>
        <p className="text-gray-400 text-sm">Chronological feed of all AI developments</p>
      </div>

      {/* Type tabs + sort toggle */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
        <div className="flex gap-1">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-t transition-colors ${
                type === t.value
                  ? "text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setSort("top")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              sort === "top" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setSort("recent")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              sort === "recent" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Recent
          </button>
        </div>
      </div>

      {/* Search + platform filter + count */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600"
        >
          <option value="">All Types</option>
          <option value="paper">Papers</option>
          <option value="repo">Repos</option>
          <option value="social">Social</option>
          <option value="news">News</option>
        </select>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600"
        >
          {PLATFORMS.map(p => (
            <option key={p} value={p}>{p || "All Platforms"}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <p className="text-xs text-gray-400 mb-3">
        Showing {items.length} of {total} items
      </p>

      {/* Items */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-1">No items found</p>
          <p className="text-sm">
            {search ? "Try a different search" : "Trigger a fetch from Sources page"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <FeedItem key={item.id} item={item} showTopic />
            ))}
          </div>

          {/* Pagination */}
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
