import { useEffect, useState, useCallback } from "react";
import { api, Item } from "../lib/api";
import FeedItem from "../components/FeedItem";
import { useRole, type DevRole } from "../components/RoleSelector";
import { useAuth } from "../context/AuthContext";

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

// Suggested search terms per role for quick filtering
const ROLE_SUGGESTIONS: Record<DevRole, string[]> = {
  developer: ["Claude Code", "Copilot", "RAG", "LLM API", "agentic"],
  pm: ["model release", "benchmark", "enterprise AI", "pricing"],
  designer: ["v0", "Figma AI", "multimodal", "design tools"],
  qa: ["eval", "hallucination", "prompt injection", "testing"],
};

export default function FeedPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [platform, setPlatform] = useState("");
  const [sort, setSort] = useState("top");
  const [offset, setOffset] = useState(0);
  const [hideSeen, setHideSeen] = useState(false);
  const { role } = useRole();
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
    if (hideSeen && user) params.hide_seen = "true";

    api.getItems(params).then((res) => {
      setItems(res.items);
      setTotal(res.total);
      setLoading(false);
    });
  }, [sort, type, platform, search, offset, hideSeen, user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setOffset(0); }, [sort, type, platform, search]);

  return (
    <div>
      <header className="mb-8 pb-4 border-b border-line">
        <div className="eyebrow mb-2">Stream</div>
        <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">The full feed</h1>
        <p className="text-ink-muted text-[14px] max-w-xl">
          Everything we've pulled, in chronological or popularity order. Filter, search, dive in.
        </p>
        {/* Role quick-search chips */}
        {role && ROLE_SUGGESTIONS[role] && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            <span className="text-[11px] text-ink-faint self-center">Quick:</span>
            {ROLE_SUGGESTIONS[role].map((s) => (
              <button
                key={s}
                onClick={() => setSearch(s)}
                className={`text-[11.5px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  search === s
                    ? "bg-accent-soft border-accent/30 text-accent"
                    : "border-line text-ink-muted hover:border-ink/30 hover:text-ink"
                }`}
              >
                {s}
              </button>
            ))}
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-[11px] text-ink-faint hover:text-ink transition-colors px-1"
              >
                ✕ clear
              </button>
            )}
          </div>
        )}
      </header>

      {/* Filters bar */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between border-b border-line">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`px-3 py-2 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                  type === t.value
                    ? "text-ink border-ink"
                    : "text-ink-muted border-transparent hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-px bg-paper border border-line rounded-md p-0.5 ml-2 shrink-0">
            <button
              onClick={() => setSort("top")}
              className={`px-3 py-1 text-[11.5px] font-medium uppercase tracking-wider rounded transition-colors ${
                sort === "top" ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
              }`}
            >
              Top
            </button>
            <button
              onClick={() => setSort("recent")}
              className={`px-3 py-1 text-[11.5px] font-medium uppercase tracking-wider rounded transition-colors ${
                sort === "recent" ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
              }`}
            >
              New
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <input
              type="text"
              placeholder="Search papers, repos, posts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-[13.5px] rounded-md border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5"
            />
          </div>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="text-[13px] px-3 py-2 rounded-md border border-line bg-surface text-ink-soft focus:outline-none focus:border-ink/40"
          >
            {PLATFORMS.map(p => (
              <option key={p} value={p}>{p || "All sources"}</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <button
                onClick={() => setHideSeen(h => !h)}
                className={`text-[11.5px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  hideSeen
                    ? "bg-accent/10 border-accent/30 text-accent"
                    : "border-line text-ink-muted hover:border-ink/30 hover:text-ink"
                }`}
              >
                {hideSeen ? "Showing unseen" : "Hide seen"}
              </button>
            )}
            <span className="text-[11.5px] text-ink-faint font-mono">
              {items.length} / {total}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-surface border border-line rounded-lg animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="display text-[28px] text-ink-soft mb-1">Nothing here yet.</p>
          <p className="text-[13.5px] text-ink-muted">
            {search ? "Try a different search." : "Trigger a fetch from the Sources page."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2.5">
            {items.map((item) => (
              <FeedItem key={item.id} item={item} showTopic />
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
