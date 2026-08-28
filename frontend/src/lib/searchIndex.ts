export interface SearchItem {
  title: string;
  desc: string;
  path: string;
  type: "page" | "guide" | "topic" | "tool" | "external" | "item";
  url?: string; // for external links only
}

export const SEARCH_INDEX: SearchItem[] = [
  // Pages — the three nav surfaces plus what's kept off-nav.
  { title: "Today", desc: "Your served concept", path: "/", type: "page" },
  { title: "Coverage", desc: "The five areas against your ledger", path: "/coverage", type: "page" },
  { title: "Archive", desc: "Every concept extracted so far", path: "/archive", type: "page" },
  { title: "Chat", desc: "Ask DevPulse AI", path: "/chat", type: "page" },
  { title: "Models", desc: "Frontier model benchmarks", path: "/models", type: "page" },
  { title: "Saved", desc: "Your saved items", path: "/library", type: "page" },
  { title: "Sources", desc: "Where the raw material comes from", path: "/sources", type: "page" },
  { title: "Settings", desc: "Delivery days, areas, preferences", path: "/settings", type: "page" },
  // Areas — deep-link into a filtered archive.
  { title: "Inference & serving", desc: "KV caching, paging, quantization, decoding", path: "/archive?area=inference-serving", type: "topic" },
  { title: "Open weights", desc: "Open-weight model landscape and licensing", path: "/archive?area=open-weights", type: "topic" },
  { title: "Agents & context", desc: "Context engineering, agent loops, memory", path: "/archive?area=agent-context", type: "topic" },
  { title: "Evals & reliability", desc: "Eval design, LLM judges, AI security", path: "/archive?area=evals-reliability", type: "topic" },
  { title: "Credentials", desc: "AI certification landscape", path: "/archive?area=credentials", type: "topic" },
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
