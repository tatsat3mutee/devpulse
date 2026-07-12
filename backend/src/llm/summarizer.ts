import { askLLM, hasLLMKey } from "./client.js";

interface ItemToSummarize {
  id: number;
  title: string;
  description: string | null;
  platform: string;
}

/**
 * Batch-summarize items via LLM into concise 1–2 sentence descriptions.
 * Returns map of itemId → summary. Skips if no LLM key.
 */
export async function summarizeItems(
  items: ItemToSummarize[]
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  if (!hasLLMKey() || items.length === 0) return results;

  const BATCH = 10;
  let llmDead = false;
  for (let i = 0; i < items.length; i += BATCH) {
    if (llmDead) break; // every provider exhausted; stop attempting
    const batch = items.slice(i, i + BATCH);
    try {
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
              "You summarize AI/ML content. For each item return a concise 1-2 sentence summary explaining why it matters. Return ONLY a JSON array of strings, same order as input. No markdown fences.",
          },
          {
            role: "user",
            content: `Summarize each:\n${listing}`,
          },
        ],
        { temperature: 0.2, maxTokens: 2000, fastModel: true }
      );

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error(
          `  ⚠️ Summarizer LLM response had no JSON array, skipping batch: ${text.slice(0, 200)}`
        );
        continue;
      }
      let summaries: string[];
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed) || parsed.length !== batch.length) {
          console.error(
            `  ⚠️ Summarizer LLM returned ${
              Array.isArray(parsed)
                ? `array of ${parsed.length}, expected ${batch.length}`
                : "non-array"
            }, skipping batch: ${text.slice(0, 200)}`
          );
          continue;
        }
        summaries = parsed;
      } catch {
        console.error(
          `  ⚠️ Summarizer LLM response was not valid JSON, skipping batch: ${text.slice(0, 200)}`
        );
        continue;
      }
      batch.forEach((it, idx) => {
        if (summaries[idx]) results.set(it.id, summaries[idx]);
      });
    } catch (err: any) {
      const status = err?.status as number | undefined;
      const msg = String(err?.message || "");
      const rateLimited = status === 429 || /quota|rate limit|blocked for/i.test(msg);
      if (rateLimited) {
        console.warn(`  ⚠️  Summarization disabled this run — all LLMs rate limited (${msg.slice(0, 120)})`);
        llmDead = true;
      } else {
        console.error("  ⚠️ Summarization batch failed:", msg);
      }
    }
  }
  return results;
}
