import { Router, Request, Response } from "express";
import pool from "../db.js";
import { Resend } from "resend";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const MAX_EMAIL_LENGTH = 254;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// POST /api/subscribe — add email to digest list
router.post("/", async (req: Request, res: Response) => {
  const { email: rawEmail, frequency = "weekly" } = req.body as { email?: string; frequency?: string };
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }
  if (!["weekly", "daily"].includes(frequency)) {
    res.status(400).json({ error: "Invalid frequency" });
    return;
  }

  try {
    await pool.query(
      `INSERT INTO email_subscribers (email, frequency)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE
         SET frequency = EXCLUDED.frequency,
             unsubscribed_at = NULL,
             confirmed = true`,
      [email, frequency]
    );

    // Send a welcome email if Resend is configured
    const resend = getResend();
    if (resend) {
      await resend.emails.send({
        from: process.env.RESEND_FROM || "DevPulse <digest@devpulse.ai>",
        to: email,
        subject: "You're subscribed to DevPulse",
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #333;">
            <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Welcome to DevPulse 👋</h2>
            <p style="color: #555; line-height: 1.6;">
              You're now subscribed to the <strong>${frequency}</strong> AI developer digest —
              the top papers, repos, releases, and discussions, delivered straight to your inbox.
            </p>
            <p style="color: #555; line-height: 1.6;">
              No noise. No sponsored content. Just signal.
            </p>
            <p style="margin-top: 24px;">
              <a href="${process.env.APP_URL || "https://devpulse-q71w.onrender.com"}/feed"
                 style="background:#0E7C5A; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; font-size:14px;">
                Browse the feed →
              </a>
            </p>
            <p style="font-size:12px; color:#999; margin-top:32px;">
              To unsubscribe reply with "unsubscribe" or visit the link below.<br/>
              <a href="${process.env.APP_URL || "https://devpulse-q71w.onrender.com"}/unsubscribe?email=${encodeURIComponent(email)}"
                 style="color:#999;">Unsubscribe</a>
            </p>
          </div>
        `,
      });
    }

    res.json({ ok: true, message: "Subscribed successfully" });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ error: "Subscription failed. Please try again." });
  }
});

// DELETE /api/subscribe?email=... — unsubscribe
// NOTE: keeps the query-string mechanism — existing unsubscribe links in sent emails depend on it.
router.delete("/", async (req: Request, res: Response) => {
  const raw = (req.query as { email?: string }).email;
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!email) { res.status(400).json({ error: "Email required" }); return; }
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  await pool.query(
    `UPDATE email_subscribers SET unsubscribed_at = NOW() WHERE email = $1`,
    [email]
  );
  res.json({ ok: true });
});

// GET /api/subscribe/count — public subscriber count (for social proof)
router.get("/count", async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM email_subscribers
     WHERE confirmed = true AND unsubscribed_at IS NULL`
  );
  res.json({ count: rows[0].count });
});

export default router;
