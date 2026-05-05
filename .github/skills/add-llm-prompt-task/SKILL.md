---
name: add-llm-prompt-task
description: 'Create an LLM batch processing task for DevPulse. Uses askLLM() with system prompts, batch loops, JSON parsing, rate-limit handling, and cross-provider failover. Use when: adding LLM processing, creating a batch task, building an AI pipeline, adding summarization, classification, or extraction.'
---

# Add LLM Prompt Task

Create a new LLM-powered batch processing task that uses the DevPulse `askLLM()` client with rate-limit handling and failover.

## When to Use This Skill

- Adding a new LLM-powered processing step (summarization, classification, extraction, tagging)
- Creating a batch task that processes items through an LLM
- Building an AI pipeline step that runs during the fetch cycle

## Quick Start

1. Create the task file in `backend/src/llm/{task-name}.ts`
2. Follow the batch pattern from `summarizer.ts`
3. Use `askLLM()` with a system prompt and structured output
4. Handle rate-limit errors and provider exhaustion gracefully

## Step-by-Step Procedure

### Step 1 — Create the Task File

Use the [batch task skeleton](./templates/batch-task-skeleton.ts).

Place it in `backend/src/llm/{task-name}.ts`.

### Step 2 — Design the System Prompt

The system prompt should:
- Specify the task clearly in one sentence
- Define the expected output format (JSON array, JSON object, plain text)
- Request "no markdown fences" if expecting JSON
- Keep it under 200 tokens

```typescript
{
  role: "system",
  content: "You classify AI content into topics. For each item return a JSON object with {topic: string, confidence: number}. Return ONLY a JSON array, same order as input. No markdown fences."
}
```

### Step 3 — Implement the Batch Loop

Process items in batches of 10 to stay under rate limits:

```typescript
const BATCH = 10;
let llmDead = false;

for (let i = 0; i < items.length; i += BATCH) {
  if (llmDead) break;
  const batch = items.slice(i, i + BATCH);
  // ... call askLLM, parse response, handle errors
}
```

### Step 4 — Parse LLM Response

Always extract JSON from the response defensively:

```typescript
const { text } = await askLLM(messages, { temperature: 0.2, maxTokens: 2000 });

const jsonMatch = text.match(/\[[\s\S]*\]/);  // Extract JSON array
if (jsonMatch) {
  const parsed: ResultType[] = JSON.parse(jsonMatch[0]);
  // Process results...
}
```

### Step 5 — Handle Rate Limits

The `askLLM()` client handles cross-provider failover internally, but when **all** providers are exhausted it throws. Catch this gracefully:

```typescript
catch (err: any) {
  const msg = String(err?.message || "");
  const rateLimited = err?.status === 429 || /quota|rate limit|blocked for/i.test(msg);
  if (rateLimited) {
    console.warn(`⚠️ Task disabled — all LLMs rate limited`);
    llmDead = true;  // Stop trying for this run
  } else {
    console.error("⚠️ Batch failed:", msg);
  }
}
```

### Step 6 — Integrate into the Pipeline

In `backend/src/fetchers/index.ts`, the pipeline is:
1. Fetch items from sources
2. Insert into DB (dedup)
3. `computeScores()` — scoring
4. `classifyItems()` — LLM topic classification
5. `summarizeItems()` — LLM summarization

Add your task at the appropriate step, typically after insert.

## Guidelines

See [LLM task guidelines](./guidelines/llm-task-guidelines.md) for prompt engineering tips and rate-limit details.

## Reference

See [askLLM API reference](./references/ask-llm-api.md) for the full client interface.
