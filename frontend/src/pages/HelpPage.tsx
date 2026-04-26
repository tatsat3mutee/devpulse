import { useState, useRef } from "react";
import { Link } from "react-router-dom";

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const QUICK_ACTIONS = [
  { icon: "🏠", label: "Dashboard", desc: "See what's trending today", path: "/" },
  { icon: "📡", label: "Feed", desc: "Browse 674+ AI items", path: "/feed" },
  { icon: "📖", label: "Guides", desc: "11 in-depth learning guides", path: "/knowledge" },
  { icon: "🛠️", label: "Dev Hub", desc: "14 AI developer tools", path: "/devhub" },
  { icon: "🎯", label: "Learning Paths", desc: "Career roadmaps & roles", path: "/learn" },
  { icon: "🗂️", label: "Topics", desc: "46 curated AI topics", path: "/topics" },
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
    a: "Visit the Learning Paths page — choose from 6 AI career roles (AI Engineer, ML Engineer, AI Coding Power User, Prompt Engineer, AI Safety, Full-Stack Builder). Each has a 3-phase roadmap with topics, guides, and external resources.",
    link: { label: "View Learning Paths", path: "/learn" },
  },
  {
    q: "Where do I find AI research papers?",
    a: "The Feed page aggregates arXiv papers alongside GitHub repos, Reddit posts, and HN discussions. Filter by platform type to isolate research papers.",
    link: { label: "Browse Feed", path: "/feed" },
  },
  {
    q: "What topics are available?",
    a: "46 topics including: Context Engineering, RAG, Agentic Patterns, Vibe Coding, GitHub Copilot, Fine-tuning, AI Safety, Prompt Engineering, AI Evals, and many more.",
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

/* ═══════════════════════════════════════════════════════════
   SEARCH LOGIC — local portal search
   ═══════════════════════════════════════════════════════════ */

interface SearchResult {
  title: string;
  desc: string;
  path: string;
  type: "page" | "guide" | "topic" | "tool";
}

const SEARCH_INDEX: SearchResult[] = [
  // Pages
  { title: "Dashboard", desc: "Trending topics & activity overview", path: "/", type: "page" },
  { title: "Feed", desc: "674+ items from 7 platforms", path: "/feed", type: "page" },
  { title: "Topics", desc: "46 curated AI topics", path: "/topics", type: "page" },
  { title: "Dev Hub", desc: "14 essential AI tools", path: "/devhub", type: "page" },
  { title: "Knowledge", desc: "11 in-depth guides", path: "/knowledge", type: "page" },
  { title: "Videos", desc: "AI tutorials & talks", path: "/videos", type: "page" },
  { title: "Sources", desc: "75 active data sources", path: "/sources", type: "page" },
  { title: "Learning Paths", desc: "Career roadmaps & AI roles", path: "/learn", type: "page" },
  // Guides
  { title: "Getting Started with Copilot", desc: "Setup, tips, and first steps", path: "/knowledge/getting-started-copilot", type: "guide" },
  { title: "Copilot Agent Mode", desc: "Multi-file editing and autonomous coding", path: "/knowledge/copilot-agent-mode", type: "guide" },
  { title: "MCP Guide", desc: "Model Context Protocol servers", path: "/knowledge/mcp-guide", type: "guide" },
  { title: "VS Code Power Tips", desc: "Shortcuts and productivity hacks", path: "/knowledge/vscode-power-tips", type: "guide" },
  { title: "Prompt Engineering", desc: "System prompts, chain-of-thought, few-shot", path: "/knowledge/prompt-engineering", type: "guide" },
  { title: "Building with LLM APIs", desc: "OpenAI, Anthropic, Groq integration", path: "/knowledge/building-with-llm-apis", type: "guide" },
  { title: "Context Engineering", desc: "Window management, chunking, retrieval", path: "/knowledge/context-engineering", type: "guide" },
  { title: "AI Evals & Harness", desc: "Testing and evaluating LLM outputs", path: "/knowledge/ai-evals-harness", type: "guide" },
  { title: "Vibe Coding", desc: "AI-assisted rapid prototyping", path: "/knowledge/vibe-coding", type: "guide" },
  { title: "Agentic Patterns", desc: "Tool use, ReAct, planning patterns", path: "/knowledge/agentic-patterns", type: "guide" },
  { title: "AI Safety & Guardrails", desc: "Red teaming, RLHF, prompt injection defense", path: "/knowledge/ai-safety-guardrails", type: "guide" },
  // Topics (selected)
  { title: "RAG", desc: "Retrieval-Augmented Generation", path: "/topic/rag", type: "topic" },
  { title: "GitHub Copilot", desc: "AI pair programming", path: "/topic/github-copilot", type: "topic" },
  { title: "Fine-tuning", desc: "Custom model training", path: "/topic/fine-tuning", type: "topic" },
  { title: "AI Safety", desc: "Alignment and responsible AI", path: "/topic/ai-safety", type: "topic" },
  { title: "Agentic Patterns", desc: "Autonomous AI agents", path: "/topic/agentic-patterns", type: "topic" },
  { title: "Context Engineering", desc: "LLM context optimization", path: "/topic/context-engineering", type: "topic" },
  { title: "Vibe Coding", desc: "AI-powered rapid development", path: "/topic/vibe-coding", type: "topic" },
  { title: "Prompt Engineering", desc: "Effective LLM prompting", path: "/topic/prompt-engineering", type: "topic" },
];

function search(query: string): SearchResult[] {
  if (!query.trim()) return [];
  const terms = query.toLowerCase().split(/\s+/);
  return SEARCH_INDEX.filter((item) =>
    terms.every(
      (t) =>
        item.title.toLowerCase().includes(t) ||
        item.desc.toLowerCase().includes(t)
    )
  ).slice(0, 8);
}

const TYPE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  page: { bg: "bg-blue-50", text: "text-blue-600", label: "Page" },
  guide: { bg: "bg-green-50", text: "text-green-600", label: "Guide" },
  topic: { bg: "bg-purple-50", text: "text-purple-600", label: "Topic" },
  tool: { bg: "bg-amber-50", text: "text-amber-600", label: "Tool" },
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = search(query);

  return (
    <div className="pb-8">
      {/* ── Hero Search ── */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-slate-900 to-indigo-950 p-6 sm:p-8">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 40%, rgba(99,102,241,0.3) 0%, transparent 50%), " +
              "radial-gradient(circle at 70% 70%, rgba(59,130,246,0.3) 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-3xl">💡</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
            How can we help?
          </h1>
          <p className="text-sm text-gray-400 mb-5">
            Search DevPulse guides, topics, tools, and pages
          </p>

          {/* Search bar */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for guides, topics, tools..."
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 backdrop-blur-sm transition-all"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Results */}
          {results.length > 0 && (
            <div className="mt-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden text-left">
              {results.map((r) => {
                const badge = TYPE_BADGE[r.type];
                return (
                  <Link
                    key={r.path}
                    to={r.path}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{r.title}</div>
                      <div className="text-[11px] text-gray-400 truncate">{r.desc}</div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                    <span className="text-gray-500 text-sm">→</span>
                  </Link>
                );
              })}
            </div>
          )}
          {query.trim() && results.length === 0 && (
            <div className="mt-3 text-sm text-gray-400">
              No results for "<span className="text-white">{query}</span>". Try a different search term.
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-8 h-px bg-gray-300" />
          Quick Access
          <span className="flex-1 h-px bg-gray-300" />
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.path}
              to={a.path}
              className="group p-3 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-center"
            >
              <div className="text-2xl mb-1.5">{a.icon}</div>
              <div className="text-xs font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                {a.label}
              </div>
              <div className="text-[9px] text-gray-400 mt-0.5">{a.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Popular Searches ── */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-8 h-px bg-gray-300" />
          Popular Questions
          <span className="flex-1 h-px bg-gray-300" />
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {POPULAR_SEARCHES.map((s) => (
            <Link
              key={s.path}
              to={s.path}
              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group"
            >
              <span className="text-blue-400 group-hover:text-blue-600 transition-colors">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <span className="text-xs text-gray-700 group-hover:text-blue-600 transition-colors font-medium">
                {s.q}
              </span>
              <span className="ml-auto text-gray-300 group-hover:text-blue-400 text-sm">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-8 h-px bg-gray-300" />
          Frequently Asked Questions
          <span className="flex-1 h-px bg-gray-300" />
        </h2>
        <div className="space-y-1.5">
          {FAQ.map((f, i) => (
            <div key={i} className="rounded-xl bg-white border border-gray-100 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-800">{f.q}</span>
                <span
                  className={`text-gray-400 transition-transform duration-200 text-xs ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 border-t border-gray-50">
                  <p className="text-xs text-gray-600 leading-relaxed mt-3">{f.a}</p>
                  {f.link && (
                    <Link
                      to={f.link.path}
                      className="inline-flex items-center gap-1 mt-2 text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline"
                    >
                      {f.link.label} <span>→</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Resources + Shortcuts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* External AI Resources */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-8 h-px bg-gray-300" />
            AI Documentation & Resources
            <span className="flex-1 h-px bg-gray-300" />
          </h2>
          <div className="space-y-1.5">
            {AI_RESOURCES.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group"
              >
                <span className="text-xl">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {r.title}
                  </div>
                  <div className="text-[10px] text-gray-400">{r.desc}</div>
                </div>
                <span className="text-gray-300 group-hover:text-blue-400 text-[10px]">↗</span>
              </a>
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts & Tips */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-8 h-px bg-gray-300" />
            Tips & Shortcuts
            <span className="flex-1 h-px bg-gray-300" />
          </h2>
          <div className="rounded-xl bg-white border border-gray-100 p-4">
            <div className="space-y-3">
              {KEYBOARD_SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {s.keys.map((k) => (
                      <kbd
                        key={k}
                        className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] font-mono text-gray-600"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-500">{s.desc}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Pro Tips
              </h3>
              <ul className="space-y-1.5">
                <li className="text-[11px] text-gray-600 flex items-start gap-1.5">
                  <span className="text-blue-400 mt-0.5">•</span>
                  Use the Feed page to filter by platform (arXiv, GitHub, Reddit, HN)
                </li>
                <li className="text-[11px] text-gray-600 flex items-start gap-1.5">
                  <span className="text-blue-400 mt-0.5">•</span>
                  Click any topic badge to see all related items
                </li>
                <li className="text-[11px] text-gray-600 flex items-start gap-1.5">
                  <span className="text-blue-400 mt-0.5">•</span>
                  Knowledge guides have copy-paste code snippets
                </li>
                <li className="text-[11px] text-gray-600 flex items-start gap-1.5">
                  <span className="text-blue-400 mt-0.5">•</span>
                  Dev Hub cards link directly to official docs
                </li>
                <li className="text-[11px] text-gray-600 flex items-start gap-1.5">
                  <span className="text-blue-400 mt-0.5">•</span>
                  Learning Paths have 3-phase roadmaps for each AI career role
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="rounded-2xl bg-gradient-to-r from-gray-900 to-slate-900 p-6 text-center">
        <p className="text-white font-bold text-sm mb-1">Still have questions?</p>
        <p className="text-gray-400 text-xs mb-4">
          DevPulse is open source. Check the guides or explore the codebase.
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Link
            to="/knowledge"
            className="px-5 py-2.5 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/25"
          >
            📖 Read the Guides
          </Link>
          <Link
            to="/learn"
            className="px-5 py-2.5 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors border border-white/20"
          >
            🎯 Learning Paths
          </Link>
          <a
            href="https://github.com/tatsat3mutee/devpulse"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors border border-white/20"
          >
            🐙 GitHub Repo
          </a>
        </div>
      </div>
    </div>
  );
}
