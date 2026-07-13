import { useEffect, useState } from "react";
import { api, Source, FetchStats } from "../lib/api";
import { timeAgo } from "../lib/utils";
import { useAuth } from "../context/AuthContext";

export default function SourcesPage() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
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
      const fresh = await api.getSources();
      setSources(fresh);
    } catch (err) {
      console.error("Fetch failed:", err);
    }
    setFetching(null);
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-2.5">
        <div className="h-10 w-1/2 bg-line/70 rounded mb-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-surface border border-line rounded-md" />
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
      <header className="mb-8 pb-5 border-b border-line flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="eyebrow mb-2">Pipeline</div>
          <h1 className="display text-[26px] sm:text-[32px] md:text-[38px] text-ink mb-2">Sources</h1>
          <p className="text-ink-muted text-[14px]">
            <span className="text-ink font-medium">{sources.filter((s) => s.is_active).length}</span> active
            <span className="text-ink-faint mx-1.5">/</span>
            {sources.length} total
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => handleFetch()}
            disabled={!!fetching}
            className="px-4 py-2 bg-ink text-paper text-[13px] font-medium rounded-md hover:bg-ink-soft disabled:opacity-50 transition-colors inline-flex items-center gap-2 self-start"
          >
            {fetching === "all" ? "Fetching…" : "Fetch all sources now"}
          </button>
        )}
      </header>

      {lastFetch && (
        <div className="mb-6 p-3 rounded-md bg-accent-soft border border-accent/20 text-[13px] text-accent">
          <strong className="font-medium">Done.</strong>{" "}
          {lastFetch.sourcesProcessed} sources · {lastFetch.itemsFetched} fetched ·{" "}
          <strong className="font-medium">{lastFetch.itemsInserted} new</strong>
          {lastFetch.errors.length > 0 && (
            <div className="mt-1.5 text-rose-600">
              Errors: {lastFetch.errors.join("; ")}
            </div>
          )}
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([platform, srcs]) => (
            <section key={platform}>
              <div className="flex items-end justify-between mb-3 pb-2 border-b border-line">
                <div>
                  <div className="eyebrow">{srcs.length} feed{srcs.length === 1 ? "" : "s"}</div>
                  <h2 className="display text-[20px] text-ink leading-none">{platform}</h2>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleFetch(srcs[0].fetcher_key)}
                    disabled={!!fetching}
                    className="text-[11.5px] uppercase tracking-wider px-2.5 py-1 rounded border border-line text-ink-soft hover:border-ink/30 hover:text-ink disabled:opacity-30 transition-colors"
                  >
                    {fetching === srcs[0].fetcher_key ? "…" : "Fetch"}
                  </button>
                )}
              </div>
              <div className="divide-y divide-line bg-surface border border-line rounded-md overflow-hidden">
                {srcs.map((src) => (
                  <div
                    key={src.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-paper transition-colors"
                  >
                    {isAdmin ? (
                      <button
                        onClick={() => handleToggle(src)}
                        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                          src.is_active ? "bg-accent" : "bg-line"
                        }`}
                        aria-label={src.is_active ? "Deactivate" : "Activate"}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-surface rounded-full shadow-sm transition-transform ${
                            src.is_active ? "left-[18px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    ) : (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ml-3.5 ${
                          src.is_active ? "bg-accent" : "bg-line"
                        }`}
                      />
                    )}
                    <span
                      className={`text-[13.5px] flex-1 min-w-0 truncate ${
                        src.is_active ? "text-ink" : "text-ink-faint"
                      }`}
                    >
                      {src.name}
                    </span>
                    <span className="hidden sm:block text-[11px] text-ink-faint font-mono w-16 text-right shrink-0">
                      {src.item_count} items
                    </span>
                    <span className="text-[11px] text-ink-faint w-14 sm:w-20 text-right shrink-0">
                      {src.last_fetched ? timeAgo(src.last_fetched) : "never"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}

