import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Topic } from "../lib/api";
import { timeAgo } from "../lib/utils";

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTopics().then(setTopics).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;

  const withItems = topics.filter((t) => t.item_count > 0);
  const empty = topics.filter((t) => t.item_count === 0);
  const totalItems = withItems.reduce((s, t) => s + t.item_count, 0);

  // Group by category for editorial layout
  const byCategory = withItems.reduce((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {} as Record<string, Topic[]>);

  return (
    <div>
      <header className="mb-10 pb-5 border-b border-line">
        <div className="eyebrow mb-2">Index</div>
        <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">
          {topics.length} topics, <span className="italic text-ink-soft">tracked closely.</span>
        </h1>
        <p className="text-ink-muted text-[14px]">
          {totalItems.toLocaleString()} items across {Object.keys(byCategory).length} categories.
        </p>
      </header>

      <div className="space-y-10">
        {Object.entries(byCategory)
          .sort(([, a], [, b]) =>
            b.reduce((s, t) => s + t.item_count, 0) - a.reduce((s, t) => s + t.item_count, 0)
          )
          .map(([category, list]) => (
            <section key={category}>
              <div className="eyebrow mb-3 flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: list[0].category_color }}
                />
                {category}
                <span className="text-ink-faint normal-case tracking-normal">
                  · {list.length} topics
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {list
                  .sort((a, b) => b.item_count - a.item_count)
                  .map((t) => (
                    <Link
                      key={t.id}
                      to={`/topic/${t.slug}`}
                      className="group block bg-surface rounded-lg border border-line p-4 hover:border-ink/30 hover:shadow-card transition-all"
                    >
                      <div className="flex items-start justify-between mb-1.5 gap-3">
                        <h3 className="font-medium text-[14px] text-ink leading-snug group-hover:text-accent transition-colors min-w-0 truncate">
                          {t.name}
                        </h3>
                        <span className="text-[11px] font-mono text-ink-faint shrink-0">
                          {t.item_count}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-[12.5px] text-ink-muted line-clamp-2 mb-2 leading-relaxed">
                          {t.description}
                        </p>
                      )}
                      {t.latest_item_at && (
                        <span className="text-[10.5px] uppercase tracking-wider text-ink-faint">
                          updated {timeAgo(t.latest_item_at)}
                        </span>
                      )}
                    </Link>
                  ))}
              </div>
            </section>
          ))}
      </div>

      {empty.length > 0 && (
        <details className="mt-12 pt-5 border-t border-line text-[12px] text-ink-faint">
          <summary className="cursor-pointer hover:text-ink transition-colors">
            {empty.length} topics still waiting for content
          </summary>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {empty.map((t) => (
              <span
                key={t.id}
                className="text-[11px] text-ink-muted font-mono"
              >
                #{t.slug}
              </span>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-10 pb-5 border-b border-line">
        <div className="h-3 w-20 bg-line rounded mb-3" />
        <div className="h-10 w-2/3 bg-line/70 rounded mb-3" />
        <div className="h-4 w-48 bg-line/60 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface border border-line rounded-lg" />
        ))}
      </div>
    </div>
  );
}

