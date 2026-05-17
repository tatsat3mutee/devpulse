import pool from "./db.js";

/**
 * Compute hotness score for items: engagement (70%) + recency (30%)
 * Score is 0–100. Used to rank the feed — higher = more prominent.
 */
export async function computeScores(itemIds: number[]): Promise<void> {
  if (itemIds.length === 0) return;

  const { rows } = await pool.query(
    "SELECT id, platform, metadata, published_at FROM items WHERE id = ANY($1)",
    [itemIds]
  );

  for (const item of rows) {
    const engagement = engagementScore(item.platform, item.metadata || {});
    const recency = recencyScore(item.published_at);
    const score =
      Math.round((engagement * 0.7 + recency * 0.3) * 100) / 100;

    await pool.query("UPDATE items SET score = $1 WHERE id = $2", [
      score,
      item.id,
    ]);
  }
}

// ── Engagement: log-scaled 0–100 based on platform metrics ──────────

function engagementScore(
  platform: string,
  meta: Record<string, any>
): number {
  let raw = 0;

  switch (platform) {
    case "Reddit":
      raw = (meta.upvotes || 0) * 0.7 + (meta.comments || 0) * 0.3;
      break;
    case "Hacker News":
      raw = (meta.points || 0) * 0.7 + (meta.comments || 0) * 0.3;
      break;
    case "GitHub":
      raw =
        (meta.stars || 0) * 0.5 +
        (meta.forks || 0) * 0.3 +
        (meta.watchers || 0) * 0.2;
      break;
    case "Hugging Face":
      raw = (meta.likes || 0) * 1.5;
      break;
    case "arXiv":
      raw = 45; // boosted base — curated academic papers are high-value deep content
      break;
    default:
      raw = 20;
  }

  // log-scale: maps 0→0, 100→50, 10000→100
  return Math.min(100, (Math.log(1 + raw) / Math.log(10001)) * 100);
}

// ── Recency: decay curve 0–100 ─────────────────────────────────────

function recencyScore(publishedAt: Date | string | null): number {
  if (!publishedAt) return 30;
  const hoursAgo =
    (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);

  if (hoursAgo < 6) return 100;
  if (hoursAgo < 24) return 90;
  if (hoursAgo < 72) return 70;
  if (hoursAgo < 168) return 50; // 7 days
  if (hoursAgo < 336) return 30; // 14 days
  return 10;
}
