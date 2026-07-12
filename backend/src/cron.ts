import cron from "node-cron";
import pool from "./db.js";
import { runAllFetchers } from "./fetchers/index.js";
import { sendWeeklyDigest, sendDailyDigest } from "./llm/digest.js";
import { seedYouTubeSources } from "./seed-sources.js";

let fetchInFlight = false;

/**
 * Start the cron scheduler. Reads fetch_interval_minutes from DB settings.
 * Also triggers one fetch 5 seconds after startup.
 */
export function startCron(): void {
  scheduleFromDB();
  scheduleWeeklyDigest();
  scheduleRetentionCleanup();
}

// Rolling retention window (days). Items older than this are pruned nightly,
// EXCEPT any item a user has saved to their library.
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS) || 30;

async function runRetentionCleanup(): Promise<void> {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM items
        WHERE COALESCE(published_at, fetched_at) < NOW() - make_interval(days => $1::int)
          AND id NOT IN (SELECT item_id FROM user_saves)`,
      [RETENTION_DAYS]
    );
    console.log(`🧹 Retention: removed ${rowCount ?? 0} items older than ${RETENTION_DAYS}d (kept saved)`);
  } catch (err) {
    console.error("Retention cleanup error:", err);
  }
}

/** Daily retention cleanup — 03:00 UTC */
function scheduleRetentionCleanup(): void {
  cron.schedule("0 3 * * *", () => {
    console.log(`\n🧹 [${new Date().toISOString()}] Running retention cleanup…`);
    void runRetentionCleanup();
  });

  // Also run once shortly after startup so it doesn't wait until 03:00 UTC.
  setTimeout(() => { void runRetentionCleanup(); }, 30_000);
}

async function scheduleFromDB(): Promise<void> {
  let minutes = 60;
  try {
    const { rows } = await pool.query(
      "SELECT value FROM settings WHERE key = 'fetch_interval_minutes'"
    );
    if (rows.length > 0) minutes = Number(rows[0].value) || 60;
  } catch {
    console.log("⚠️  Could not read interval from DB, using 60 min default");
  }

  // Build cron expression
  const expr =
    minutes >= 60
      ? `0 */${Math.floor(minutes / 60)} * * *`
      : `*/${minutes} * * * *`;

  console.log(`⏰ Cron: every ${minutes} min (${expr})`);

  cron.schedule(expr, async () => {
    if (fetchInFlight) {
      console.log("⏭️ Cron fetch skipped — previous fetch still in flight");
      return;
    }
    fetchInFlight = true;
    console.log(`\n🔄 [${new Date().toISOString()}] Cron fetch starting…`);
    try {
      const stats = await runAllFetchers();
      console.log(`🔄 Cron done: ${stats.itemsInserted} new items`);
    } catch (err) {
      console.error("🔄 Cron error:", err);
    } finally {
      fetchInFlight = false;
    }
  });

  // Run once on startup (5 s delay to let DB connect)
  setTimeout(async () => {
    try {
      await seedYouTubeSources();
    } catch (err) {
      console.error("Seed sources error:", err);
    }
    if (fetchInFlight) {
      console.log("⏭️ Startup fetch skipped — fetch already in flight");
      return;
    }
    fetchInFlight = true;
    console.log("\n🚀 Initial fetch on startup…");
    try {
      await runAllFetchers();
    } catch (err) {
      console.error("Initial fetch error:", err);
    } finally {
      fetchInFlight = false;
    }
  }, 5000);
}

/** Weekly digest — every Monday at 08:00 UTC */
function scheduleWeeklyDigest(): void {
  // "0 8 * * 1" = 08:00 every Monday
  cron.schedule("0 8 * * 1", async () => {
    console.log(`\n📬 [${new Date().toISOString()}] Sending weekly digest…`);
    try {
      await sendWeeklyDigest();
    } catch (err) {
      console.error("Weekly digest error:", err);
    }
  });

  // Daily digest — every day at 07:00 UTC
  cron.schedule("0 7 * * *", async () => {
    console.log(`\n📬 [${new Date().toISOString()}] Sending daily digest…`);
    try {
      await sendDailyDigest();
    } catch (err) {
      console.error("Daily digest error:", err);
    }
  });
}
