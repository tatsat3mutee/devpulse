// Unified LLM client — Groq (fastest) → Gemini → OpenAI
// Uses native fetch() available in Bun
//
// Features:
//  - Per-provider rate limiting (token bucket, honors free-tier RPM)
//  - Exponential backoff with retries on transient failures (429, 5xx)
//  - Honors Gemini's `retryDelay` field when provided
//  - Cross-provider failover on persistent 429 / quota errors
//  - Daily-quota tracking so we don't hammer a dead provider for hours

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
  /** Use a smaller/faster model (llama-3.1-8b-instant on Groq). Ideal for
   *  classification/summarization — higher token-rate limits, lower latency. */
  fastModel?: boolean;
}

// ── Rate limiting state (in-memory, per process) ─────────────────────

interface RateState {
  // Sliding window of recent request timestamps (ms)
  recent: number[];
  // RPM cap (requests per 60s)
  rpm: number;
  // If set, do not call this provider again until this timestamp (ms)
  blockedUntil: number;
}

const rateState: Record<string, RateState> = {
  groq: { recent: [], rpm: 25, blockedUntil: 0 },     // free: 30 RPM, leave headroom
  gemini: { recent: [], rpm: 12, blockedUntil: 0 },   // free: 15 RPM for 2.0-flash
  openai: { recent: [], rpm: 50, blockedUntil: 0 },   // depends on tier
};

function purgeOld(state: RateState) {
  const cutoff = Date.now() - 60_000;
  while (state.recent.length && state.recent[0] < cutoff) state.recent.shift();
}

/** Wait until under the RPM cap; resolves immediately if room. */
async function acquireSlot(provider: string): Promise<void> {
  const state = rateState[provider];
  if (!state) return;
  // Honor a temporary block (e.g. daily quota exhausted)
  if (Date.now() < state.blockedUntil) {
    const wait = state.blockedUntil - Date.now();
    throw new Error(`${provider} blocked for ${Math.ceil(wait / 1000)}s (quota)`);
  }
  purgeOld(state);
  if (state.recent.length < state.rpm) {
    state.recent.push(Date.now());
    return;
  }
  // Need to wait until oldest timestamp falls outside the 60s window.
  const waitMs = 60_000 - (Date.now() - state.recent[0]) + 50;
  await sleep(waitMs);
  return acquireSlot(provider);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Block a provider for `ms` (used after 429 with retryDelay or quota). */
function blockProvider(provider: string, ms: number) {
  const state = rateState[provider];
  if (!state) return;
  state.blockedUntil = Math.max(state.blockedUntil, Date.now() + ms);
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
    const err: any = new Error(`LLM ${model} error ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    err.body = body;
    // Honor Retry-After header (seconds) if present
    const retryAfter = res.headers.get("retry-after");
    if (retryAfter) err.retryAfterMs = Number(retryAfter) * 1000;
    throw err;
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
    const err: any = new Error(`Gemini error ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    err.body = body;
    // Parse Gemini's RetryInfo if present: { error: { details: [{ "@type": ".../RetryInfo", retryDelay: "27s" }] } }
    try {
      const parsed = JSON.parse(body);
      const details = parsed?.error?.details ?? [];
      for (const d of details) {
        if (typeof d?.retryDelay === "string") {
          const m = d.retryDelay.match(/^(\d+)(?:\.\d+)?s$/);
          if (m) err.retryAfterMs = Number(m[1]) * 1000;
        }
      }
      // Per-day quota exhaustion -> block provider for an hour
      const message = String(parsed?.error?.message || "").toLowerCase();
      if (message.includes("per day") || message.includes("quota") || message.includes("billing")) {
        err.quotaExhausted = true;
      }
    } catch { /* body wasn't JSON */ }
    throw err;
  }
  const data: any = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── Provider selection ──────────────────────────────────────────────

interface Provider {
  name: string;
  call: (msgs: ChatMessage[], o: CallOpts) => Promise<string>;
}

function getAllProviders(opts?: CallOpts): Provider[] {
  const providers: Provider[] = [];
  const groq = process.env.GROQ_API_KEY;
  const gemini = process.env.GEMINI_API_KEY;
  const openai = process.env.OPENAI_API_KEY;

  if (groq) {
    // llama-3.1-8b-instant: 30 RPM / 20k TPM (5x more tokens than 70b) — good for classification
    // llama-3.3-70b-versatile: 30 RPM / 6k TPM — reserved for chat/reasoning
    const model = opts?.fastModel ? "llama-3.1-8b-instant" : "llama-3.3-70b-versatile";
    providers.push({
      name: "groq",
      call: (msgs, o) =>
        callOpenAICompat(
          "https://api.groq.com/openai/v1/chat/completions",
          groq,
          model,
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

const MAX_RETRIES_PER_PROVIDER = 2;

export async function askLLM(
  messages: ChatMessage[],
  opts?: CallOpts
): Promise<LLMResponse> {
  const providers = getAllProviders(opts);
  if (providers.length === 0) {
    throw new Error(
      "No LLM key set. Add GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY to .env"
    );
  }

  let lastErr: any;
  for (const provider of providers) {    // Skip providers currently in cool-down
    if (Date.now() < (rateState[provider.name]?.blockedUntil ?? 0)) {
      continue;
    }

    for (let attempt = 0; attempt <= MAX_RETRIES_PER_PROVIDER; attempt++) {
      try {
        await acquireSlot(provider.name);
        const text = await provider.call(messages, opts ?? {});
        return { text, provider: provider.name };
      } catch (err: any) {
        lastErr = err;
        const status = err?.status as number | undefined;
        const isRateLimit = status === 429;
        const isServerError = typeof status === "number" && status >= 500;
        const isQuotaExhausted = err?.quotaExhausted === true;

        // Hard quota out → block this provider for 1 hour and move on
        if (isQuotaExhausted) {
          blockProvider(provider.name, 60 * 60 * 1000);
          console.log(`  🚫 ${provider.name}: daily quota exhausted, cooling off 1h`);
          break; // try next provider
        }

        if (isRateLimit || isServerError) {
          // Backoff: prefer server-suggested delay, else exp backoff
          const suggested = err?.retryAfterMs as number | undefined;
          const backoff =
            suggested !== undefined
              ? Math.min(suggested, 30_000)
              : Math.min(1000 * 2 ** attempt, 8000);

          if (attempt < MAX_RETRIES_PER_PROVIDER) {
            console.log(
              `  ⏳ ${provider.name} ${status} — retry ${attempt + 1}/${MAX_RETRIES_PER_PROVIDER} in ${Math.round(backoff)}ms`
            );
            await sleep(backoff);
            continue;
          }
          // Give the rate-limited provider a brief cool-off so the next caller skips it
          if (isRateLimit) blockProvider(provider.name, 30_000);
          console.log(`  ↪️  ${provider.name} still ${status} after retries, trying next provider`);
          break; // try next provider
        }

        // Non-retryable error → bail entirely
        throw err;
      }
    }
  }

  throw lastErr ?? new Error("All LLM providers failed");
}

export function hasLLMKey(): boolean {
  return !!(
    process.env.GROQ_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY
  );
}

/** Diagnostic: snapshot of rate-limit state (for /api/health or debugging). */
export function getLLMRateState() {
  return Object.fromEntries(
    Object.entries(rateState).map(([k, v]) => [
      k,
      {
        rpm_cap: v.rpm,
        in_window: v.recent.length,
        blocked_for_ms: Math.max(0, v.blockedUntil - Date.now()),
      },
    ])
  );
}

