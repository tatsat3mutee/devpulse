import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { searchIndex, type SearchItem } from "../lib/searchIndex";

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const QUICK_ACTIONS = [
  { icon: "💬", label: "Chat", desc: "Ask DevPulse AI anything", path: "/chat" },
  { icon: "🏠", label: "Dashboard", desc: "See what's trending today", path: "/" },
  { icon: "📡", label: "Feed", desc: "Browse 674+ AI items", path: "/feed" },
  { icon: "📖", label: "Guides", desc: "19 in-depth learning guides", path: "/knowledge" },
  { icon: "🛠️", label: "Dev Hub", desc: "17 AI developer tools", path: "/devhub" },
  { icon: "🗂️", label: "Topics", desc: "49 curated AI topics", path: "/topics" },
];

const POPULAR_SEARCHES = [
  { q: "How do I get started with Copilot?", path: "/knowledge/getting-started-copilot" },
  { q: "What is context engineering?", path: "/knowledge/context-engineering" },
  { q: "How does Agent Mode work?", path: "/knowledge/copilot-agent-mode" },
  { q: "What are MCP servers?", path: "/knowledge/mcp-guide" },
  { q: "How do I start vibe coding?", path: "/knowledge/vibe-coding" },
  { q: "What are AI evals?", path: "/knowledge/ai-evals-harness" },
];

const FAQ: { q: string; a: string; link?: { label: string; path: string } }[] = [
  {
    q: "What is DevPulse?",
    a: "DevPulse is an AI developer portal that aggregates news from 7+ platforms (arXiv, GitHub, Reddit, HN, Hugging Face, X, LinkedIn) and scores items by engagement + recency. It includes curated guides, dev tools, and learning paths.",
    link: { label: "Go to Dashboard", path: "/" },
  },
  {
    q: "How often is content updated?",
    a: "Fetchers run on a 60-minute cron cycle. Each cycle pulls from all active sources, scores items, classifies them into topics via LLM, and optionally generates summaries.",
  },
  {
    q: "What AI tools does DevPulse cover?",
    a: "GitHub Copilot, Claude Code, Codex, OpenRouter, Hugging Face, Mistral AI, LangSmith, Inspect AI, v0, bolt.new, CrewAI, Guardrails AI, and more.",
    link: { label: "Explore Dev Hub", path: "/devhub" },
  },
  {
    q: "How do I pick a learning path?",
    a: "Visit the Learning Paths page - choose from 6 AI career roles (AI Engineer, ML Engineer, AI Coding Power User, Prompt Engineer, AI Safety, Full-Stack Builder). Each has a 3-phase roadmap with topics, guides, and external resources.",
    link: { label: "View Knowledge Guides", path: "/knowledge" },
  },
  {
    q: "Where do I find AI research papers?",
    a: "The Feed page aggregates arXiv papers alongside GitHub repos, Reddit posts, and HN discussions. Filter by platform type to isolate research papers.",
    link: { label: "Browse Feed", path: "/feed" },
  },
  {
    q: "What topics are available?",
    a: "49 topics including: Context Engineering, RAG, Agentic Patterns, Vibe Coding, GitHub Copilot, Fine-tuning, AI Safety, Prompt Engineering, AI Evals, Azure AI, AWS AI, Cloud AI, and many more.",
    link: { label: "View All Topics", path: "/topics" },
  },
];

const AI_RESOURCES = [
  { icon: "🤖", title: "GitHub Copilot Docs", url: "https://docs.github.com/en/copilot", desc: "Official documentation" },
  { icon: "🧠", title: "Anthropic Docs", url: "https://docs.anthropic.com", desc: "Claude & safety research" },
  { icon: "⚡", title: "OpenAI Platform", url: "https://platform.openai.com/docs", desc: "GPT APIs & guides" },
  { icon: "🤗", title: "Hugging Face", url: "https://huggingface.co/docs", desc: "Models & datasets" },
  { icon: "🔗", title: "LangChain", url: "https://docs.langchain.com", desc: "LLM app framework" },
  { icon: "📊", title: "DeepLearning.AI", url: "https://www.deeplearning.ai/short-courses/", desc: "Free short courses" },
];

const KEYBOARD_SHORTCUTS = [
  { keys: ["Ctrl", "K"], desc: "Quick search (any page)" },
  { keys: ["↻"], desc: "Refresh data from sources" },
  { keys: ["←", "→"], desc: "Navigate between pages" },
];

