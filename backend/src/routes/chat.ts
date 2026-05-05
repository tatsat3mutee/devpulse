import { Router } from "express";
import { askLLM, hasLLMKey } from "../llm/client.js";

const router = Router();

// ── Perplexity sonar (web search + citations built-in) ───────────────
//
// Models: "sonar" (fast, free tier) | "sonar-pro" (better, paid)
// Response includes `citations[]` — array of source URLs referenced inline
// as [1], [2], etc. in the answer text.

async function perplexityChat(
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<{ text: string; citations: string[] } | null> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages,
        max_tokens: 1024,
      }),
    });
    if (!res.ok) {
      console.warn(`Perplexity error ${res.status}: ${await res.text()}`);
      return null;
    }
    const data: any = await res.json();
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      citations: (data.citations as string[]) ?? [],
    };
  } catch (err: any) {
    console.warn("Perplexity request failed:", err.message);
    return null;
  }
}

// ── System prompt ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are DevPulse AI — a concise, knowledgeable assistant for AI developers.
You help with questions about AI tools, frameworks, models, research, coding, and developer workflows.

Rules:
- Be concise. Target 2-5 sentences unless the user asks for detail.
- Use markdown formatting (bold, links, code blocks) when helpful.
- When you have web search results, reference them inline as [1], [2], etc.
- If you don't know something, say so — don't fabricate.
- Stay focused on AI, developer tools, and software engineering topics.
- When recommending DevPulse pages, use relative paths like /knowledge/rag-guide.`;

// ── POST /api/chat ───────────────────────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const { message, history } = req.body as {
      message?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: "Message too long (max 2000 chars)" });
    }
    if (!process.env.PERPLEXITY_API_KEY && !hasLLMKey()) {
      return res.status(503).json({
        error:
          "No AI key configured. Set PERPLEXITY_API_KEY (recommended) or GEMINI_API_KEY / GROQ_API_KEY / OPENAI_API_KEY.",
      });
    }

    // Build messages array
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add conversation history (last 10 messages max)
    if (Array.isArray(history)) {
      const safeHistory = history
        .filter(
          (m) =>
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
        .slice(-10);
      messages.push(...safeHistory);
    }

    messages.push({ role: "user", content: message });

    // 1️⃣ Perplexity: web-grounded answer + citations
    const perplexityResult = await perplexityChat(messages);
    if (perplexityResult?.text) {
      return res.json({
        reply: perplexityResult.text,
        provider: "perplexity/sonar",
        hasWebSearch: true,
        citations: perplexityResult.citations,
      });
    }

    // 2️⃣ Fallback: existing LLM client (Groq → Gemini → OpenAI), no web search
    const result = await askLLM(messages, { temperature: 0.5, maxTokens: 1024 });
    res.json({
      reply: result.text,
      provider: result.provider,
      hasWebSearch: false,
      citations: [],
    });
  } catch (err: any) {
    console.error("Chat error:", err.message);
    const status = err?.status === 429 ? 429 : 500;
    res.status(status).json({
      error:
        status === 429
          ? "Rate limited — please wait a moment and try again."
          : "Failed to generate a response. Please try again.",
    });
  }
});

export default router;
