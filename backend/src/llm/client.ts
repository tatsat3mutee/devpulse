// Unified LLM client — Groq (fastest) → Gemini → OpenAI
// Uses native fetch() available in Bun

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMResponse {
  text: string;
  provider: string;
}

interface CallOpts {
  temperature?: number;
  maxTokens?: number;
}

// ── OpenAI-compatible (works for Groq + OpenAI) ──────────────────────

async function callOpenAICompat(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  opts: CallOpts
): Promise<string> {
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 1024,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM ${model} error ${res.status}: ${body.slice(0, 200)}`);
  }
  const data: any = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Gemini native REST ───────────────────────────────────────────────

async function callGemini(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  opts: CallOpts
): Promise<string> {
  // Merge system prompt into first user message (Gemini doesn't have system role in REST v1beta)
  const systemMsg = messages.find((m) => m.role === "system");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  if (systemMsg && contents.length > 0) {
    contents[0].parts[0].text = `${systemMsg.content}\n\n${contents[0].parts[0].text}`;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          maxOutputTokens: opts.maxTokens ?? 1024,
        },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini error ${res.status}: ${body.slice(0, 200)}`);
  }
  const data: any = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── Provider selection (all available, ordered: Groq → Gemini → OpenAI) ──

interface Provider {
  name: string;
  call: (msgs: ChatMessage[], o: CallOpts) => Promise<string>;
}

function getAllProviders(): Provider[] {
  const providers: Provider[] = [];
  const groq = process.env.GROQ_API_KEY;
  const gemini = process.env.GEMINI_API_KEY;
  const openai = process.env.OPENAI_API_KEY;

  if (groq) {
    providers.push({
      name: "groq",
      call: (msgs, o) =>
        callOpenAICompat(
          "https://api.groq.com/openai/v1/chat/completions",
          groq,
          "llama-3.3-70b-versatile",
          msgs,
          o
        ),
    });
  }
  if (gemini) {
    providers.push({
      name: "gemini",
      call: (msgs, o) => callGemini(gemini, "gemini-2.0-flash", msgs, o),
    });
  }
  if (openai) {
    providers.push({
      name: "openai",
      call: (msgs, o) =>
        callOpenAICompat(
          "https://api.openai.com/v1/chat/completions",
          openai,
          "gpt-4o-mini",
          msgs,
          o
        ),
    });
  }
  return providers;
}

// ── Public API ───────────────────────────────────────────────────────

export async function askLLM(
  messages: ChatMessage[],
  opts?: CallOpts
): Promise<LLMResponse> {
  const providers = getAllProviders();
  if (providers.length === 0) {
    throw new Error(
      "No LLM key set. Add GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY to .env"
    );
  }

  // Try each provider, fall through on rate limit (429)
  for (const provider of providers) {
    try {
      const text = await provider.call(messages, opts ?? {});
      return { text, provider: provider.name };
    } catch (err: any) {
      const is429 = err.message?.includes("429") || err.message?.includes("rate limit");
      if (is429 && providers.indexOf(provider) < providers.length - 1) {
        console.log(`  ⚠️  ${provider.name} rate limited, trying next provider…`);
        continue;
      }
      throw err;
    }
  }
  throw new Error("All LLM providers failed");
}

export function hasLLMKey(): boolean {
  return !!(
    process.env.GROQ_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY
  );
}
