export interface SearchItem {
  title: string;
  desc: string;
  path: string;
  type: "page" | "guide" | "topic" | "tool" | "external";
  url?: string; // for external links only
}

export const SEARCH_INDEX: SearchItem[] = [
  // Pages
  { title: "Dashboard", desc: "Trending topics & activity overview", path: "/", type: "page" },
  { title: "Chat", desc: "Ask DevPulse AI with web search", path: "/chat", type: "page" },
  { title: "Feed", desc: "Browse AI items from 7+ platforms", path: "/feed", type: "page" },
  { title: "Topics", desc: "49 curated AI topics", path: "/topics", type: "page" },
  { title: "Dev Hub", desc: "Essential AI developer tools", path: "/devhub", type: "page" },
  { title: "Knowledge", desc: "In-depth learning guides", path: "/knowledge", type: "page" },
  { title: "Videos", desc: "AI tutorials & talks", path: "/videos", type: "page" },
  { title: "Sources", desc: "75 active data sources", path: "/sources", type: "page" },
  { title: "Learning Paths", desc: "Career roadmaps & AI roles", path: "/learn", type: "page" },
  { title: "Settings", desc: "Preferences & configuration", path: "/settings", type: "page" },
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
  { title: "Claude Code Guide", desc: "Terminal AI assistant, agentic loops", path: "/knowledge/claude-code-guide", type: "guide" },
  { title: "LLM Fine-Tuning", desc: "LoRA, QLoRA, PEFT, custom training", path: "/knowledge/llm-fine-tuning", type: "guide" },
  { title: "RAG & Vectorless RAG", desc: "Retrieval, vector search, Graph RAG", path: "/knowledge/rag-guide", type: "guide" },
  { title: "Awesome Copilot", desc: "Skills, agents, plugins, instructions", path: "/knowledge/awesome-copilot-guide", type: "guide" },
  { title: "Azure AI Services", desc: "Azure OpenAI, AI Studio", path: "/knowledge/azure-ai-services", type: "guide" },
  { title: "AWS AI & Bedrock", desc: "Bedrock, SageMaker, Amazon Q", path: "/knowledge/aws-ai-bedrock", type: "guide" },
  { title: "Karpathy AI from Scratch", desc: "nanoGPT, micrograd, neural nets", path: "/knowledge/karpathy-ai-from-scratch", type: "guide" },
  { title: "Spring Boot + Azure AI", desc: "Spring AI, Azure OpenAI, Java cloud AI", path: "/knowledge/spring-boot-azure-ai", type: "guide" },
  // Topics (popular)
  { title: "RAG", desc: "Retrieval-Augmented Generation", path: "/topic/rag", type: "topic" },
  { title: "GitHub Copilot", desc: "AI pair programming", path: "/topic/github-copilot", type: "topic" },
  { title: "Fine-tuning", desc: "Custom model training", path: "/topic/fine-tuning", type: "topic" },
  { title: "AI Safety", desc: "Alignment and responsible AI", path: "/topic/ai-safety", type: "topic" },
  { title: "Agentic Patterns", desc: "Autonomous AI agents", path: "/topic/agentic-patterns", type: "topic" },
  { title: "Context Engineering", desc: "LLM context optimization", path: "/topic/context-engineering", type: "topic" },
  { title: "Vibe Coding", desc: "AI-powered rapid development", path: "/topic/vibe-coding", type: "topic" },
  { title: "Prompt Engineering", desc: "Effective LLM prompting", path: "/topic/prompt-engineering", type: "topic" },
  { title: "MCP Servers", desc: "Model Context Protocol tools", path: "/topic/mcp", type: "topic" },
  { title: "Open Source AI", desc: "Open models and frameworks", path: "/topic/open-source", type: "topic" },
  // External resources
  { title: "GitHub Copilot Docs", desc: "docs.github.com/copilot", path: "", type: "external", url: "https://docs.github.com/en/copilot" },
  { title: "Anthropic Docs", desc: "docs.anthropic.com", path: "", type: "external", url: "https://docs.anthropic.com" },
  { title: "OpenAI Platform", desc: "platform.openai.com/docs", path: "", type: "external", url: "https://platform.openai.com/docs" },
  { title: "Hugging Face Docs", desc: "huggingface.co/docs", path: "", type: "external", url: "https://huggingface.co/docs" },
  { title: "LangChain Docs", desc: "docs.langchain.com", path: "", type: "external", url: "https://docs.langchain.com" },
  { title: "DeepLearning.AI Courses", desc: "Free short courses", path: "", type: "external", url: "https://www.deeplearning.ai/short-courses/" },
  { title: "fast.ai Course", desc: "Practical Deep Learning", path: "", type: "external", url: "https://course.fast.ai" },
  { title: "arXiv cs.AI", desc: "Latest AI research papers", path: "", type: "external", url: "https://arxiv.org/list/cs.AI/recent" },
];

export function searchIndex(query: string, limit = 10): SearchItem[] {
  if (!query.trim()) return [];
  const terms = query.toLowerCase().split(/\s+/);
  return SEARCH_INDEX.filter((item) =>
    terms.every(
      (t) =>
        item.title.toLowerCase().includes(t) ||
        item.desc.toLowerCase().includes(t) ||
        item.type.includes(t)
    )
  ).slice(0, limit);
}
