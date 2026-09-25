import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, AREA_LABELS, CONCEPT_AREAS, type Concept } from "../lib/api";
import Icon from "../components/Icon";

const PAGE_SIZE = 30;

/**
 * Archive — every published concept.
 *
 * This absorbs what used to be four separate pages (Feed, Brief, Trending,
 * Model Release). Keeping it behind one nav entry is the point: the product's
 * front door is a single concept, and everything else is a place you go
 * deliberately rather than a surface competing for attention.
 */
export default function ArchivePage() {
  const [params, setParams] = useSearchParams();
  const area = params.get("area") ?? "";
  const search = params.get("search") ?? "";

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(search);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => setQuery(search), [search]);
  useEffect(() => setOffset(0), [area, search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .getConceptArchive({ area, search, limit: PAGE_SIZE, offset })
      .then((res) => {
        if (cancelled) return;
        setConcepts(res.concepts);
        setTotal(res.total);
      })
      .catch(() => {
        if (cancelled) return;
        setConcepts([]);
        setError("The archive could not be loaded.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [area, search, offset, requestVersion]);

  const setFilter = (next: Record<string, string>) => {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    setParams(merged, { replace: true });
  };

  const pages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="display text-[30px] text-ink mb-2">Archive</h1>
        <p className="text-[15px] text-ink-muted">{loading ? "Loading published concepts…" : error ? "Published concepts, with their evidence." : `${total} concept${total === 1 ? "" : "s"} extracted so far.`}</p>
      </header>

      <section className="border-y border-line py-5 mb-6" aria-labelledby="quantization-lens-title">
        <p className="eyebrow text-accent mb-2">Deployment lens</p>
        <h2 id="quantization-lens-title" className="text-[19px] font-semibold text-ink">Quantization starts with the hardware, not the bit count.</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted max-w-2xl">
          Lower precision can reduce memory, but latency improves only when the runtime and accelerator provide the matching kernel. Choose the target, verify compatibility, then measure quality and throughput on your workload.
        </p>
        <ol className="grid sm:grid-cols-3 gap-4 mt-5 text-[12.5px]">
          <li><span className="block font-mono text-accent mb-1">01 / Fit</span><span className="text-ink-muted">Set the memory and latency constraint.</span></li>
          <li><span className="block font-mono text-accent mb-1">02 / Match</span><span className="text-ink-muted">Check format, runtime and accelerator support.</span></li>
          <li><span className="block font-mono text-accent mb-1">03 / Prove</span><span className="text-ink-muted">Measure quality and speed on representative requests.</span></li>
        </ol>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mt-5 text-[12.5px]">
          <button type="button" onClick={() => setFilter({ area: "inference-serving", search: "quantization" })} className="font-medium text-accent hover:underline">Explore quantization concepts</button>
          <Link to="/feed?search=quantization&sort=recent" className="font-medium text-accent hover:underline">See recent source material</Link>
          <a href="https://huggingface.co/docs/transformers/main/en/quantization/overview" target="_blank" rel="noopener noreferrer" className="text-ink-muted hover:text-ink">Hugging Face reference</a>
          <a href="https://docs.vllm.ai/en/latest/features/quantization/" target="_blank" rel="noopener noreferrer" className="text-ink-muted hover:text-ink">vLLM hardware matrix</a>
          <a href="https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md" target="_blank" rel="noopener noreferrer" className="text-ink-muted hover:text-ink">llama.cpp GGUF guide</a>
        </div>
      </section>

      <form
        onSubmit={(e) => { e.preventDefault(); setFilter({ search: query }); }}
        className="relative mb-4"
      >
        <Icon
          name="search"
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search concepts…"
          aria-label="Search concepts"
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-line bg-surface text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink/30"
        />
      </form>

      <div className="flex flex-wrap gap-1.5 mb-8">
        <Chip active={!area} onClick={() => setFilter({ area: "" })}>All areas</Chip>
        {CONCEPT_AREAS.map((a) => (
          <Chip key={a} active={area === a} onClick={() => setFilter({ area: a })}>
            {AREA_LABELS[a]}
          </Chip>
        ))}
      </div>

      {loading ? (
        <ArchiveSkeleton />
      ) : error ? (
        <div role="alert" className="border-y border-line py-6">
          <p className="text-[14px] text-ink mb-3">{error}</p>
          <button onClick={() => setRequestVersion((version) => version + 1)} className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-white dark:text-paper">
            <Icon name="refresh" size={14} /> Try again
          </button>
        </div>
      ) : concepts.length === 0 ? (
        <p className="text-[14px] text-ink-muted py-8">
          Nothing matches that. {search && "Try a broader search."}
        </p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {concepts.map((c) => (
            <li key={c.id}>
              <Link
                to={`/concept/${c.slug}`}
                className="group block py-4 hover:bg-surface transition-colors -mx-3 px-3 rounded-lg"
              >
                <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                  <span className="eyebrow text-ink-faint">{AREA_LABELS[c.area] ?? c.area}</span>
                  {c.claim_number && (
                    <span className="font-mono text-[11px] text-accent">{c.claim_number}</span>
                  )}
                  {c.state === "got_it" && (
                    <Icon name="check" size={12} className="text-accent" />
                  )}
                </div>
                <p className="text-[15px] font-medium text-ink group-hover:text-accent transition-colors">
                  {c.title}
                </p>
                <p className="text-[13.5px] text-ink-muted mt-1 leading-relaxed">{c.hook}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && pages > 1 && (
        <nav className="flex items-center justify-between mt-8 pt-4 border-t border-line">
          <button
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            className="flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Icon name="arrow-left" size={13} /> Previous
          </button>
          <span className="text-[12px] font-mono text-ink-faint">
            {Math.floor(offset / PAGE_SIZE) + 1} / {pages}
          </span>
          <button
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            className="flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next <Icon name="arrow-right" size={13} />
          </button>
        </nav>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors ${
        active
          ? "bg-accent/10 border-accent/30 text-accent"
          : "border-line text-ink-muted hover:text-ink hover:border-ink/25"
      }`}
    >
      {children}
    </button>
  );
}

function ArchiveSkeleton() {
  return (
    <div className="animate-pulse space-y-4 border-t border-line pt-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 bg-surface rounded" />
          <div className="h-4 w-3/4 bg-surface rounded" />
          <div className="h-3 w-1/2 bg-surface rounded" />
        </div>
      ))}
    </div>
  );
}