const TYPE_BADGE: Record<string, { label: string }> = {
  page: { label: "Page" },
  guide: { label: "Guide" },
  topic: { label: "Topic" },
  tool: { label: "Tool" },
  external: { label: "External" },
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = searchIndex(query, 8).filter((r) => r.type !== "external");

  return (
    <div className="pb-8">
      <header className="mb-8 pb-5 border-b border-line">
        <div className="eyebrow mb-2">Help</div>
        <h1 className="display text-[26px] sm:text-[32px] md:text-[38px] text-ink mb-2">
          How can we <span className="italic text-ink-soft">help?</span>
        </h1>
        <p className="text-ink-muted text-[14px] mb-5">
          Search DevPulse guides, topics, tools, and pages.
        </p>

        <div className="relative max-w-2xl">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guides, topics, tools…"
            className="w-full pl-9 pr-9 py-2.5 rounded-md bg-surface border border-line text-ink placeholder:text-ink-faint text-[13.5px] focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5 transition-all"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink text-[12px]"
            >
              ✕
            </button>
          )}

          {results.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-surface border border-line rounded-md shadow-cardHover overflow-hidden z-10">
              {results.map((r: SearchItem) => (
                <Link
                  key={r.path}
                  to={r.path}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-paper transition-colors border-b border-line last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-ink truncate">{r.title}</div>
                    <div className="text-[11px] text-ink-muted truncate">{r.desc}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-mono text-ink-faint">
                    {TYPE_BADGE[r.type]?.label}
                  </span>
                  <span className="text-ink-faint text-[12px]">→</span>
                </Link>
              ))}
            </div>
          )}
          {query.trim() && results.length === 0 && (
            <div className="mt-2 text-[12px] text-ink-muted">
              No results for "<span className="text-ink">{query}</span>".
            </div>
          )}
        </div>
      </header>

      {/* ── Quick Actions ── */}
      <section className="mb-10">
        <div className="eyebrow mb-3">Quick access</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.path}
              to={a.path}
              className="group p-3 rounded-lg bg-surface border border-line hover:border-ink/30 hover:shadow-card transition-all"
            >
              <div className="text-[13px] font-medium text-ink group-hover:text-accent transition-colors">
                {a.label}
              </div>
              <div className="text-[10.5px] text-ink-muted mt-1 leading-tight">{a.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Popular Searches ── */}
      <section className="mb-10">
        <div className="eyebrow mb-3">Popular questions</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {POPULAR_SEARCHES.map((s) => (
            <Link
              key={s.path}
              to={s.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-paper transition-colors group"
            >
              <span className="text-ink-faint group-hover:text-accent transition-colors text-[12px]">→</span>
              <span className="text-[13px] text-ink-soft group-hover:text-ink transition-colors flex-1">
                {s.q}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mb-10">
        <div className="eyebrow mb-3">Frequently asked</div>
        <div className="divide-y divide-line bg-surface border border-line rounded-lg overflow-hidden">
          {FAQ.map((f, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-paper transition-colors"
              >
                <span className="text-[13.5px] font-medium text-ink">{f.q}</span>
                <span
                  className={`text-ink-faint transition-transform duration-200 text-[12px] ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                >
                  ⌄
                </span>
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 -mt-1">
                  <p className="text-[12.5px] text-ink-soft leading-relaxed">{f.a}</p>
                  {f.link && (
                    <Link
                      to={f.link.path}
                      className="inline-flex items-center gap-1 mt-2 text-[12px] text-accent hover:underline font-medium"
                    >
                      {f.link.label} →
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Resources + Shortcuts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div>
          <div className="eyebrow mb-3">External docs</div>
          <div className="divide-y divide-line bg-surface border border-line rounded-lg overflow-hidden">
            {AI_RESOURCES.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-paper transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-ink group-hover:text-accent transition-colors">
                    {r.title}
                  </div>
                  <div className="text-[11px] text-ink-muted">{r.desc}</div>
                </div>
                <span className="text-ink-faint group-hover:text-accent text-[12px]">↗</span>
              </a>
            ))}
          </div>
        </div>

        <div>
          <div className="eyebrow mb-3">Tips &amp; shortcuts</div>
          <div className="bg-surface border border-line rounded-lg p-4">
            <div className="space-y-2.5 mb-5">
              {KEYBOARD_SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {s.keys.map((k) => (
                      <kbd
                        key={k}
                        className="px-1.5 py-0.5 rounded bg-paper border border-line text-[10.5px] font-mono text-ink-soft"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                  <span className="text-[11.5px] text-ink-muted">{s.desc}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-line">
              <div className="eyebrow mb-2">Pro tips</div>
              <ul className="space-y-1.5">
                {[
                  "Use the Feed page to filter by platform (arXiv, GitHub, Reddit, HN)",
                  "Click any topic badge to see all related items",
                  "Knowledge guides have copy-paste code snippets",
                  "Dev Hub cards link directly to official docs",
                  "Learning Paths have 3-phase roadmaps for each AI career role",
                ].map((t, i) => (
                  <li key={i} className="text-[12px] text-ink-soft flex items-start gap-2 leading-relaxed">
                    <span className="text-ink-faint mt-1.5">-</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Chat CTA ── */}
      <div className="border-t border-line pt-8">
        <div className="bg-surface border border-line rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="eyebrow mb-1">DevPulse AI</div>
            <p className="text-[13.5px] text-ink font-medium mb-1">
              Ask anything about AI - with live web search
            </p>
            <p className="text-[12.5px] text-ink-muted">
              Powered by Perplexity sonar. Inline citations, markdown, multi-turn conversation.
            </p>
          </div>
          <Link
            to="/chat"
            className="shrink-0 px-4 py-2 rounded-lg bg-ink text-paper text-[13px] font-medium hover:bg-ink-soft transition-colors"
          >
            Open Chat →
          </Link>
        </div>
      </div>
    </div>
  );
}
