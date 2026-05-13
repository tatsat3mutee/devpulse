import pool from "../src/db.js";

// Load all unclassified items + items in "general" topic
const { rows: items } = await pool.query(`
  SELECT i.id, i.title, i.description, i.tags
  FROM items i
  LEFT JOIN topics t ON i.topic_id = t.id
  WHERE i.topic_id IS NULL OR t.slug = $1
  LIMIT 500
`, ["general"]);

console.log(`Backfilling ${items.length} items...`);

// Inline keyword map (must match topic-classifier.ts order)
const KEYWORD_MAP: Record<string, string[]> = {
  "azure-ai": ["azure openai", "azure ai", "azure cognitive", "azure ai studio", "azure ml", "azure machine learning"],
  "aws-ai": ["aws bedrock", "amazon bedrock", "sagemaker", "amazon q", "aws ai", "codewhisperer"],
  "context-engineering": ["context engineering", "context window", "context design", "context management", "optimal context", "context budget"],
  "vibe-coding": ["vibe coding", "vibe-coding", "vibe code", "prompt-to-app", "bolt.new", "v0.dev", "lovable.dev"],
  "agentic-patterns": ["agentic pattern", "agentic design", "agent loop", "react pattern", "plan and execute", "multi-agent", "agent orchestrat", "crewai", "autogen"],
  "ai-evals": ["ai eval", "evaluation harness", "red team", "model assessment", "lm-eval", "eval framework"],
  "coding-agents": ["coding agent", "code agent", "autonomous coding", "devin ai", "devin software", " devin ", "opencode", "aider", "continue.dev", " cline ", "cline tool", "codex cli", "swe-agent", "swe-bench", "ai software engineer", "ai swe"],
  "ai-testing": ["ai testing", "test generation", "ai qa", "playwright ai", "cypress ai", "mutation testing", "test automation ai", "mabl", "testim", "applitools", "ai-generated test"],
  "ai-devops": ["ai devops", "github actions ai", "ai ci/cd", "ai infrastructure", "terraform ai", "ai sre", "aiops"],
  "ai-security": ["prompt injection", "llm security", "ai red team", "jailbreak", "guardrail", "owasp ai", "model security", "data poisoning", "adversarial attack"],
  "ai-governance": ["ai governance", "ai compliance", "model governance", "ai policy", "enterprise ai deploy", "ai cost optim", "ai audit", "responsible deploy", "model risk"],
  "copilot-updates": ["copilot update", "copilot changelog", "copilot release", "copilot feature", "copilot preview"],
  "claude-code": ["claude code", "claude-code"],
  "cursor-windsurf": ["cursor ide", "windsurf ide", "codeium"],
  rag: ["rag", "retrieval-augmented", "retrieval augmented"],
  "agentic-ai": ["agent", "agentic", "tool use", "multi-step", "ai agent"],
  "agent-skills": ["skill", "plugin", "mcp tool"],
  gpt: ["gpt", "openai", "chatgpt", "gpt-4", "gpt-5"],
  grok: ["grok", "xai"],
  "mistral-ai": ["mistral", "mixtral"],
  anthropic: ["anthropic", "claude", "sonnet", "haiku", "opus"],
  microsoft: ["microsoft", "phi-"],
  "google-deepmind": ["deepmind", "gemini", "alphafold"],
  "meta-ai": ["meta ai", "llama", "meta llama"],
  "fine-tuning": ["fine-tun", "lora", "qlora", "peft"],
  mcp: ["mcp", "model context protocol"],
  embeddings: ["embedding", "vector search"],
  "llm-inference": ["vllm", "ollama", "quantiz", "gguf"],
  "computer-vision": ["diffusion", "stable diffusion", "dalle", "image generat"],
  "spring-ai": ["spring ai", "spring boot ai", "java ai"],
  langchain: ["langchain", "langgraph", "langsmith"],
  "github-copilot": ["github copilot", "copilot chat"],
  "ai-coding": ["code generat", "coding assistant", "dev tool"],
  "prompt-engineering": ["prompt engineer", "system prompt", "chain of thought"],
  "ai-safety": ["alignment", "ai safety", "responsible ai"],
  mlops: ["mlops", "model deploy", "monitoring"],
  nlp: ["natural language", "translation", "text classif"],
  multimodal: ["multimodal", "vision-language", "audio model"],
  "ai-hardware": ["gpu", "tpu", "nvidia", "h100", "a100", "ai chip", "cuda"],
  "hugging-face": ["hugging face", "huggingface", "hf model"],
  "interview-prep": ["interview", "leetcode", "system design", "coding interview", "dsa"],
  "project-ideas": ["project idea", "side project", "portfolio", "beginner project", "hackathon"],
  "vscode-updates": ["vs code", "vscode", "visual studio code"],
  "ai-tutorials": ["tutorial", "how to", "walkthrough", "beginner guide"],
  "copilot-skills-agents": ["copilot skill", "agent mode", ".agent.md", "custom agent"],
  "mcp-servers": ["mcp server", "mcp integration"],
  "ai-tools-comparison": ["comparison", "better than", "alternative to", "compared to"],
  "ai-industry-news": ["funding", "acquisition", "billion", "partnership", "raised", "valuation"],
  "ai-startups": ["startup", "launch", "founded", "seed round", "series a", "y combinator"],
};

// Load topics from DB
const { rows: topics } = await pool.query("SELECT id, slug FROM topics");
const topicMap = new Map(topics.map((t: any) => [t.slug, t.id]));
const generalId = topicMap.get("general");

let updated = 0;
for (const item of items) {
  const haystack = `${item.title} ${item.description || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
  let matched = false;
  for (const [slug, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(kw => haystack.includes(kw))) {
      const topicId = topicMap.get(slug);
      if (topicId) {
        await pool.query("UPDATE items SET topic_id = $1 WHERE id = $2", [topicId, item.id]);
        updated++;
        matched = true;
        break;
      }
    }
  }
  // leave unmatched items in general
}

// Count coding-agents
const { rows: ca } = await pool.query("SELECT COUNT(*) FROM items i JOIN topics t ON i.topic_id = t.id WHERE t.slug = $1", ["coding-agents"]);
console.log(`Updated ${updated} items. coding-agents now has: ${ca[0].count} items`);
await pool.end();

