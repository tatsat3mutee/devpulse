import { Resend } from "resend";
import pool from "../db.js";

interface DigestItem {
  id: number;
  title: string;
  url: string;
  platform: string;
  type: string;
  topic_name: string | null;
  description: string | null;
  score: number;
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function buildDigestHtml(items: DigestItem[], frequency: "weekly" | "daily"): string {
  const label = frequency === "daily" ? "Daily" : "Weekly";
  const appUrl = process.env.APP_URL || "https://devpulse-q71w.onrender.com";

  const rows = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #2d3748;">
        <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #f1f5f9;">
          <a href="${item.url}" style="color: #10b981; text-decoration: none;">${escapeHtml(item.title)}</a>
        </p>
        <p style="margin: 0; font-size: 12px; color: #64748b;">
          ${escapeHtml(item.platform)} · ${item.topic_name ? escapeHtml(item.topic_name) : item.type} · score ${Math.round(item.score)}
        </p>
        ${item.description ? `<p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">${escapeHtml(item.description.slice(0, 160))}${item.description.length > 160 ? "…" : ""}</p>` : ""}
      </td>
    </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>DevPulse ${label} Digest</title></head>
<body style="background:#0f172a; color:#f1f5f9; font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px;">
    <div style="margin-bottom: 24px;">
      <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 4px; color: #f1f5f9;">DevPulse</h1>
      <p style="margin: 0; font-size: 13px; color: #64748b;">Your ${label.toLowerCase()} AI developer digest</p>
    </div>

    <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">
      Here are the top ${items.length} items from the last ${frequency === "daily" ? "24 hours" : "7 days"}.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tbody>${rows}</tbody>
    </table>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #1e293b;">
      <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">
        <a href="${appUrl}/feed" style="color: #10b981; text-decoration: none;">Open the full feed →</a>
      </p>
      <p style="margin: 0; font-size: 11px; color: #475569;">
        You're receiving this because you subscribed at devpulse.ai.<br/>
        <a href="${appUrl}/unsubscribe" style="color: #475569;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function getTopItems(since: string, limit = 10): Promise<DigestItem[]> {
  const { rows } = await pool.query<DigestItem>(
    `SELECT i.id, i.title, i.url, i.platform, i.type, t.name AS topic_name,
            i.description, i.score
     FROM items i
     LEFT JOIN topics t ON t.id = i.topic_id
     WHERE i.published_at >= $1
     ORDER BY i.score DESC
     LIMIT $2`,
    [since, limit]
  );
  return rows;
}

async function getActiveSubscribers(frequency: "weekly" | "daily"): Promise<string[]> {
  const { rows } = await pool.query<{ email: string }>(
    `SELECT email FROM email_subscribers
     WHERE confirmed = true AND unsubscribed_at IS NULL AND frequency = $1`,
    [frequency]
  );
  return rows.map((r) => r.email);
}

export async function sendWeeklyDigest(): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log("📬 Digest skipped: RESEND_API_KEY not set");
    return;
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [items, subscribers] = await Promise.all([
    getTopItems(since, 10),
    getActiveSubscribers("weekly"),
  ]);

  if (subscribers.length === 0) {
    console.log("📬 Weekly digest: no active subscribers");
    return;
  }
  if (items.length === 0) {
    console.log("📬 Weekly digest: no items this week, skipping");
    return;
  }

  const html = buildDigestHtml(items, "weekly");
  const from = process.env.RESEND_FROM || "DevPulse <digest@devpulse.ai>";

  let sent = 0;
  for (const email of subscribers) {
    try {
      await resend.emails.send({
        from,
        to: email,
        subject: `DevPulse weekly digest — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
        html,
      });
      sent++;
    } catch (err) {
      console.error(`📬 Failed to send to ${email}:`, err);
    }
    // Small delay to stay within Resend rate limits
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`📬 Weekly digest sent to ${sent}/${subscribers.length} subscribers`);
}

export async function sendDailyDigest(): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [items, subscribers] = await Promise.all([
    getTopItems(since, 7),
    getActiveSubscribers("daily"),
  ]);

  if (subscribers.length === 0 || items.length === 0) return;

  const html = buildDigestHtml(items, "daily");
  const from = process.env.RESEND_FROM || "DevPulse <digest@devpulse.ai>";

  for (const email of subscribers) {
    try {
      await resend.emails.send({
        from,
        to: email,
        subject: `DevPulse daily digest — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`,
        html,
      });
    } catch (err) {
      console.error(`📬 Failed to send to ${email}:`, err);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}
