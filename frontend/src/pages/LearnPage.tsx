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
    salary: "$150k-$300k+",
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
    salary: "$140k-$280k+",
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
      { label: "fast.ai - Practical Deep Learning", url: "https://course.fast.ai" },
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
    salary: "$120k-$250k+",
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
    salary: "$160k-$350k+",
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
    desc: "From vibe-coding prototypes to production apps. Use AI tools to build faster than ever - the new wave of indie hackers.",
    salary: "Freelance: $100-$300/hr",
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
      { label: "v0.dev - AI UI Generator", url: "https://v0.dev" },
      { label: "bolt.new - Full-stack from prompts", url: "https://bolt.new" },
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
  { icon: "🌅", title: "Discover", desc: "Explore the Dashboard - see what's trending in AI today", path: "/", color: "blue", phase: "Day 1" },
  { icon: "📖", title: "Learn", desc: "Read Knowledge Guides - start with Context Engineering or Copilot", path: "/knowledge", color: "indigo", phase: "Week 1" },
  { icon: "💼", title: "Choose Your Path", desc: "Pick a career role below - each has a 3-phase roadmap", path: null as string | null, color: "purple", phase: "Week 1" },
  { icon: "🛠️", title: "Get Hands On", desc: "Try the tools in Dev Hub - Copilot, Claude Code, v0, bolt.new", path: "/devhub", color: "violet", phase: "Week 2" },
  { icon: "📡", title: "Stay Current", desc: "Follow Topics & Feed - track the AI developments that matter to you", path: "/topics", color: "fuchsia", phase: "Ongoing" },
  { icon: "🎬", title: "Go Deeper", desc: "Watch curated AI tutorials and tech talks", path: "/videos", color: "pink", phase: "Ongoing" },
  { icon: "🚀", title: "Build & Ship", desc: "Use everything you learned to ship an AI-powered project", path: null as string | null, color: "green", phase: "Month 1+" },
];

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function LearnPage() {
  const [activeRole, setActiveRole] = useState<RoleKey>("ai-eng");
  const role = ROLES.find((r) => r.key === activeRole)!;

  return (
    <div className="pb-8">
      <header className="mb-8 pb-5 border-b border-line">
        <div className="eyebrow mb-2">Learn</div>
        <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">
          From zero to <span className="italic text-ink-soft">production AI engineer.</span>
        </h1>
        <p className="text-ink-muted text-[14px] max-w-2xl mb-5">
          Pick a role. Follow the roadmap. Use DevPulse daily to stay current.
        </p>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {[
            { n: "6", l: "Career paths" },
            { n: "46", l: "Topics" },
            { n: "11", l: "Guides" },
            { n: "14", l: "Tools" },
            { n: "75", l: "Sources" },
          ].map((s) => (
            <div key={s.l}>
              <div className="display text-[20px] text-ink">{s.n}</div>
              <div className="eyebrow mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </header>

      <section className="mb-10">
        <div className="eyebrow mb-3">Navigate</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {PORTAL_MAP.map((s) => (
            <Link
              key={s.path}
              to={s.path}
              className="group block p-3 rounded-lg bg-surface border border-line hover:border-ink/30 hover:shadow-card transition-all"
            >
              <div className="text-[13px] font-medium text-ink group-hover:text-accent transition-colors">
                {s.title}
              </div>
              <div className="text-[10.5px] text-ink-muted leading-tight mt-1">{s.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <div className="eyebrow mb-3">The journey</div>
        <div className="relative">
          <div className="absolute left-[15px] top-3 bottom-3 w-px bg-line hidden sm:block" />
          <div className="space-y-1">
            {JOURNEY_STEPS.map((step, i) => {
              const inner = (
                <div className="group flex items-start gap-4 p-3 rounded-lg hover:bg-paper transition-colors">
                  <div className="relative shrink-0 z-10">
                    <div className="w-7 h-7 rounded-full bg-surface border border-line flex items-center justify-center text-[11px] font-mono text-ink-soft group-hover:border-accent group-hover:text-accent transition-colors">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="display text-[17px] text-ink group-hover:text-accent transition-colors">
                        {step.title}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-ink-faint font-mono">
                        {step.phase}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-ink-muted mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                  {step.path && (
                    <span className="text-ink-faint group-hover:text-accent transition-colors text-[14px] pt-0.5">
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

      <section className="mb-10">
        <div className="eyebrow mb-3">Choose a path</div>

        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {ROLES.map((r) => (
            <button
              key={r.key}
              onClick={() => setActiveRole(r.key)}
              className={`px-3 py-1.5 rounded-md text-[12px] uppercase tracking-wider font-medium whitespace-nowrap transition-all ${
                activeRole === r.key
                  ? "bg-ink text-paper"
                  : "bg-surface text-ink-soft border border-line hover:border-ink/30 hover:text-ink"
              }`}
            >
              <span>{r.icon}</span>
              {r.title}
            </button>
          ))}
        </div>

        <article className="rounded-lg border border-line bg-surface overflow-hidden">
          <div className="p-6 border-b border-line">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[260px]">
                <div className="eyebrow mb-2">{role.tagline}</div>
                <h3 className="display text-[26px] sm:text-[30px] text-ink leading-snug">
                  {role.title}
                </h3>
                <p className="text-[13.5px] text-ink-soft mt-2 max-w-xl leading-relaxed">{role.desc}</p>
              </div>
              <div className="flex flex-col gap-3 items-end shrink-0 text-right">
                <div>
                  <div className="eyebrow">Salary</div>
                  <div className="text-[13px] font-mono text-ink mt-0.5">{role.salary}</div>
                </div>
                <div>
                  <div className="eyebrow">Demand</div>
                  <div className="text-[13px] font-mono text-accent mt-0.5">{role.demand}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-5">
              {role.skills.map((s) => (
                <span
                  key={s}
                  className="text-[10.5px] font-mono px-2 py-0.5 rounded text-ink-muted bg-paper border border-line"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="mb-8">
              <div className="eyebrow mb-4">Roadmap · {role.journey.length} phases</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {role.journey.map((phase, pi) => (
                  <div
                    key={phase.phase}
                    className="rounded-lg border border-line bg-paper/60 p-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-accent/20" />
                    <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-line/60">
                      <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-mono font-medium">
                        {String(pi + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[14px] font-medium text-ink tracking-tight">{phase.phase}</span>
                    </div>
                    <ul className="space-y-2.5">
                      {phase.items.map((item, ii) => (
                        <li key={ii} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent/30 mt-[7px] shrink-0" />
                          <span className="text-[12.5px] text-ink-soft leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-6 border-t border-line">
              <div>
                <div className="eyebrow mb-2">Topics to follow</div>
                <div className="flex flex-wrap gap-1">
                  {role.topics.map((slug) => (
                    <Link
                      key={slug}
                      to={`/topic/${slug}`}
                      className="text-[11px] px-2 py-0.5 rounded font-mono text-ink-soft bg-paper border border-line hover:border-ink/30 hover:text-ink transition-colors"
                    >
                      #{slug}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="eyebrow mb-2">Guides to read</div>
                <div className="flex flex-col gap-1.5">
                  {role.guides.map((slug) => (
                    <Link
                      key={slug}
                      to={`/knowledge/${slug}`}
                      className="text-[12.5px] text-ink-soft hover:text-accent transition-colors"
                    >
                      → {slug.replace(/-/g, " ")}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="eyebrow mb-2">Learn more</div>
                <div className="flex flex-col gap-1.5">
                  {role.extLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12.5px] text-ink-soft hover:text-accent transition-colors"
                    >
                      ↗ {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <div className="border-t border-line pt-8 text-center">
        <p className="display text-[24px] text-ink mb-1">Ready to start your AI journey?</p>
        <p className="text-ink-muted text-[13px] mb-5 max-w-md mx-auto">
          DevPulse aggregates AI signal from seven platforms daily. Your one-stop AI developer hub.
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Link
            to="/knowledge"
            className="px-4 py-2 rounded-md bg-ink text-paper text-[12.5px] font-medium hover:bg-ink-soft transition-colors"
          >
            Start with guides
          </Link>
          <Link
            to="/devhub"
            className="px-4 py-2 rounded-md bg-surface border border-line text-ink-soft text-[12.5px] font-medium hover:border-ink/30 hover:text-ink transition-colors"
          >
            Explore Dev Hub
          </Link>
          <Link
            to="/feed"
            className="px-4 py-2 rounded-md bg-surface border border-line text-ink-soft text-[12.5px] font-medium hover:border-ink/30 hover:text-ink transition-colors"
          >
            Browse feed
          </Link>
        </div>
      </div>
    </div>
  );
}
