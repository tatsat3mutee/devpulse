import { useState } from "react";
import { Link } from "react-router-dom";

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

type RoleKey = "ai-eng" | "ml-eng" | "copilot" | "prompt" | "safety" | "builder";

interface Role {
  key: RoleKey;
  title: string;
  icon: string;
  gradient: string;
  tagline: string;
  desc: string;
  salary: string;
  demand: string;
  skills: string[];
  journey: { phase: string; items: string[] }[];
  topics: string[];
  guides: string[];
  extLinks: { label: string; url: string }[];
}

const ROLES: Role[] = [
  {
    key: "ai-eng",
    title: "AI Engineer",
    icon: "⚡",
    gradient: "from-blue-600 via-cyan-500 to-teal-400",
    tagline: "The hottest role in tech right now",
    desc: "Integrate LLMs into products. Build RAG pipelines, agents, context-aware apps. The bridge between ML research and production software.",
    salary: "$150k–$300k+",
    demand: "Exploding",
    skills: ["LLM APIs", "RAG", "Context Engineering", "Prompt Design", "Vector DBs", "LangChain"],
    journey: [
      { phase: "Foundations", items: ["Learn Python + API basics", "Understand transformers at a high level", "Read the Karpathy 'Software 3.0' essay"] },
      { phase: "Core Skills", items: ["Build a RAG pipeline from scratch", "Master prompt engineering patterns", "Learn context engineering (window management, chunking)"] },
      { phase: "Production", items: ["Deploy an agent with tool use", "Add evals and guardrails", "Ship a real product with LLM backend"] },
    ],
    topics: ["rag", "context-engineering", "langchain", "agentic-patterns", "prompt-engineering"],
    guides: ["context-engineering", "agentic-patterns", "prompt-engineering"],
    extLinks: [
      { label: "LangChain Academy", url: "https://academy.langchain.com" },
      { label: "DeepLearning.AI Short Courses", url: "https://www.deeplearning.ai/short-courses/" },
      { label: "Karpathy: Software 3.0", url: "https://karpathy.ai" },
    ],
  },
  {
    key: "ml-eng",
    title: "AI / ML Engineer",
    icon: "🧠",
    gradient: "from-purple-600 via-violet-500 to-indigo-400",
    tagline: "Train, fine-tune, and deploy models",
    desc: "Build and optimize ML models. Work on data pipelines, model serving, fine-tuning, and MLOps infrastructure.",
    salary: "$140k–$280k+",
    demand: "High",
    skills: ["Python", "PyTorch", "TensorFlow", "MLOps", "Data pipelines", "Model optimization", "CUDA"],
    journey: [
      { phase: "Foundations", items: ["Complete fast.ai Practical DL course", "Learn PyTorch fundamentals", "Understand attention mechanism"] },
      { phase: "Core Skills", items: ["Fine-tune an LLM with LoRA/QLoRA", "Build a training pipeline", "Learn model quantization (GGUF, AWQ)"] },
      { phase: "Production", items: ["Deploy with vLLM or TGI", "Set up MLOps (W&B, MLflow)", "Run evals and benchmarks"] },
    ],
    topics: ["fine-tuning", "llm-inference", "mlops", "embeddings", "new-models"],
    guides: ["building-with-llm-apis"],
    extLinks: [
      { label: "fast.ai — Practical Deep Learning", url: "https://course.fast.ai" },
      { label: "Hugging Face NLP Course", url: "https://huggingface.co/learn/nlp-course" },
      { label: "Karpathy: Neural Nets Zero to Hero", url: "https://karpathy.ai/zero-to-hero.html" },
    ],
  },
  {
    key: "copilot",
    title: "AI Coding Power User",
    icon: "🤖",
    gradient: "from-gray-900 via-gray-700 to-gray-500",
    tagline: "10x your dev productivity with AI tools",
    desc: "Master GitHub Copilot, Claude Code, Cursor, and MCP. The fastest way to level up as a developer right now.",
    salary: "Any dev role + premium",
    demand: "Universal",
    skills: ["Copilot Agent Mode", "Custom Instructions", "MCP Servers", "Vibe Coding", "Claude Code CLI"],
    journey: [
      { phase: "Quick Wins", items: ["Enable Copilot in VS Code", "Learn Tab completion + inline chat", "Try Agent Mode on a real task"] },
      { phase: "Power User", items: ["Write custom .github/copilot-instructions.md", "Set up MCP servers (filesystem, DB)", "Master multi-file editing with agent mode"] },
      { phase: "Advanced", items: ["Build custom Copilot skills/agents", "Use Claude Code for terminal-native coding", "Combine tools: Copilot + Claude Code + Cursor"] },
    ],
    topics: ["github-copilot", "copilot-updates", "copilot-skills-agents", "cursor-windsurf", "vibe-coding", "mcp"],
    guides: ["getting-started-copilot", "copilot-agent-mode", "mcp-guide", "vscode-power-tips", "vibe-coding"],
    extLinks: [
      { label: "GitHub Copilot Docs", url: "https://docs.github.com/en/copilot" },
      { label: "Claude Code Docs", url: "https://docs.anthropic.com/en/docs/claude-code" },
    ],
  },
  {
    key: "prompt",
    title: "Prompt Engineer",
    icon: "✍️",
    gradient: "from-amber-500 via-orange-500 to-red-400",
    tagline: "The art and science of talking to LLMs",
    desc: "Design system prompts, chain-of-thought strategies, and evaluation frameworks. The secret weapon behind every great AI product.",
    salary: "$120k–$250k+",
    demand: "Growing fast",
    skills: ["System Prompts", "Chain-of-Thought", "Few-Shot Design", "Output Formatting", "Evals", "Context Engineering"],
    journey: [
      { phase: "Basics", items: ["Read OpenAI + Anthropic prompt guides", "Learn role/task/format pattern", "Practice few-shot example design"] },
      { phase: "Advanced", items: ["Master chain-of-thought and tree-of-thought", "Build evaluation harnesses", "Learn context engineering (not just prompts)"] },
      { phase: "Expert", items: ["Design production prompt pipelines", "A/B test prompts with evals", "Build meta-prompts and prompt generators"] },
    ],
    topics: ["prompt-engineering", "context-engineering", "ai-evals"],
    guides: ["prompt-engineering", "context-engineering", "ai-evals-harness"],
    extLinks: [
      { label: "OpenAI Prompt Engineering Guide", url: "https://platform.openai.com/docs/guides/prompt-engineering" },
      { label: "Anthropic Prompt Library", url: "https://docs.anthropic.com/en/prompt-library" },
    ],
  },
  {
    key: "safety",
    title: "AI Safety Researcher",
    icon: "🛡️",
    gradient: "from-red-600 via-rose-500 to-pink-400",
    tagline: "Making AI safe, aligned, and trustworthy",
    desc: "Red teaming, guardrails, RLHF, constitutional AI. Critical work as AI systems become more powerful and autonomous.",
    salary: "$160k–$350k+",
    demand: "Critical shortage",
    skills: ["Red Teaming", "RLHF / DPO", "Guardrails", "Prompt Injection Defense", "Evaluation", "Constitutional AI"],
    journey: [
      { phase: "Foundations", items: ["Read OWASP LLM Top 10", "Understand prompt injection attacks", "Learn about RLHF and alignment"] },
      { phase: "Hands-On", items: ["Build guardrails for an LLM app", "Red team a chatbot (jailbreak, extraction)", "Implement input/output validators"] },
      { phase: "Research", items: ["Study constitutional AI (Anthropic)", "Explore mechanistic interpretability", "Contribute to safety benchmarks"] },
    ],
    topics: ["ai-safety", "ai-evals"],
    guides: ["ai-safety-guardrails", "ai-evals-harness"],
    extLinks: [
      { label: "OWASP LLM Top 10", url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/" },
      { label: "Anthropic Safety Research", url: "https://www.anthropic.com/research" },
    ],
  },
  {
    key: "builder",
    title: "Full-Stack AI Builder",
    icon: "🚀",
    gradient: "from-green-600 via-emerald-500 to-teal-400",
    tagline: "Ship AI products end-to-end",
    desc: "From vibe-coding prototypes to production apps. Use AI tools to build faster than ever — the new wave of indie hackers.",
    salary: "Freelance: $100–$300/hr",
    demand: "Booming",
    skills: ["React / Next.js", "Node / Python", "LLM APIs", "Deployment", "Vibe Coding", "v0 / bolt.new"],
    journey: [
      { phase: "Prototype", items: ["Build a UI with v0.dev or bolt.new", "Add an LLM-powered feature", "Deploy to Vercel/Railway in 10 min"] },
      { phase: "Product", items: ["Add RAG for domain-specific knowledge", "Implement auth and rate limiting", "Set up proper error handling + logging"] },
      { phase: "Scale", items: ["Add analytics and user tracking", "Optimize with caching and CDN", "Launch on Product Hunt / HN"] },
    ],
    topics: ["vibe-coding", "ai-coding", "spring-ai", "project-ideas"],
    guides: ["vibe-coding", "building-with-llm-apis"],
    extLinks: [
      { label: "v0.dev — AI UI Generator", url: "https://v0.dev" },
      { label: "bolt.new — Full-stack from prompts", url: "https://bolt.new" },
    ],
  },
];

const PORTAL_MAP = [
  { icon: "🏠", title: "Dashboard", path: "/", desc: "Trending topics & activity overview" },
  { icon: "📡", title: "Feed", path: "/feed", desc: "674+ items from 7 platforms" },
  { icon: "🗂️", title: "Topics", path: "/topics", desc: "46 curated AI topics" },
  { icon: "🛠️", title: "Dev Hub", path: "/devhub", desc: "14 essential AI tools" },
  { icon: "📖", title: "Knowledge", path: "/knowledge", desc: "11 in-depth guides" },
  { icon: "🎬", title: "Videos", path: "/videos", desc: "AI tutorials & talks" },
  { icon: "🔗", title: "Sources", path: "/sources", desc: "75 active data sources" },
];

const JOURNEY_STEPS = [
  { icon: "🌅", title: "Discover", desc: "Explore the Dashboard — see what's trending in AI today", path: "/", color: "blue", phase: "Day 1" },
  { icon: "📖", title: "Learn", desc: "Read Knowledge Guides — start with Context Engineering or Copilot", path: "/knowledge", color: "indigo", phase: "Week 1" },
  { icon: "💼", title: "Choose Your Path", desc: "Pick a career role below — each has a 3-phase roadmap", path: null as string | null, color: "purple", phase: "Week 1" },
  { icon: "🛠️", title: "Get Hands On", desc: "Try the tools in Dev Hub — Copilot, Claude Code, v0, bolt.new", path: "/devhub", color: "violet", phase: "Week 2" },
  { icon: "📡", title: "Stay Current", desc: "Follow Topics & Feed — track the AI developments that matter to you", path: "/topics", color: "fuchsia", phase: "Ongoing" },
  { icon: "🎬", title: "Go Deeper", desc: "Watch curated AI tutorials and tech talks", path: "/videos", color: "pink", phase: "Ongoing" },
  { icon: "🚀", title: "Build & Ship", desc: "Use everything you learned to ship an AI-powered project", path: null as string | null, color: "green", phase: "Month 1+" },
];

const COLOR_BG: Record<string, string> = {
  blue: "bg-blue-500", indigo: "bg-indigo-500", purple: "bg-purple-500",
  violet: "bg-violet-500", fuchsia: "bg-fuchsia-500", pink: "bg-pink-500", green: "bg-green-500",
};
const COLOR_RING: Record<string, string> = {
  blue: "ring-blue-200", indigo: "ring-indigo-200", purple: "ring-purple-200",
  violet: "ring-violet-200", fuchsia: "ring-fuchsia-200", pink: "ring-pink-200", green: "ring-green-200",
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function LearnPage() {
  const [activeRole, setActiveRole] = useState<RoleKey>("ai-eng");
  const role = ROLES.find((r) => r.key === activeRole)!;

  return (
    <div className="pb-8">
      {/* ── Hero ── */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-indigo-950 to-blue-950 p-6 sm:p-8">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(99,102,241,0.3) 0%, transparent 50%), " +
              "radial-gradient(circle at 80% 20%, rgba(59,130,246,0.3) 0%, transparent 50%), " +
              "radial-gradient(circle at 60% 80%, rgba(139,92,246,0.2) 0%, transparent 50%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              v2.0
            </span>
            <span className="text-xs text-gray-400">Your AI learning companion</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
            Learning Paths
          </h1>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl leading-relaxed">
            Pick your role. Follow the roadmap. Use DevPulse daily to stay ahead.
            <span className="text-blue-400"> From zero to production AI engineer.</span>
          </p>
          {/* Stats ribbon */}
          <div className="flex gap-4 sm:gap-6 mt-5">
            {[
              { n: "6", l: "Career Paths" },
              { n: "46", l: "Topics" },
              { n: "11", l: "Guides" },
              { n: "14", l: "Dev Tools" },
              { n: "75", l: "Sources" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-lg sm:text-xl font-black text-white">{s.n}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Portal Navigation Orbit ── */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-8 h-px bg-gray-300" />
          Navigate DevPulse
          <span className="flex-1 h-px bg-gray-300" />
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {PORTAL_MAP.map((s) => (
            <Link
              key={s.path}
              to={s.path}
              className="group relative p-3 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="text-2xl mb-1.5">{s.icon}</div>
              <div className="text-xs font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                {s.title}
              </div>
              <div className="text-[9px] text-gray-400 leading-tight mt-0.5">{s.desc}</div>
              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-gray-200 group-hover:bg-blue-400 transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Learning Journey Flow ── */}
      <section className="mb-10">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-8 h-px bg-gray-300" />
          Your Learning Journey
          <span className="flex-1 h-px bg-gray-300" />
        </h2>
        <div className="relative">
          {/* Vertical gradient line */}
          <div className="absolute left-[23px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-400 via-purple-400 to-green-400 hidden sm:block" />

          <div className="space-y-0">
            {JOURNEY_STEPS.map((step, i) => {
              const inner = (
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all group">
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-11 h-11 rounded-full ${COLOR_BG[step.color]} ring-4 ${COLOR_RING[step.color]} flex items-center justify-center text-lg shadow-sm`}
                    >
                      {step.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {step.title}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {step.phase}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                  </div>
                  {step.path && (
                    <span className="text-gray-300 group-hover:text-blue-400 transition-colors text-sm">
                      →
                    </span>
                  )}
                </div>
              );
              return step.path ? (
                <Link key={i} to={step.path} className="block">
                  {inner}
                </Link>
              ) : (
                <div key={i}>{inner}</div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Career Role Selector ── */}
      <section className="mb-10">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-8 h-px bg-gray-300" />
          Choose Your AI Career Path
          <span className="flex-1 h-px bg-gray-300" />
        </h2>

        {/* Role Tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {ROLES.map((r) => (
            <button
              key={r.key}
              onClick={() => setActiveRole(r.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeRole === r.key
                  ? "bg-gray-900 text-white shadow-lg scale-105"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <span>{r.icon}</span>
              {r.title}
            </button>
          ))}
        </div>

        {/* Active Role Card */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          {/* Gradient Header */}
          <div className={`bg-gradient-to-r ${role.gradient} p-5 sm:p-6`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xl">{role.icon}</span>
                  <div>
                    <h3 className="text-xl font-black text-white">{role.title}</h3>
                    <p className="text-xs text-white/70">{role.tagline}</p>
                  </div>
                </div>
                <p className="text-sm text-white/90 mt-3 max-w-xl leading-relaxed">{role.desc}</p>
              </div>
              <div className="hidden sm:flex flex-col gap-1 items-end">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {role.salary}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white">
                  Demand: {role.demand}
                </span>
              </div>
            </div>
            {/* Skills */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {role.skills.map((s) => (
                <span
                  key={s}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6">
            {/* 3-Phase Roadmap */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Roadmap
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {role.journey.map((phase, pi) => (
                  <div key={phase.phase} className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                          pi === 0 ? "bg-blue-500" : pi === 1 ? "bg-purple-500" : "bg-green-500"
                        }`}
                      >
                        {pi + 1}
                      </div>
                      <span className="text-xs font-bold text-gray-800">{phase.phase}</span>
                    </div>
                    <div className="ml-3 border-l-2 border-dashed border-gray-200 pl-3 space-y-1.5">
                      {phase.items.map((item, ii) => (
                        <div key={ii} className="flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                          <span className="text-[11px] text-gray-600 leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                    {pi < 2 && (
                      <div className="hidden sm:block absolute top-3 -right-2 text-gray-300 text-sm">
                        →
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* DevPulse Integration Panels */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Topics */}
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span>📡</span> Follow These Topics
                </div>
                <div className="flex flex-wrap gap-1">
                  {role.topics.map((slug) => (
                    <Link
                      key={slug}
                      to={`/topic/${slug}`}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-white text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all font-medium"
                    >
                      {slug.replace(/-/g, " ")}
                    </Link>
                  ))}
                </div>
              </div>
              {/* Guides */}
              <div className="p-3 rounded-xl bg-green-50/50 border border-green-100">
                <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span>📖</span> Read These Guides
                </div>
                <div className="flex flex-wrap gap-1">
                  {role.guides.map((slug) => (
                    <Link
                      key={slug}
                      to={`/knowledge/${slug}`}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-white text-green-700 border border-green-200 hover:bg-green-100 hover:border-green-300 transition-all font-medium"
                    >
                      {slug.replace(/-/g, " ")}
                    </Link>
                  ))}
                </div>
              </div>
              {/* External Links */}
              <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100">
                <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span>🔗</span> Learn More
                </div>
                <div className="flex flex-col gap-1">
                  {role.extLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 hover:underline"
                    >
                      <span className="text-[8px]">↗</span> {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <div className="rounded-2xl bg-gradient-to-r from-gray-900 to-indigo-950 p-6 text-center">
        <p className="text-white font-bold text-sm mb-1">Ready to start your AI journey?</p>
        <p className="text-gray-400 text-xs mb-4">
          DevPulse aggregates AI news from 7+ platforms daily. Your one-stop AI developer hub.
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Link
            to="/knowledge"
            className="px-5 py-2.5 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/25"
          >
            📖 Start with Guides
          </Link>
          <Link
            to="/devhub"
            className="px-5 py-2.5 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors border border-white/20"
          >
            🛠️ Explore Dev Hub
          </Link>
          <Link
            to="/feed"
            className="px-5 py-2.5 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors border border-white/20"
          >
            📡 Browse Feed
          </Link>
        </div>
      </div>
    </div>
  );
}
