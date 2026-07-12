import pool from "../db.js";
import { askLLM, hasLLMKey } from "./client.js";

interface ItemToClassify {
  id: number;
  title: string;
  description: string | null;
  tags: string[];
}

interface Topic {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

// Cache topics for 5 min so we don't hit DB on every classify call
let topicCache: Topic[] | null = null;
let cacheExpiry = 0;

async function getTopics(): Promise<Topic[]> {
  if (topicCache && Date.now() < cacheExpiry) return topicCache;
  const { rows } = await pool.query(
    "SELECT id, name, slug, description FROM topics ORDER BY name"
  );
  topicCache = rows;
  cacheExpiry = Date.now() + 5 * 60 * 1000;
  return rows;
}

/**
 * Classify items into topics. Uses LLM if key available, else keyword fallback.
 * Returns map of itemId → topicId.
 */
export async function classifyItems(
  items: ItemToClassify[]
): Promise<Map<number, number>> {
  const results = new Map<number, number>();
  if (items.length === 0) return results;

  const topics = await getTopics();

  if (!hasLLMKey()) return keywordClassify(items, topics);

  const topicList = topics
    .map((t) => `"${t.slug}" — ${t.name}: ${t.description || ""}`)
    .join("\n");

  const BATCH = 15;
  let llmDead = false;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    if (llmDead) {
      const fb = keywordClassify(batch, topics);
      fb.forEach((tid, iid) => results.set(iid, tid));
      continue;
    }
    try {
      const listing = batch
        .map(
          (it, idx) =>
            `[${idx + 1}] "${it.title}"${
              it.tags.length ? ` [${it.tags.join(", ")}]` : ""
            }`
        )
        .join("\n");

      const { text } = await askLLM(
        [
          {
            role: "system",
            content: `Classify each AI/ML item into ONE topic. Available topics:\n${topicList}\n\nReturn ONLY a JSON array of topic slugs, one per item in order. Use "general" if nothing fits.`,
          },
          { role: "user", content: `Classify:\n${listing}` },
        ],
        { temperature: 0.1, maxTokens: 1000, fastModel: true }
      );

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      let slugs: string[] | null = null;
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length === batch.length) {
            slugs = parsed;
          } else {
            console.error(
              `  ⚠️ Classifier LLM returned ${
                Array.isArray(parsed)
                  ? `array of ${parsed.length}, expected ${batch.length}`
                  : "non-array"
              }: ${text.slice(0, 200)}`
            );
          }
        } catch {
          console.error(
            `  ⚠️ Classifier LLM response was not valid JSON: ${text.slice(0, 200)}`
          );
        }
      } else {
        console.error(
          `  ⚠️ Classifier LLM response had no JSON array: ${text.slice(0, 200)}`
        );
      }
      if (slugs) {
        batch.forEach((it, idx) => {
          const topic = topics.find((t) => t.slug === slugs![idx]);
          if (topic) results.set(it.id, topic.id);
        });
      } else {
        const fb = keywordClassify(batch, topics);
        fb.forEach((tid, iid) => results.set(iid, tid));
      }
    } catch (err: any) {
      const status = err?.status as number | undefined;
      const msg = String(err?.message || "");
      const rateLimited = status === 429 || /quota|rate limit|blocked for/i.test(msg);
      if (rateLimited) {
        console.warn(`  ⚠️  LLM classifier disabled — all providers limited (${msg.slice(0, 120)}). Falling back to keywords.`);
        llmDead = true;
      } else {
        console.error("  ⚠️ Classification batch failed, using keywords:", msg);
      }
      const fb = keywordClassify(batch, topics);
      fb.forEach((tid, iid) => results.set(iid, tid));
    }
  }
  return results;
}

// ── Keyword fallback (no LLM needed) ────────────────────────────────

