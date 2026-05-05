# askLLM API Reference

Source: `backend/src/llm/client.ts`

## Interfaces

```typescript
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CallOpts {
  temperature?: number;  // default: 0.3
  maxTokens?: number;    // default: 1024
}

interface LLMResponse {
  text: string;       // The LLM's response text
  provider: string;   // Which provider answered: "groq", "gemini", "openai"
}
```

## Functions

### `askLLM(messages, opts?): Promise<LLMResponse>`

Send a chat completion request with automatic cross-provider failover.

**Provider order**: Groq (fastest) → Gemini → OpenAI

**Features**:
- Per-provider rate limiting (token bucket, honors free-tier RPM)
- Exponential backoff with retries on transient failures (429, 5xx)
- Honors Gemini's `retryDelay` field when provided
- Cross-provider failover on persistent 429 / quota errors
- Daily-quota tracking

**Rate limits**:
| Provider | RPM Cap | Notes |
|----------|---------|-------|
| Groq | 25 | Free tier: 30 RPM, headroom |
| Gemini | 12 | Free tier: 15 RPM for 2.0-flash |
| OpenAI | 50 | Depends on tier |

**Throws** when all providers are exhausted (429/quota from all three).

### `hasLLMKey(): boolean`

Returns `true` if at least one LLM API key is configured in environment variables.

Always check this before running LLM tasks:
```typescript
if (!hasLLMKey()) return results;
```

## Environment Variables

```
GROQ_API_KEY=...        # Groq Cloud
GEMINI_API_KEY=...      # Google AI Studio
OPENAI_API_KEY=...      # OpenAI Platform
```

At least one must be set for LLM features to work.

## Existing LLM Tasks

| Task | File | Purpose |
|------|------|---------|
| Summarize | `llm/summarizer.ts` | 1-2 sentence summaries per item |
| Classify | `llm/topic-classifier.ts` | Assign items to topics |

## Usage Pattern (from summarizer.ts)

```typescript
import { askLLM, hasLLMKey } from "./client.js";

export async function summarizeItems(items: ItemToSummarize[]): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  if (!hasLLMKey() || items.length === 0) return results;

  const BATCH = 10;
  let llmDead = false;

  for (let i = 0; i < items.length; i += BATCH) {
    if (llmDead) break;
    const batch = items.slice(i, i + BATCH);

    try {
      const listing = batch
        .map((it, idx) => `[${idx + 1}] "${it.title}" (${it.platform})${it.description ? `: ${it.description.slice(0, 200)}` : ""}`)
        .join("\n");

      const { text } = await askLLM([
        { role: "system", content: "You summarize AI/ML content. ..." },
        { role: "user", content: `Summarize each:\n${listing}` },
      ], { temperature: 0.2, maxTokens: 2000 });

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const summaries: string[] = JSON.parse(jsonMatch[0]);
        batch.forEach((it, idx) => {
          if (summaries[idx]) results.set(it.id, summaries[idx]);
        });
      }
    } catch (err: any) {
      const msg = String(err?.message || "");
      const rateLimited = err?.status === 429 || /quota|rate limit|blocked for/i.test(msg);
      if (rateLimited) { llmDead = true; }
      else { console.error("Batch failed:", msg); }
    }
  }
  return results;
}
```
