import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Item, Topic } from "../lib/api";
import FeedItem from "../components/FeedItem";
import { timeAgo, stripHtml } from "../lib/utils";

type Tab = "all" | "copilot" | "claude" | "models" | "devtools" | "community" | "context" | "vibe";

const DEV_TOOLS = [
  {
    name: "GitHub Copilot",
    icon: "🤖",
    color: "from-gray-900 to-gray-700",
    tagline: "AI pair programmer in your editor",
    desc: "Code completions, chat, and agents inside VS Code, JetBrains & CLI. Powered by GPT-4o & Claude.",
    features: ["Inline completions", "Copilot Chat", "Agent mode", "MCP support"],
    url: "https://github.com/features/copilot",
    tag: "Editor",
  },
  {
    name: "Claude Code",
    icon: "🧬",
    color: "from-orange-500 to-amber-500",
    tagline: "Anthropic's agentic coding CLI",
    desc: "Terminal-based AI assistant that reads your codebase, writes code, runs commands, and handles multi-file edits autonomously.",
    features: ["Agentic loops", "Full repo context", "Git-aware", "Tool use"],
    url: "https://docs.anthropic.com/en/docs/claude-code",
    tag: "CLI Agent",
  },
  {
    name: "Codex",
    icon: "🟢",
    color: "from-green-600 to-emerald-500",
    tagline: "OpenAI's cloud coding agent",
    desc: "Software engineering agent that runs in the cloud. Handles tasks in parallel — writes code, fixes bugs, and opens PRs.",
    features: ["Cloud sandboxes", "Parallel tasks", "PR creation", "Codex CLI"],
    url: "https://openai.com/index/introducing-codex/",
    tag: "Cloud Agent",
  },
  {
    name: "OpenRouter",
    icon: "🔀",
    color: "from-purple-600 to-indigo-500",
    tagline: "Unified API for 200+ AI models",
    desc: "One API to access Claude, GPT, Gemini, Llama, Mistral & more. Compare prices, latency, and switch models instantly.",
    features: ["200+ models", "Fallback routing", "Usage analytics", "OpenAI-compatible"],
    url: "https://openrouter.ai",
    tag: "API Gateway",
  },
  {
    name: "OpenCode",
    icon: "⚡",
    color: "from-cyan-500 to-blue-500",
    tagline: "Open-source terminal AI assistant",
    desc: "Terminal-native coding agent. Connects to any LLM provider — OpenRouter, Anthropic, OpenAI, local models via Ollama.",
    features: ["Open source", "Any provider", "LSP integration", "Custom tools"],
    url: "https://github.com/opencode-ai/opencode",
    tag: "CLI · OSS",
  },
  {
    name: "Hugging Face",
    icon: "🤗",
    color: "from-yellow-500 to-orange-400",
    tagline: "The open ML platform",
    desc: "Discover, share & deploy 800K+ models, datasets, and Spaces. Hub for open-source AI with Transformers, Inference API & more.",
    features: ["Model Hub", "Spaces", "Inference API", "Transformers"],
    url: "https://huggingface.co",
    tag: "Platform",
  },
  // — Context Engineering & Evals —
  {
    name: "LangSmith",
    icon: "🔗",
    color: "from-teal-600 to-emerald-500",
    tagline: "LLM observability & evals platform",
    desc: "Trace, debug, and evaluate your LLM apps. Monitor context quality, prompt performance, and RAG pipelines in production.",
    features: ["Tracing", "Evals", "Datasets", "Prompt Hub"],
    url: "https://smith.langchain.com",
    tag: "Context Eng",
  },
  {
    name: "Inspect AI",
    icon: "🧪",
    color: "from-red-600 to-rose-500",
    tagline: "AI evaluation framework by UK AISI",
    desc: "Python-native framework for building LLM evaluation harnesses. Flexible scoring, model grading, and safety benchmarks.",
    features: ["Python-native", "Custom scorers", "Model grading", "Safety evals"],
    url: "https://inspect.ai-safety-institute.org.uk",
    tag: "Evals",
  },
  // — Vibe Coding —
  {
    name: "v0",
    icon: "▲",
    color: "from-black to-gray-800",
    tagline: "AI UI generator by Vercel",
    desc: "Describe a UI in natural language and get production-ready React + Tailwind code. The ultimate vibe coding tool for frontend.",
    features: ["Text to UI", "React + Tailwind", "Iterate visually", "Deploy to Vercel"],
    url: "https://v0.dev",
    tag: "Vibe Code",
  },
  {
    name: "bolt.new",
    icon: "⚡",
    color: "from-violet-600 to-purple-500",
    tagline: "Full-stack apps from prompts",
    desc: "Build, run, and deploy full-stack web apps entirely in the browser. Powered by StackBlitz WebContainers and AI.",
    features: ["In-browser dev", "Full-stack", "Instant deploy", "AI-powered"],
    url: "https://bolt.new",
    tag: "Vibe Code",
  },
  // — Agentic Patterns —
  {
    name: "CrewAI",
    icon: "👥",
    color: "from-blue-700 to-indigo-600",
    tagline: "Multi-agent orchestration framework",
    desc: "Define AI agents with roles, goals, and tools. Orchestrate crews of agents that collaborate to solve complex tasks autonomously.",
    features: ["Role-based agents", "Task delegation", "Tool integration", "Memory"],
    url: "https://www.crewai.com",
    tag: "Agentic",
  },
  // — AI Safety —
  {
    name: "Guardrails AI",
    icon: "🛡️",
    color: "from-amber-600 to-yellow-500",
    tagline: "LLM input/output validation",
    desc: "Open-source framework for adding guardrails to LLM apps. Validate, re-ask, and filter model outputs with programmable validators.",
    features: ["Input validation", "Output filtering", "Re-ask loops", "Hub validators"],
    url: "https://www.guardrailsai.com",
    tag: "Safety",
  },
];

