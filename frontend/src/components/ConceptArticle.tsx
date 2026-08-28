import { useCallback, useState } from "react";
import { api, AREA_LABELS, type Concept, type ConceptSources } from "../lib/api";
import { InlineMarkdown, Markdown } from "../lib/markdown";
import Icon from "./Icon";

/**
 * The reading surface for one concept, shared by Today and the single-concept
 * page so the two can't drift apart. Layout order is the anatomy the product is
 * built around: hook → mechanism → why it matters → receipts → post draft.
 */
export default function ConceptArticle({
  concept,
  sources,
  canDispose = false,
}: {
  concept: Concept;
  sources?: ConceptSources;
  canDispose?: boolean;
}) {
  const [disposed, setDisposed] = useState<string | null>(
    concept.state && concept.state !== "served" ? concept.state : null
  );
  const [copied, setCopied] = useState(false);

  const dispose = useCallback(
    async (state: "got_it" | "not_for_me" | "want_to_post") => {
      const previous = disposed;
      setDisposed(state);
      try {
        await api.setConceptState(concept.id, state);
      } catch {
        setDisposed(previous);
      }
    },
    [concept.id, disposed]
  );

  const copyPost = useCallback(async () => {
    if (!concept.post_draft) return;
    await navigator.clipboard.writeText(concept.post_draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (canDispose && !disposed) dispose("want_to_post");
  }, [concept.post_draft, canDispose, disposed, dispose]);

  return (
    <article className="max-w-[42rem]">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="eyebrow text-accent">{AREA_LABELS[concept.area] ?? concept.area}</span>
          <span className="text-ink-faint/40">·</span>
          <span className="text-[11px] text-ink-faint uppercase tracking-wider">
            {concept.difficulty}
          </span>
        </div>

        <h1 className="display text-[30px] sm:text-[38px] leading-[1.15] text-ink mb-4">
          {concept.title}
        </h1>

        <p className="text-[17px] leading-relaxed text-ink-muted">{concept.hook}</p>

        {concept.claim_number && (
          <p className="mt-5 inline-block font-mono text-[13px] font-medium text-accent bg-accent/10 rounded-md px-2.5 py-1">
            {concept.claim_number}
          </p>
        )}
      </header>

      <Markdown text={concept.mechanism} className="mb-8" />

      {/* The interpretive block. It is NOT NULL in the schema for a reason:
          without it this is just a shorter feed. */}
      <section className="border-l-2 border-accent bg-accent/[0.06] rounded-r-lg px-5 py-4 mb-8">
        <p className="eyebrow text-accent mb-2">Why this matters</p>
        <p className="text-[15px] leading-[1.7] text-ink-soft">
          <InlineMarkdown text={concept.why_it_matters} />
        </p>
      </section>

      {concept.transfer && (
        <section className="mb-8">
          <p className="eyebrow text-ink-faint mb-2">Where else this shows up</p>
          <p className="text-[15px] leading-[1.7] text-ink-soft">
            <InlineMarkdown text={concept.transfer} />
          </p>
        </section>
      )}

      {sources && <Receipts sources={sources} />}

      {concept.post_draft && (
        <section className="mt-10 border border-line rounded-xl bg-surface p-5">
          <div className="flex items-center justify-between mb-3 gap-3">
            <p className="eyebrow text-ink-faint">If you want to post it</p>
            <button
              onClick={copyPost}
              className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-md border border-line text-ink-muted hover:text-ink hover:border-ink/30 transition-colors shrink-0"
            >
              <Icon name={copied ? "check" : "copy"} size={12} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-[14px] leading-[1.7] text-ink-soft whitespace-pre-wrap">
            {concept.post_draft}
          </p>
        </section>
      )}

      {canDispose && <Disposition disposed={disposed} onDispose={dispose} />}
    </article>
  );
}

function Receipts({ sources }: { sources: ConceptSources }) {
  const all = [
    ...sources.links.map((l) => ({ label: l.label, url: l.url, tag: "source" })),
    ...sources.items.map((i) => ({ label: i.title, url: i.url, tag: i.platform })),
  ];
  if (all.length === 0) return null;

  return (
    <section className="mb-2">
      <p className="eyebrow text-ink-faint mb-3">Receipts</p>
      <ul className="space-y-2">
        {all.map((s) => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2 text-[13.5px] text-ink-muted hover:text-ink transition-colors"
            >
              <Icon
                name="arrow-right"
                size={12}
                className="mt-1 shrink-0 text-ink-faint group-hover:text-accent transition-colors"
              />
              <span className="min-w-0">
                {s.label}
                <span className="text-ink-faint ml-1.5 text-[12px]">{s.tag}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Every served concept must reach a terminal state — see Readwise-style triage. */
function Disposition({
  disposed,
  onDispose,
}: {
  disposed: string | null;
  onDispose: (s: "got_it" | "not_for_me") => void;
}) {
  if (disposed) {
    return (
      <div className="mt-10 pt-6 border-t border-line flex items-center gap-2 text-[13px] text-ink-muted">
        <Icon name="check" size={14} className="text-accent" />
        {disposed === "got_it" && "Marked as understood — it won't come back."}
        {disposed === "not_for_me" && "Noted — less of this."}
        {disposed === "want_to_post" && "Saved to post."}
      </div>
    );
  }

  return (
    <div className="mt-10 pt-6 border-t border-line flex flex-wrap gap-2.5">
      <button
        onClick={() => onDispose("got_it")}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink text-paper text-[13px] font-medium hover:bg-ink-soft transition-colors"
      >
        <Icon name="check" size={14} /> Got it
      </button>
      <button
        onClick={() => onDispose("not_for_me")}
        className="px-4 py-2.5 rounded-lg border border-line text-ink-muted text-[13px] font-medium hover:text-ink hover:border-ink/30 transition-colors"
      >
        Not for me
      </button>
    </div>
  );
}
