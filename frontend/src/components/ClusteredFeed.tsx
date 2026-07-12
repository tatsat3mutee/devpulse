import { useMemo, useState } from "react";
import type { Item } from "../lib/api";
import { clusterItems } from "../lib/cluster";
import { timeAgo } from "../lib/utils";
import FeedItem from "./FeedItem";
import Icon from "./Icon";

interface Props {
  items: Item[];
  showTopic?: boolean;
}

/** Renders a feed with near-duplicate stories collapsed into one entry
 *  with a "+N more sources" expander (Techmeme-style clustering). */
export default function ClusteredFeed({ items, showTopic }: Props) {
  const clusters = useMemo(() => clusterItems(items), [items]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-2.5">
      {clusters.map(({ primary, related }) => (
        <div key={primary.id}>
          <FeedItem item={primary} showTopic={showTopic} />
          {related.length > 0 && (
            <div className="ml-5 border-l-2 border-line pl-4 mt-1">
              <button
                onClick={() => toggle(primary.id)}
                className="flex items-center gap-1.5 py-1.5 text-[12px] text-ink-muted hover:text-ink transition-colors"
              >
                <Icon
                  name="arrow-right"
                  size={11}
                  className={`transition-transform ${expanded.has(primary.id) ? "rotate-90" : ""}`}
                />
                {related.length} more source{related.length > 1 ? "s" : ""} covering this
              </button>
              {expanded.has(primary.id) && (
                <div className="space-y-1 pb-2">
                  {related.map((r) => (
                    <a
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-baseline gap-2 py-1 text-[12.5px] group"
                    >
                      <span className="text-ink-faint shrink-0">{r.source_name || r.platform}</span>
                      <span className="text-ink-soft group-hover:text-accent truncate transition-colors">
                        {r.title}
                      </span>
                      <span className="text-[11px] text-ink-faint shrink-0 ml-auto">
                        {timeAgo(r.published_at || r.fetched_at)}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
