import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { searchIndex, type SearchItem } from "../lib/searchIndex";
import { api } from "../lib/api";

const TYPE_LABELS: Record<string, string> = {
  page: "Page",
  guide: "Guide",
  topic: "Topic",
  tool: "Tool",
  external: "External",
  item: "Feed",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [feedResults, setFeedResults] = useState<SearchItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Static index (pages, guides, topics, tools) + live feed content search.
  const staticResults = query ? searchIndex(query, 6) : [];
  const results = query ? [...staticResults, ...feedResults] : [];

  // Live search over feed items (title/description) via the backend.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setFeedResults([]); return; }
    let ignore = false;
    const t = setTimeout(() => {
      api.getItems({ search: q, sort: "top", limit: "6" })
        .then((res) => {
          if (ignore) return;
          setFeedResults(
            res.items.map((it) => ({
              title: it.title,
              desc: [it.source_name || it.platform, it.topic_name].filter(Boolean).join(" · "),
              path: "",
              type: "item" as const,
              url: it.url,
            }))
          );
        })
        .catch(() => { if (!ignore) setFeedResults([]); });
    }, 220);
    return () => { ignore = true; clearTimeout(t); };
  }, [query]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.children[activeIdx] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const go = useCallback(
    (item: SearchItem) => {
      if ((item.type === "external" || item.type === "item") && item.url) {
        window.open(item.url, "_blank", "noopener");
      } else {
        navigate(item.path);
      }
      onClose();
    },
    [navigate, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIdx]) {
      e.preventDefault();
      go(results[activeIdx]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative mx-auto mt-[8vh] sm:mt-[15vh] w-[92vw] sm:w-[90vw] max-w-lg">
        <div className="bg-surface border border-line rounded-xl shadow-cardHover overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 border-b border-line">
            <Icon name="search" size={16} className="text-ink-faint shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search feed, pages, guides, topics..."
              className="flex-1 py-3.5 bg-transparent text-ink text-[14px] placeholder:text-ink-faint outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-paper border border-line text-[10px] font-mono text-ink-faint">
              ESC
            </kbd>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div ref={listRef} className="max-h-[55vh] sm:max-h-[50vh] overflow-y-auto py-1">
              {results.map((r, i) => (
                <button
                  key={r.path || r.url}
                  onClick={() => go(r)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === activeIdx ? "bg-paper" : ""
                  }`}
                >
                  <Icon
                    name={
                      r.type === "page"
                        ? "home"
                        : r.type === "guide"
                        ? "book"
                        : r.type === "topic"
                        ? "layers"
                        : r.type === "item"
                        ? "rss"
                        : r.type === "external"
                        ? "external"
                        : "wrench"
                    }
                    size={14}
                    className="text-ink-faint shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-ink truncate">
                      {r.title}
                    </div>
                    <div className="text-[11px] text-ink-muted truncate">
                      {r.desc}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-mono text-ink-faint shrink-0">
                    {TYPE_LABELS[r.type]}
                  </span>
                  {(r.type === "external" || r.type === "item") && (
                    <Icon name="external" size={12} className="text-ink-faint shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-ink-muted">
                No results for "<span className="text-ink">{query}</span>"
              </p>
              <p className="text-[11px] text-ink-faint mt-1">
                Try searching for a guide, topic, or tool name
              </p>
            </div>
          )}

          {/* Idle hints */}
          {!query.trim() && (
            <div className="px-4 py-4">
              <p className="text-[11px] text-ink-faint mb-3">Quick links</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { label: "Dashboard", path: "/" },
                  { label: "Chat", path: "/chat" },
                  { label: "Knowledge", path: "/knowledge" },
                  { label: "Dev Hub", path: "/devhub" },
                  { label: "Events", path: "/events" },
                  { label: "Topics", path: "/topics" },
                ].map((link) => (
                  <button
                    key={link.path}
                    onClick={() => { navigate(link.path); onClose(); }}
                    className="text-left px-3 py-2 rounded-md text-[12px] text-ink-soft hover:bg-paper hover:text-ink transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2 border-t border-line flex items-center gap-4 text-[10px] text-ink-faint font-mono">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>esc close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
