import { Link } from "react-router-dom";

/* ── AI Career Roles ── */
const ROLES = [
  {
    title: "AI / ML Engineer",
    icon: "🧠",
    color: "from-purple-600 to-indigo-500",
    desc: "Build, train, and deploy ML models. Work on data pipelines, model serving, and MLOps infrastructure.",
    skills: ["Python", "PyTorch / TensorFlow", "MLOps", "Data pipelines", "Model optimization"],
    topics: ["fine-tuning", "llm-inference", "mlops", "embeddings"],
    guides: ["building-with-llm-apis"],
    extLinks: [
      { label: "fast.ai — Practical Deep Learning", url: "https://course.fast.ai" },
      { label: "Hugging Face NLP Course", url: "https://huggingface.co/learn/nlp-course" },
    ],
  },
  {
    title: "AI Engineer",
    icon: "⚡",
    color: "from-blue-600 to-cyan-500",
    desc: "Integrate LLMs into products. Build RAG pipelines, agents, context-aware apps, and AI-powered features.",
    skills: ["LLM APIs", "RAG", "Context Engineering", "Prompt design", "Vector DBs"],
    topics: ["rag", "context-engineering", "langchain", "agentic-patterns", "prompt-engineering"],
    guides: ["context-engineering", "agentic-patterns", "prompt-engineering"],
    extLinks: [
      { label: "LangChain Academy", url: "https://academy.langchain.com" },
      { label: "DeepLearning.AI — Building with LLMs", url: "https://www.deeplearning.ai/short-courses/" },
    ],
  },
  {
    title: "AI Coding Assistant Power User",
    icon: "🤖",
    color: "from-gray-900 to-gray-700",
    desc: "Master GitHub Copilot, Claude Code, Cursor, and other AI coding tools to 10x your developer productivity.",
    skills: ["Copilot Agent Mode", "Custom instructions", "MCP", "Prompt crafting", "Vibe coding"],
    topics: ["github-copilot", "copilot-updates", "copilot-skills-agents", "cursor-windsurf", "vibe-coding", "mcp"],
    guides: ["getting-started-copilot", "copilot-agent-mode", "mcp-guide", "vscode-power-tips", "vibe-coding"],
    extLinks: [
      { label: "GitHub Copilot Docs", url: "https://docs.github.com/en/copilot" },
      { label: "Copilot Chat Cookbook", url: "https://docs.github.com/en/copilot/using-github-copilot/copilot-chat/using-github-copilot-chat-in-your-ide" },
    ],
  },
  {
    title: "Prompt Engineer",
    icon: "✍️",
    color: "from-amber-500 to-orange-500",
    desc: "Design system prompts, few-shot examples, and chain-of-thought strategies that get reliable, high-quality outputs from LLMs.",
    skills: ["System prompts", "Chain-of-thought", "Few-shot design", "Output formatting", "Evals"],
    topics: ["prompt-engineering", "context-engineering", "ai-evals"],
    guides: ["prompt-engineering", "context-engineering", "ai-evals-harness"],
    extLinks: [
      { label: "OpenAI Prompt Engineering Guide", url: "https://platform.openai.com/docs/guides/prompt-engineering" },
      { label: "Anthropic Prompt Library", url: "https://docs.anthropic.com/en/prompt-library" },
    ],
  },
  {
    title: "AI Safety & Alignment Researcher",
    icon: "🛡️",
    color: "from-red-600 to-rose-500",
    desc: "Work on making AI systems safe, aligned, and trustworthy. Red teaming, guardrails, RLHF, and responsible AI deployment.",
    skills: ["Red teaming", "RLHF / DPO", "Guardrails", "Prompt injection defense", "Evaluation"],
    topics: ["ai-safety", "ai-evals"],
    guides: ["ai-safety-guardrails", "ai-evals-harness"],
    extLinks: [
      { label: "OWASP LLM Top 10", url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/" },
      { label: "Anthropic Safety Research", url: "https://www.anthropic.com/research" },
    ],
  },
  {
    title: "Full-Stack AI Builder",
    icon: "🚀",
    color: "from-green-600 to-emerald-500",
    desc: "Ship AI-powered products end-to-end. From vibe-coding prototypes to production apps with LLM backends.",
    skills: ["React / Next.js", "Node / Python backend", "LLM APIs", "Deployment", "Vibe coding"],
    topics: ["vibe-coding", "ai-coding", "spring-ai", "project-ideas"],
    guides: ["vibe-coding", "building-with-llm-apis"],
    extLinks: [
      { label: "v0.dev — AI UI Generator", url: "https://v0.dev" },
      { label: "bolt.new — Full-stack from prompts", url: "https://bolt.new" },
    ],
  },
];

/* ── Portal Quick-Start Guide ── */
const PORTAL_SECTIONS = [
  {
    icon: "🏠",
    title: "Dashboard",
    path: "/",
    desc: "Your at-a-glance overview — trending topics, total items, recent activity, and score distribution.",
  },
  {
    icon: "🗂️",
    title: "Topics",
    path: "/topics",
    desc: "46 curated AI topics from RAG to Vibe Coding. Click any topic to see all related feed items.",
  },
  {
    icon: "📡",
    title: "Feed",
    path: "/feed",
    desc: "674+ aggregated items from GitHub, arXiv, HN, Reddit, X & more. Filter by type, platform, or search.",
  },
  {
    icon: "🛠️",
    title: "Dev Hub",
    path: "/devhub",
    desc: "Spotlight cards for 14 essential AI dev tools. Tabs for Copilot, Models, Context Engineering, Vibe Coding.",
  },
  {
    icon: "🎬",
    title: "Videos",
    path: "/videos",
    desc: "AI tutorials and tech talks from YouTube — searchable with thumbnails.",
  },
  {
    icon: "📖",
    title: "Knowledge",
    path: "/knowledge",
    desc: "11 in-depth guides covering Copilot, MCP, Context Engineering, Evals, Agentic Patterns, AI Safety & more.",
  },
  {
    icon: "🔗",
    title: "Sources",
    path: "/sources",
    desc: "75 active data sources. Toggle them on/off and trigger manual fetches.",
  },
];

/* ── Learning Path Steps ── */
const LEARNING_PATH = [
  { step: 1, label: "Explore the Dashboard", desc: "See what's trending in AI today", path: "/" },
  { step: 2, label: "Browse Knowledge Guides", desc: "Start with Copilot or Context Engineering", path: "/knowledge" },
  { step: 3, label: "Pick a Role Above", desc: "Follow the topics & guides for your career path", path: null },
  { step: 4, label: "Dive into Dev Hub", desc: "Try the tools — Copilot, Claude Code, v0, bolt.new", path: "/devhub" },
  { step: 5, label: "Follow Topics", desc: "Track Context Engineering, Evals, Agentic Patterns", path: "/topics" },
  { step: 6, label: "Watch Tutorials", desc: "Learn from curated AI video content", path: "/videos" },
  { step: 7, label: "Build Something", desc: "Use Vibe Coding to ship an AI-powered project", path: null },
];

export default function LearnPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <span>🎯</span> Learning Paths
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">
          Pick your AI role, follow the upskilling path, and use DevPulse as your daily learning companion
        </p>
      </div>

      {/* Quick Start — How to use DevPulse */}
      <div className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5">
        <h2 className="text-sm font-bold text-blue-900 mb-1 flex items-center gap-2">
          <span>🗺️</span> Quick Start — How to Use DevPulse
        </h2>
        <p className="text-xs text-blue-700/70 mb-4">Your portal has 7 sections. Here's what each one does:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PORTAL_SECTIONS.map((s) => (
            <Link
              key={s.path}
              to={s.path}
              className="flex items-start gap-2.5 p-3 rounded-lg bg-white/70 hover:bg-white border border-blue-100 hover:border-blue-200 transition-all group"
            >
              <span className="text-lg mt-0.5">{s.icon}</span>
              <div>
                <div className="text-xs font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                  {s.title}
                </div>
                <div className="text-[10px] text-gray-500 leading-relaxed mt-0.5">{s.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Learning Path — numbered steps */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span>📍</span> Recommended Learning Flow
        </h2>
        <div className="flex flex-wrap gap-2">
          {LEARNING_PATH.map((s) => {
            const inner = (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {s.step}
                </span>
                <div>
                  <div className="text-xs font-semibold text-gray-800">{s.label}</div>
                  <div className="text-[10px] text-gray-400">{s.desc}</div>
                </div>
              </div>
            );
            return s.path ? (
              <Link key={s.step} to={s.path}>{inner}</Link>
            ) : (
              <div key={s.step}>{inner}</div>
            );
          })}
        </div>
      </div>

      {/* AI Career Roles */}
      <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <span>💼</span> AI Career Roles & Upskilling Paths
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {ROLES.map((role) => (
          <div
            key={role.title}
            className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Color bar */}
            <div className={`h-1.5 bg-gradient-to-r ${role.color}`} />
            <div className="p-4">
              {/* Title */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{role.icon}</span>
                <h3 className="font-bold text-sm text-gray-900">{role.title}</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">{role.desc}</p>

              {/* Skills */}
              <div className="mb-3">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Key Skills</div>
                <div className="flex flex-wrap gap-1">
                  {role.skills.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-100"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* DevPulse Topics */}
              <div className="mb-3">
                <div className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-1">
                  📡 DevPulse Topics
                </div>
                <div className="flex flex-wrap gap-1">
                  {role.topics.map((slug) => (
                    <Link
                      key={slug}
                      to={`/topic/${slug}`}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      {slug}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Knowledge Guides */}
              <div className="mb-3">
                <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-1">
                  📖 Knowledge Guides
                </div>
                <div className="flex flex-wrap gap-1">
                  {role.guides.map((slug) => (
                    <Link
                      key={slug}
                      to={`/knowledge/${slug}`}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                    >
                      {slug}
                    </Link>
                  ))}
                </div>
              </div>

              {/* External Resources */}
              <div>
                <div className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider mb-1">
                  🔗 Learn More
                </div>
                <div className="flex flex-col gap-0.5">
                  {role.extLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
                    >
                      <span>↗</span> {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="text-center py-8 border-t border-gray-100">
        <p className="text-gray-400 text-xs mb-2">
          DevPulse aggregates AI news from 7+ platforms daily. Use it as your go-to AI learning hub.
        </p>
        <div className="flex gap-2 justify-center">
          <Link
            to="/knowledge"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            📖 Start with Knowledge Guides
          </Link>
          <Link
            to="/devhub"
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
          >
            🛠️ Explore Dev Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
