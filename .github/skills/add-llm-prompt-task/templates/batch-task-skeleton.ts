import { askLLM, hasLLMKey } from "./client.js";

interface ItemToProcess {
  id: number;
  title: string;
  description: string | null;
  platform: string;
}

interface {{TaskName}}Result {
  // Define the per-item result shape:
  // summary: string;
  // category: string;
  // confidence: number;
}

/**
 * Batch-process items via LLM for {{TASK_DESCRIPTION}}.
 * Returns map of itemId → result. Skips if no LLM key.
 */
export async function {{taskFunctionName}}(
  items: ItemToProcess[]
): Promise<Map<number, {{TaskName}}Result>> {
  const results = new Map<number, {{TaskName}}Result>();
  if (!hasLLMKey() || items.length === 0) return results;

  const BATCH = 10;
  let llmDead = false;

  for (let i = 0; i < items.length; i += BATCH) {
    if (llmDead) break;
    const batch = items.slice(i, i + BATCH);

    try {
      // Format items for the prompt
      const listing = batch
        .map(
          (it, idx) =>
            `[${idx + 1}] "${it.title}" (${it.platform})${
              it.description ? `: ${it.description.slice(0, 200)}` : ""
            }`
        )
        .join("\n");

      const { text } = await askLLM(
        [
          {
            role: "system",
            content:
              // Replace with your task-specific system prompt:
              "You {{TASK_VERB}} AI/ML content. For each item return {{EXPECTED_OUTPUT_DESCRIPTION}}. Return ONLY a JSON array of objects, same order as input. No markdown fences.",
          },
          {
            role: "user",
            content: `Process each:\n${listing}`,
          },
        ],
        { temperature: 0.2, maxTokens: 2000 }
      );

      // Parse the JSON response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed: {{TaskName}}Result[] = JSON.parse(jsonMatch[0]);
        batch.forEach((it, idx) => {
          if (parsed[idx]) results.set(it.id, parsed[idx]);
        });
      }
    } catch (err: any) {
      const status = err?.status as number | undefined;
      const msg = String(err?.message || "");
      const rateLimited =
        status === 429 || /quota|rate limit|blocked for/i.test(msg);

      if (rateLimited) {
        console.warn(
          `  ⚠️  {{TaskName}} disabled this run — all LLMs rate limited (${msg.slice(0, 120)})`
        );
        llmDead = true;
      } else {
        console.error("  ⚠️ {{TaskName}} batch failed:", msg);
      }
    }
  }

  return results;
}
