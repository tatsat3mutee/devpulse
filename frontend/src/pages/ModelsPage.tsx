import { useEffect, useState, useCallback } from "react";
import { api, Item, Topic, BenchmarkModel } from "../lib/api";
import ClusteredFeed from "../components/ClusteredFeed";
import { setPageMeta } from "../lib/seo";

const LIMIT = 25;
const LEADERBOARD_SIZE = 10;

function fmtPrice(v: number | null): string {
  return v === null ? "—" : `$${v.toFixed(2)}`;
}

function Leaderboard() {
  const [models, setModels] = useState<BenchmarkModel[]>([]);
  const [available, setAvailable] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api
      .getBenchmarks()
      .then((res) => setModels(res.models))
      .catch(() => setAvailable(false));
  }, []);

  if (!available || models.length === 0) return null;

  const shown = expanded ? models.slice(0, 30) : models.slice(0, LEADERBOARD_SIZE);

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="eyebrow">Benchmark leaderboard</h2>
        <a
          href="https://artificialanalysis.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-ink-faint hover:text-accent transition-colors"
        >
          Data by Artificial Analysis ↗
        </a>
      </div>
      <div
        className="bg-surface border border-line rounded-lg overflow-x-auto"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <table className="w-full text-[12.5px] min-w-[560px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow font-medium px-4 py-2.5">#</th>
              <th className="eyebrow font-medium px-2 py-2.5">Model</th>
              <th className="eyebrow font-medium px-2 py-2.5 text-right">Intelligence</th>
              <th className="eyebrow font-medium px-2 py-2.5 text-right">Coding</th>
              <th className="eyebrow font-medium px-2 py-2.5 text-right">Tok/s</th>
              <th className="eyebrow font-medium px-4 py-2.5 text-right">$/1M out</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((m, i) => (
              <tr key={m.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2 text-ink-faint tabular-nums">{i + 1}</td>
                <td className="px-2 py-2">
                  <span className="text-ink font-medium">{m.name}</span>
                  <span className="text-ink-faint ml-2 text-[11px]">{m.creator}</span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-accent font-medium">
                  {m.intelligence_index?.toFixed(1) ?? "—"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-soft">
                  {m.coding_index?.toFixed(1) ?? "—"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-soft">
                  {m.output_tokens_per_second?.toFixed(0) ?? "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-ink-soft">
                  {fmtPrice(m.price_1m_output)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {models.length > LEADERBOARD_SIZE && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-[12px] text-ink-muted hover:text-ink transition-colors"
        >
          {expanded ? "Show top 10" : `Show top 30`}
        </button>
      )}
    </section>
  );
}

export default function ModelsPage() {
  const [families, setFamilies] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("recent");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setPageMeta({
      title: "Model Watch — DevPulse",
      description:
        "Frontier model releases and updates in one place — GPT, Claude, Gemini, Kimi, DeepSeek, Qwen, Mistral, Llama and more.",
    });
  }, []);

  useEffect(() => {
    api
      .getTopics()
      .then((topics) =>
        setFamilies(
          topics
            .filter((t) => t.category === "Model Release")
            .sort((a, b) => b.item_count - a.item_count)
        )
      )
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {
      sort,
      limit: String(LIMIT),
      offset: String(offset),
    };
    if (selected) params.topic = selected;
    else params.topic_category = "Model Release";

    api
      .getItems(params)
      .then((res) => {
        setItems((prev) => (offset === 0 ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sort, selected, offset]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setOffset(0);
  }, [sort, selected]);

  return (
    <div>
      <header className="mb-8 pb-4 border-b border-line">
        <div className="eyebrow mb-2">Frontier</div>
        <h1 className="display text-[26px] sm:text-[32px] md:text-[38px] text-ink mb-2">
          Model watch
        </h1>
        <p className="text-ink-muted text-[14px] max-w-xl">
          Every frontier model release and update — Kimi, DeepSeek, Qwen, GPT,
          Grok and friends — the moment they drop.
        </p>
      </header>

      <Leaderboard />

      {/* Family chips + sort */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setSelected("")}
          className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
            selected === ""
              ? "bg-ink text-paper border-ink"
              : "border-line text-ink-muted hover:border-ink/30 hover:text-ink"
          }`}
        >
          All
        </button>
        {families.map((f) => (
          <button
            key={f.slug}
            onClick={() => setSelected(f.slug)}
            className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
              selected === f.slug
                ? "bg-accent-soft border-accent/30 text-accent"
                : "border-line text-ink-muted hover:border-ink/30 hover:text-ink"
            }`}
          >
            {f.name}
            {f.item_count > 0 && (
              <span className="ml-1.5 text-[10.5px] text-ink-faint">{f.item_count}</span>
            )}
          </button>
        ))}
        <div className="flex gap-px bg-paper border border-line rounded-md p-0.5 ml-auto shrink-0">
          <button
            onClick={() => setSort("recent")}
            className={`px-3 py-1 text-[11.5px] font-medium uppercase tracking-wider rounded transition-colors ${
              sort === "recent" ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
            }`}
          >
            New
          </button>
          <button
            onClick={() => setSort("top")}
            className={`px-3 py-1 text-[11.5px] font-medium uppercase tracking-wider rounded transition-colors ${
              sort === "top" ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
            }`}
          >
            Top
          </button>
        </div>
      </div>

      {loading && offset === 0 ? (
        <div className="space-y-2.5 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface border border-line rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-ink-muted text-[14px] py-12 text-center">
          No model updates yet — new releases will appear here after the next
          fetch cycle.
        </div>
      ) : (
        <>
          <ClusteredFeed items={items} showTopic />
          {items.length < total && (
            <div className="text-center mt-6">
              <button
                onClick={() => setOffset((o) => o + LIMIT)}
                disabled={loading}
                className="text-[12.5px] font-medium text-ink-muted hover:text-ink border border-line hover:border-ink/30 rounded-md px-4 py-2 transition-colors disabled:opacity-50"
              >
                {loading ? "Loading…" : `Load more (${total - items.length} left)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
