# LLM Task Guidelines

## Prompt Engineering

### System Prompt Best Practices
1. **One task per prompt** — don't combine summarization + classification
2. **Specify output format explicitly** — "Return ONLY a JSON array of strings"
3. **Request no fences** — "No markdown fences" prevents ` ```json ``` ` wrappers
4. **Keep it concise** — system prompts under 200 tokens save cost
5. **Include domain context** — "You analyze AI/ML content" helps the model

### Temperature Settings
| Task Type | Temperature | Rationale |
|-----------|-------------|-----------|
| Classification | 0.1–0.2 | Deterministic, consistent labels |
| Summarization | 0.2–0.3 | Slightly creative but factual |
| Generation | 0.5–0.7 | More creative freedom |
| Extraction | 0.0–0.1 | Exact matches needed |

### maxTokens Settings
| Output Type | maxTokens | Rationale |
|-------------|-----------|-----------|
| Short labels | 500 | One word/phrase per item |
| Summaries | 2000 | 1-2 sentences × 10 items |
| Structured JSON | 2000–3000 | Objects with multiple fields |
| Long-form text | 4000 | Paragraphs or articles |

## Batch Processing

### Batch Size
- **Default**: 10 items per batch
- **Short tasks** (classification): up to 20
- **Long tasks** (detailed analysis): 5
- Always process batches sequentially (not parallel) to respect rate limits

### Item Formatting
Number items in the listing for reliable ordering:
```
[1] "Title" (Platform): Description...
[2] "Title" (Platform): Description...
```

Truncate descriptions to 200 chars to save tokens.

### JSON Parsing
Always extract JSON defensively:
```typescript
// For arrays:
const jsonMatch = text.match(/\[[\s\S]*\]/);
// For objects:
const jsonMatch = text.match(/\{[\s\S]*\}/);
```

Never assume the LLM returns clean JSON — it may prepend text or add fences.

## Rate Limit Handling

### The `llmDead` Pattern
```typescript
let llmDead = false;
for (...) {
  if (llmDead) break;  // Skip remaining batches
  try { ... }
  catch (err) {
    if (isRateLimited(err)) llmDead = true;  // Give up for this run
  }
}
```

This prevents hammering exhausted providers. The cron will retry next cycle.

### Rate Limit Detection
```typescript
const rateLimited = err?.status === 429 || /quota|rate limit|blocked for/i.test(msg);
```

### Provider RPM Limits (Free Tier)
| Provider | RPM | Daily Limit |
|----------|-----|-------------|
| Groq | 25 | ~14,400 |
| Gemini | 12 | ~1,500 |
| OpenAI | 50 | Depends on tier |

### Failover Behavior
`askLLM()` handles failover automatically:
1. Tries Groq first (fastest)
2. Falls back to Gemini on Groq 429
3. Falls back to OpenAI on Gemini 429
4. Throws if all three are exhausted

Your task code only needs to catch the final throw.

## Integration Points

The fetch pipeline in `backend/src/fetchers/index.ts`:

```
1. Fetch items from sources (API calls)
2. Insert into DB (ON CONFLICT dedup)
3. computeScores()        ← scoring
4. classifyItems()        ← LLM: topic assignment
5. summarizeItems()       ← LLM: summaries
6. [Your new task here]   ← add after appropriate step
```

To integrate:
1. Import your function in `index.ts`
2. Call it after the relevant step
3. Update the database with results if needed
