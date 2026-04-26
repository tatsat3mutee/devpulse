import cron from "node-cron";
import pool from "./db.js";
import { runAllFetchers } from "./fetchers/index.js";

/**
 * Start the cron scheduler. Reads fetch_interval_minutes from DB settings.
 * Also triggers one fetch 5 seconds after startup.
 */
export function startCron(): void {
  scheduleFromDB();
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
    console.log(`\n🔄 [${new Date().toISOString()}] Cron fetch starting…`);
    try {
      const stats = await runAllFetchers();
      console.log(`🔄 Cron done: ${stats.itemsInserted} new items`);
    } catch (err) {
      console.error("🔄 Cron error:", err);
    }
  });

  // Run once on startup (5 s delay to let DB connect)
  setTimeout(async () => {
    console.log("\n🚀 Initial fetch on startup…");
    try {
      await runAllFetchers();
    } catch (err) {
      console.error("Initial fetch error:", err);
    }
  }, 5000);
}
