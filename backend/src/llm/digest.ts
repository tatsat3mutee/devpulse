import { Resend } from "resend";
import pool from "../db.js";
import { editionSubject, renderEditionEmail } from "../concepts/render.js";
import { loadEdition, serveEdition } from "../concepts/serve.js";

/**
 * Edition delivery.
 *
 * This file used to send `SELECT ... ORDER BY score DESC LIMIT 10` as an HTML
 * table — a popularity ranking with no editorial judgment, sitting alongside a
 * separate, richer Morning Brief that was never emailed. Both are gone: there
 * is now one artifact, the served edition, rendered from the same `Edition`
 * object the web view consumes.
 */

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

function appUrl(): string {
  return process.env.APP_URL || "https://devpulse-q71w.onrender.com";
}

/**
 * Email today's edition to every user who is due one and has email enabled.
 *
 * Runs after `runServeJob()`, and re-serves defensively so a user whose edition
 * failed to build during the serve pass still gets one rather than being
 * silently skipped for the week.
 */
export async function sendEditionEmails(): Promise<{ sent: number; skipped: number }> {
  const resend = getResend();
  if (!resend) {
    console.log("📬 Edition email skipped: RESEND_API_KEY not set");
    return { sent: 0, skipped: 0 };
  }

  const dow = new Date().getDay();
  const today = new Date().toISOString().slice(0, 10);

  const { rows: users } = await pool.query<{ id: number; email: string }>(
    `SELECT id, email FROM users
      WHERE COALESCE(email_concepts, true) = true
        AND $1 = ANY(COALESCE(serve_days, '{2,5}'::int[]))`,
    [dow]
  );

  const from = process.env.RESEND_FROM || "DevPulse <concepts@devpulse.ai>";
  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      let edition = await loadEdition(user.id);
      if (!edition || edition.served_on !== today) {
        edition = (await serveEdition(user.id)) ?? null;
      }
      if (!edition?.lead) {
        skipped++;
        continue;
      }

      await resend.emails.send({
        from,
        to: user.email,
        subject: editionSubject(edition),
        html: renderEditionEmail(edition, appUrl()),
      });
      sent++;
    } catch (err) {
      console.error(`📬 Failed to send edition to ${user.email}:`, err);
      skipped++;
    }
    // Stay within Resend's rate limit.
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`📬 Editions emailed: ${sent} sent, ${skipped} skipped (${users.length} due today)`);
  return { sent, skipped };
}