const TAB_TOPICS: Record<Tab, string[]> = {
  all: [], // empty = show everything
  copilot: [
    "github-copilot", "copilot-updates", "copilot-skills-agents",
    "mcp-servers", "mcp", "vscode-updates", "cursor-windsurf",
  ],
  claude: [
    "anthropic", "claude-code", "gpt", "grok",
    "open-source", "new-models", "mistral-ai",
  ],
  models: [
    "google-deepmind", "meta-ai", "hugging-face", "alibaba-cloud",
    "fine-tuning", "llm-inference", "embeddings", "multimodal",
    "new-models", "microsoft",
  ],
  context: [
    "context-engineering", "rag", "prompt-engineering",
    "ai-evals", "embeddings", "langchain",
  ],
  vibe: [
    "vibe-coding", "ai-coding", "agentic-patterns",
    "agentic-ai", "agent-skills",
  ],
  devtools: [
    "ai-coding", "agentic-ai", "agent-skills",
    "langchain", "rag", "prompt-engineering",
    "ai-tools-comparison", "mlops", "ai-tutorials",
  ],
  community: [
    "general", "interview-prep", "project-ideas", "spring-ai",
    "computer-vision", "nlp", "ai-safety", "ai-hardware",
    "ai-industry-news", "ai-startups",
  ],
};

export default function DevHubPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    api.getTopics().then((all) => {
      setTopics(all.filter((t) => t.item_count > 0).sort((a, b) => b.item_count - a.item_count));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const slugs = TAB_TOPICS[tab];
    const params: Record<string, string> = {
      sort: "recent",
      limit: "60",
    };
    if (slugs.length > 0) {
      params.topic = slugs.join(",");
    }
    api.getItems(params).then((res) => {
      setItems(res.items);
      setLoading(false);
    });
  }, [tab]);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "all", label: "All", icon: "🏠" },
    { key: "copilot", label: "Copilot & Editors", icon: "🤖" },
    { key: "claude", label: "Claude · Codex · GPT", icon: "🧬" },
    { key: "models", label: "Models & HF", icon: "🧠" },
    { key: "context", label: "Context & Evals", icon: "🧩" },
    { key: "vibe", label: "Vibe · Agents", icon: "🎨" },
    { key: "devtools", label: "Dev Tools", icon: "🛠️" },
    { key: "community", label: "Community", icon: "💬" },
  ];

  // Filter topics for current tab
  const tabSlugs = TAB_TOPICS[tab];
  const filteredTopics = tabSlugs.length > 0
    ? topics.filter((t) => tabSlugs.includes(t.slug))
    : topics.slice(0, 12);

  // Split into articles/news vs other
  const articles = items.filter((i) => i.type === "article" || i.type === "news");
  const other = items.filter((i) => i.type !== "article" && i.type !== "news");

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <span>🛠️</span> Dev Hub
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">
          Copilot · Claude · Codex · v0 · bolt.new · CrewAI · LangSmith · all AI dev tools in one place
        </p>
      </div>

      {/* Developer Tools Spotlight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {DEV_TOOLS.map((tool) => (
          <a
            key={tool.name}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-gray-300 transition-all"
          >
            <div className={`h-1.5 bg-gradient-to-r ${tool.color}`} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{tool.icon}</span>
                  <h3 className="font-semibold text-sm text-gray-900">{tool.name}</h3>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {tool.tag}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mb-1">{tool.tagline}</p>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-3">{tool.desc}</p>
              <div className="flex flex-wrap gap-1">
                {tool.features.map((f) => (
                  <span
                    key={f}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-100"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <span className="absolute top-3 right-3 text-gray-300 group-hover:text-gray-500 transition-colors text-xs">↗</span>
          </a>
        ))}
      </div>

      {/* Quick topic pills */}
      {filteredTopics.length > 0 && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {filteredTopics.map((t) => (
            <Link
              key={t.id}
              to={`/topic/${t.slug}`}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-[11px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.category_color }} />
              {t.name}
              <span className="text-gray-400">({t.item_count})</span>
            </Link>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 mb-5 border-b border-gray-200 pb-2 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t transition-colors whitespace-nowrap ${
              tab === t.key
                ? "text-blue-700 border-b-2 border-blue-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-lg mb-1">No updates yet</p>
          <p className="text-sm">Fetch new data from the Sources page to see updates here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Changelog / Articles section */}
          {articles.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                📰 Latest Updates & Articles
              </h2>
              <div className="space-y-2">
                {articles.slice(0, 15).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                    className="flex items-start gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="w-1 h-10 rounded-full bg-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span className="font-medium text-gray-500">{item.source_name || item.platform}</span>
                        <span>·</span>
                        <span>{timeAgo(item.published_at)}</span>
                        {item.author && (
                          <>
                            <span>·</span>
                            <span>{item.author}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-gray-300 group-hover:text-gray-500 transition-colors text-xs">↗</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other content (repos, social, papers) */}
          {other.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                💬 Community & Repos
              </h2>
              <div className="space-y-3">
                {other.slice(0, 20).map((item) => (
                  <FeedItem key={item.id} item={item} showTopic />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
