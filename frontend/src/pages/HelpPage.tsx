import { useState, useRef } from "react";
import { Link } from "react-router-dom";

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const QUICK_ACTIONS = [
  { icon: "🏠", label: "Dashboard", desc: "See what's trending today", path: "/" },
  { icon: "📡", label: "Feed", desc: "Browse 674+ AI items", path: "/feed" },
  { icon: "📖", label: "Guides", desc: "19 in-depth learning guides", path: "/knowledge" },
  { icon: "🛠️", label: "Dev Hub", desc: "17 AI developer tools", path: "/devhub" },
  { icon: "🎯", label: "Learning Paths", desc: "Career roadmaps & roles", path: "/learn" },
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
  { title: "Topics", desc: "49 curated AI topics", path: "/topics", type: "page" },
  { title: "Dev Hub", desc: "17 essential AI tools", path: "/devhub", type: "page" },
  { title: "Knowledge", desc: "19 in-depth guides", path: "/knowledge", type: "page" },
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
  { title: "Claude Code Guide", desc: "Terminal AI assistant, agentic loops, CLAUDE.md", path: "/knowledge/claude-code-guide", type: "guide" },
  { title: "LLM Fine-Tuning", desc: "LoRA, QLoRA, PEFT, custom model training", path: "/knowledge/llm-fine-tuning", type: "guide" },
  { title: "RAG & Vectorless RAG", desc: "Retrieval, vector search, hybrid search, Graph RAG", path: "/knowledge/rag-guide", type: "guide" },
  { title: "Awesome Copilot", desc: "Skills, agents, plugins, custom instructions", path: "/knowledge/awesome-copilot-guide", type: "guide" },
  { title: "Azure AI Services", desc: "Azure OpenAI, AI Studio, Cognitive Services", path: "/knowledge/azure-ai-services", type: "guide" },
  { title: "AWS AI & Bedrock", desc: "Bedrock, SageMaker, Amazon Q Developer", path: "/knowledge/aws-ai-bedrock", type: "guide" },
  { title: "Karpathy AI from Scratch", desc: "nanoGPT, micrograd, neural nets from first principles", path: "/knowledge/karpathy-ai-from-scratch", type: "guide" },
  { title: "Spring Boot + Azure AI", desc: "Spring AI, Azure OpenAI, Java cloud AI", path: "/knowledge/spring-boot-azure-ai", type: "guide" },
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
  page: { bg: "bg-accent-soft", text: "text-accent", label: "Page" },
  guide: { bg: "bg-accent-soft", text: "text-accent", label: "Guide" },
  topic: { bg: "bg-paper", text: "text-ink-soft", label: "Topic" },
  tool: { bg: "bg-paper", text: "text-ink-muted", label: "Tool" },
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
      <header className="mb-8 pb-5 border-b border-line">
        <div className="eyebrow mb-2">Help</div>
        <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">
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
              {results.map((r) => {
                const badge = TYPE_BADGE[r.type];
                return (
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
                      {badge.label}
                    </span>
                    <span className="text-ink-faint text-[12px]">→</span>
                  </Link>
                );
              })}
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

      <div className="border-t border-line pt-8 text-center">
        <p className="display text-[24px] text-ink mb-1">Still have questions?</p>
        <p className="text-ink-muted text-[13px] mb-5 max-w-md mx-auto">
          DevPulse is open source. Read the guides, then explore the codebase.
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Link
            to="/knowledge"
            className="px-4 py-2 rounded-md bg-ink text-paper text-[12.5px] font-medium hover:bg-ink-soft transition-colors"
          >
            Read the guides
          </Link>
          <Link
            to="/learn"
            className="px-4 py-2 rounded-md bg-surface border border-line text-ink-soft text-[12.5px] font-medium hover:border-ink/30 hover:text-ink transition-colors"
          >
            Learning paths
          </Link>
          <a
            href="https://github.com/tatsat3mutee/devpulse"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-md bg-surface border border-line text-ink-soft text-[12.5px] font-medium hover:border-ink/30 hover:text-ink transition-colors"
          >
            GitHub repo
          </a>
        </div>
      </div>
    </div>
  );
}