export const KEYWORD_MAP: Record<string, string[]> = {
  // ── Cloud AI topics ──
  "azure-ai": ["azure openai", "azure ai", "azure cognitive", "azure ai studio", "azure ml", "azure machine learning"],
  "aws-ai": ["aws bedrock", "amazon bedrock", "sagemaker", "amazon q", "aws ai", "codewhisperer"],
  "cloud-ai": ["cloud ai", "cloud ml", "cloud gpu", "vertex ai", "google cloud ai"],
  // ── New portal topics (specific → must match before broad) ──
  "context-engineering": ["context engineering", "context window", "context design", "context management", "optimal context", "context budget", "context length"],
  "vibe-coding": ["vibe coding", "vibe-coding", "vibe code", "prompt-to-app", "natural language coding", "ai-generated app", "bolt.new", "v0.dev", "lovable.dev"],
  "agentic-patterns": ["agentic pattern", "agentic design", "agent loop", "react pattern", "plan and execute", "multi-agent", "agent orchestrat", "agent framework", "crewai", "autogen"],
  "ai-evals": ["ai eval", "evaluation harness", "benchmark", "red team", "model assessment", "inspect ai", "lm-eval", "eval framework", "ai testing"],
  "copilot-updates": ["copilot update", "copilot changelog", "copilot release", "copilot feature", "copilot preview"],
  // ── Core topics ──
  rag: ["rag", "retrieval-augmented", "retrieval augmented"],
  "agentic-ai": ["agent", "agentic", "tool use", "multi-step", "ai agent"],
  "claude-code": ["claude code", "claude-code"],
  "agent-skills": ["skill", "plugin", "mcp tool"],
  gpt: ["gpt", "openai", "o1-", "o3-", "chatgpt", "gpt-4", "gpt-5"],
  grok: ["grok", "xai"],
  "mistral-ai": ["mistral", "mixtral", "pixtral"],
  anthropic: ["anthropic", "claude", "sonnet", "haiku", "opus"],
  microsoft: ["microsoft", "phi-", "azure ai"],
  "google-deepmind": ["google", "deepmind", "gemini", "alphafold"],
  "meta-ai": ["meta ai", "llama", "meta llama"],
  "alibaba-cloud": ["alibaba", "qwen", "tongyi"],
  "fine-tuning": ["fine-tun", "lora", "qlora", "peft", "adapter"],
  mcp: ["mcp", "model context protocol"],
  embeddings: ["embedding", "vector search", "similarity"],
  "open-source": ["open source", "open-source", "apache-2", "mit license"],
  "llm-inference": ["inference", "vllm", "ollama", "quantiz", "gguf"],
  "computer-vision": [
    "vision",
    "diffusion",
    "stable diffusion",
    "dalle",
    "image generat",
  ],
  "spring-ai": ["spring ai", "spring boot ai", "java ai", "spring-ai"],
  langchain: ["langchain", "langgraph", "langsmith"],
  "github-copilot": ["copilot", "github copilot", "copilot chat", "copilot agent"],
  "cursor-windsurf": ["cursor", "windsurf", "codeium"],
  "new-models": ["model release", "benchmark", "new model", "released today"],
  "ai-coding": ["code generat", "ai code", "coding assistant", "dev tool"],
  "prompt-engineering": ["prompt engineer", "system prompt", "chain of thought", "few-shot"],
  "ai-safety": ["alignment", "ai safety", "responsible ai", "regulation"],
  mlops: ["mlops", "model deploy", "monitoring", "ci/cd"],
  nlp: ["nlp", "natural language", "translation", "text classif", "sentiment"],
  multimodal: ["multimodal", "vision-language", "audio model", "omni"],
  "ai-hardware": ["gpu", "tpu", "nvidia", "h100", "a100", "ai chip", "cuda"],
  "hugging-face": ["hugging face", "huggingface", "hf model", "spaces"],
  "interview-prep": ["interview", "leetcode", "coding interview", "behavioral", "hiring"],
  "dsa-algorithms": ["algorithm", "data structure", "dsa", "competitive programming", "sorting algorithm", "graph algorithm", "dynamic programming", "binary search", "tree traversal", "linked list", "heap", "hash map", "bfs", "dfs", "greedy algorithm", "backtracking", "leetcode solution"],
  "system-design": ["system design", "software architecture", "scalability", "distributed system", "microservice", "design pattern", "load balancer", "caching", "message queue", "event driven", "high availability", "cap theorem", "database sharding", "api gateway"],
  "web-development": ["react", "nextjs", "next.js", "vue", "svelte", "remix", "frontend", "web dev", "css", "tailwind", "javascript framework", "typescript web", "html", "webpack", "vite", "server component", "web assembly", "wasm"],
  "perplexity-ai": ["perplexity", "pplx", "perplexity ai", "sonar api", "perplexity search"],
  "research-papers": ["research paper", "arxiv paper", "conference paper", "neurips", "icml", "iclr", "cvpr", "aaai", "state-of-the-art", "sota", "ablation study", "paper review", "ml paper"],
  "project-ideas": ["project idea", "side project", "portfolio", "beginner project", "hackathon", "build a"],
  // New portal topics
  "vscode-updates": ["vs code", "vscode", "visual studio code", "vscode release", "vscode extension"],
  "ai-tutorials": ["tutorial", "how to", "walkthrough", "step by step", "beginner guide", "learn ai"],
  "copilot-skills-agents": ["copilot skill", "copilot agent", "agent mode", ".agent.md", "custom agent", "copilot extensib"],
  "mcp-servers": ["mcp server", "mcp integration", "model context protocol server"],
  "ai-tools-comparison": ["comparison", "vs ", " vs ", "better than", "alternative to", "compared to"],
  "ai-industry-news": ["funding", "acquisition", "billion", "partnership", "raised", "valuation", "ipo"],
  "ai-startups": ["startup", "launch", "founded", "seed round", "series a", "y combinator"],
  // ── Enterprise topics (must appear BEFORE broad catches like agentic-ai, ai-coding) ──
  "coding-agents": ["coding agent", "code agent", "autonomous coding", "devin ai", "devin software", " devin ", "opencode", "aider", "continue.dev", " cline ", "cline tool", "codex cli", "swe-agent", "swe-bench", "open-source swe", "ai software engineer", "ai swe"],
  "ai-testing": ["ai testing", "test generation", "ai qa", "playwright ai", "cypress ai", "mutation testing", "test automation ai", "mabl", "testim", "applitools", "ai-generated test"],
  "ai-devops": ["ai devops", "github actions ai", "ai ci/cd", "ai infrastructure", "platform engineering ai", "terraform ai", "ai sre", "ai ops", "aiops"],
  "ai-security": ["prompt injection", "llm security", "ai red team", "jailbreak", "guardrail", "owasp ai", "model security", "data poisoning", "adversarial attack", "llm vulnerability"],
  "ai-governance": ["ai governance", "ai compliance", "model governance", "ai policy", "enterprise ai deploy", "ai cost optim", "ai audit", "responsible deploy", "model risk"],
};

function keywordClassify(
  items: ItemToClassify[],
  topics: Topic[]
): Map<number, number> {
  const results = new Map<number, number>();
  const general = topics.find((t) => t.slug === "general");

  for (const item of items) {
    const haystack =
      `${item.title} ${item.description || ""} ${item.tags.join(" ")}`.toLowerCase();
    let matched = false;

    for (const [slug, keywords] of Object.entries(KEYWORD_MAP)) {
      if (keywords.some((kw) => haystack.includes(kw))) {
        const topic = topics.find((t) => t.slug === slug);
        if (topic) {
          results.set(item.id, topic.id);
          matched = true;
          break;
        }
      }
    }
    if (!matched && general) {
      results.set(item.id, general.id);
    }
  }
  return results;
}
