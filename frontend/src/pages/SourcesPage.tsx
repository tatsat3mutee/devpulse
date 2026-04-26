import { useEffect, useState } from "react";
import { api, Source, FetchStats } from "../lib/api";
import { timeAgo } from "../lib/utils";

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<FetchStats | null>(null);

  useEffect(() => {
    api.getSources().then(setSources).finally(() => setLoading(false));
  }, []);

  async function handleToggle(src: Source) {
    const updated = await api.toggleSourceActive(src.id, !src.is_active);
    setSources((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
    );
  }

  async function handleFetch(fetcherKey?: string) {
    const label = fetcherKey || "all";
    setFetching(label);
    setLastFetch(null);
    try {
      const stats = await api.triggerFetch(fetcherKey);
      setLastFetch(stats);
      // Reload sources to get updated last_fetched
      const fresh = await api.getSources();
      setSources(fresh);
    } catch (err) {
      console.error("Fetch failed:", err);
    }
    setFetching(null);
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  const grouped = sources.reduce(
    (acc, s) => {
      (acc[s.platform] = acc[s.platform] || []).push(s);
      return acc;
    },
    {} as Record<string, Source[]>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Sources</h1>
          <p className="text-gray-500 text-sm">
            {sources.filter((s) => s.is_active).length} active /{" "}
            {sources.length} total
          </p>
        </div>
        <button
          onClick={() => handleFetch()}
          disabled={!!fetching}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {fetching === "all" ? "Fetching…" : "⚡ Fetch All Now"}
        </button>
      </div>

      {/* Last fetch result */}
      {lastFetch && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm">
          <strong>Fetch complete:</strong> {lastFetch.sourcesProcessed} sources
          processed, {lastFetch.itemsFetched} fetched,{" "}
          <strong>{lastFetch.itemsInserted} new items</strong>
          {lastFetch.errors.length > 0 && (
            <div className="mt-1 text-red-600">
              Errors: {lastFetch.errors.join("; ")}
            </div>
          )}
        </div>
      )}

      {/* Sources by platform */}
      <div className="space-y-6">
        {Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([platform, srcs]) => (
            <div key={platform}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-sm text-gray-700">
                  {platform} ({srcs.length})
                </h2>
                <button
                  onClick={() => handleFetch(srcs[0].fetcher_key)}
                  disabled={!!fetching}
                  className="text-xs px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-30"
                >
                  {fetching === srcs[0].fetcher_key ? "…" : "Fetch"}
                </button>
              </div>
              <div className="space-y-1">
                {srcs.map((src) => (
                  <div
                    key={src.id}
                    className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-gray-100 hover:border-gray-200"
                  >
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(src)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${
                        src.is_active ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          src.is_active ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </button>

                    {/* Name */}
                    <span
                      className={`text-sm flex-1 ${
                        src.is_active ? "text-gray-800" : "text-gray-400"
                      }`}
                    >
                      {src.name}
                    </span>

                    {/* Item count */}
                    <span className="text-xs text-gray-400 w-16 text-right">
                      {src.item_count} items
                    </span>

                    {/* Last fetched */}
                    <span className="text-xs text-gray-400 w-20 text-right">
                      {src.last_fetched ? timeAgo(src.last_fetched) : "never"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
