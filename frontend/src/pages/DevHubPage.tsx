import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Item, Topic } from "../lib/api";
import FeedItem from "../components/FeedItem";
import { timeAgo, stripHtml } from "../lib/utils";

type Tab = "all" | "copilot" | "claude" | "models" | "devtools" | "community" | "context" | "vibe" | "cloud";

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
    name: "Hugging Face",
    icon: "🤗",
    color: "from-yellow-500 to-orange-400",
    tagline: "The open ML platform",
    desc: "Discover, share & deploy 800K+ models, datasets, and Spaces. Hub for open-source AI with Transformers, Inference API & more.",
    features: ["Model Hub", "Spaces", "Inference API", "Transformers"],
    url: "https://huggingface.co",
    tag: "Platform",
  },
  {
    name: "Mistral AI",
    icon: "🌀",
    color: "from-orange-600 to-amber-500",
    tagline: "European AI powerhouse",
    desc: "Open-weight & frontier models — Mistral Large, Codestral, Mixtral. La Plateforme API, Le Chat assistant, and on-device deployment.",
    features: ["Codestral", "Mixtral", "Le Chat", "La Plateforme"],
    url: "https://mistral.ai",
    tag: "Models",
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
  // — Cloud AI —
  {
    name: "Azure AI Studio",
    icon: "☁️",
    color: "from-blue-600 to-cyan-500",
    tagline: "Microsoft's unified AI platform",
    desc: "Build, evaluate, and deploy AI models with Azure OpenAI, prompt flow, model catalog, and integrated RAG with Azure AI Search.",
    features: ["Azure OpenAI", "Prompt Flow", "Model Catalog", "AI Search"],
    url: "https://ai.azure.com",
    tag: "Cloud AI",
  },
  {
    name: "AWS Bedrock",
    icon: "🟧",
    color: "from-orange-500 to-yellow-500",
    tagline: "Foundation models on AWS",
    desc: "Managed access to Claude, Llama, Mistral, and Titan models. Build RAG with Knowledge Bases, agents with tool use, and fine-tune on your data.",
    features: ["Multi-model", "Knowledge Bases", "Agents", "Guardrails"],
    url: "https://aws.amazon.com/bedrock/",
    tag: "Cloud AI",
  },
  {
    name: "Karpathy nanoGPT",
    icon: "🧠",
    color: "from-gray-700 to-slate-600",
    tagline: "GPT training from scratch",
    desc: "Andrej Karpathy's minimal GPT implementation — ~300 lines of PyTorch. Learn transformer architecture by building and training your own language model.",
    features: ["300 lines", "GPT-2 repro", "Educational", "PyTorch"],
    url: "https://github.com/karpathy/nanoGPT",
    tag: "Education",
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
  cloud: [
    "azure-ai", "aws-ai", "cloud-ai", "microsoft",
    "spring-ai",
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
    { key: "cloud", label: "Cloud AI", icon: "☁️" },
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
      <header className="mb-8 pb-5 border-b border-line">
        <div className="eyebrow mb-2">Tooling</div>
        <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">
          The AI builder's <span className="italic text-ink-soft">workshop.</span>
        </h1>
        <p className="text-ink-muted text-[14px] max-w-2xl">
          Copilot, Claude Code, Cursor, v0, bolt.new, CrewAI — every tool worth
          a serious developer's time, in one place.
        </p>
      </header>

      <div className="eyebrow mb-3">Tools · {DEV_TOOLS.length}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-10">
        {DEV_TOOLS.map((tool) => (
          <a
            key={tool.name}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative bg-surface rounded-lg border border-line p-4 hover:border-ink/30 hover:shadow-card transition-all"
          >
            <div className="flex items-start justify-between mb-1.5 gap-3">
              <h3 className="font-medium text-[14px] text-ink group-hover:text-accent transition-colors min-w-0 truncate">
                {tool.name}
              </h3>
              <span className="text-[10px] font-mono text-ink-faint uppercase tracking-wider shrink-0">
                {tool.tag}
              </span>
            </div>
            <p className="text-[12.5px] text-ink-soft leading-snug mb-1">{tool.tagline}</p>
            <p className="text-[12px] text-ink-muted leading-relaxed mb-3 line-clamp-2">{tool.desc}</p>
            <div className="flex flex-wrap gap-1">
              {tool.features.slice(0, 4).map((f) => (
                <span
                  key={f}
                  className="text-[10px] px-1.5 py-0.5 rounded font-mono text-ink-muted bg-paper border border-line"
                >
                  {f}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>

      {filteredTopics.length > 0 && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {filteredTopics.map((t) => (
            <Link
              key={t.id}
              to={`/topic/${t.slug}`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-paper border border-line text-[11px] font-medium text-ink-soft hover:border-ink/30 hover:text-ink transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.category_color }} />
              {t.name}
              <span className="text-ink-faint font-mono">{t.item_count}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex gap-3 mb-6 border-b border-line overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-1 pb-2.5 text-[12px] uppercase tracking-wider font-medium border-b transition-colors whitespace-nowrap ${
              tab === t.key
                ? "text-ink border-ink"
                : "text-ink-faint border-transparent hover:text-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface border border-line rounded-lg animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="display text-[28px] text-ink-soft mb-1">Nothing fresh on this tab.</p>
          <p className="text-[13.5px] text-ink-muted">Trigger a fetch from the Sources page.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {articles.length > 0 && (
            <div>
              <div className="eyebrow mb-3">Updates &amp; articles</div>
              <div className="divide-y divide-line bg-surface border border-line rounded-lg overflow-hidden">
                {articles.slice(0, 15).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-paper transition-colors cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13.5px] font-medium text-ink group-hover:text-accent transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-ink-faint mt-1 uppercase tracking-wider">
                        <span className="text-ink-muted">{item.source_name || item.platform}</span>
                        <span>·</span>
                        <span>{timeAgo(item.published_at)}</span>
                        {item.author && (<><span>·</span><span className="normal-case tracking-normal">{item.author}</span></>)}
                      </div>
                    </div>
                    <span className="text-ink-faint group-hover:text-accent transition-colors text-[12px]">↗</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {other.length > 0 && (
            <div>
              <div className="eyebrow mb-3">Community &amp; repos</div>
              <div className="space-y-2.5">
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
