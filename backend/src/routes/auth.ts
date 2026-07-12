import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";
import pool from "../db.js";
import {
  requireAuth,
  setAuthCookie,
  clearAuthCookie,
  signToken,
  AuthRequest,
  isAdminEmail,
} from "../middleware/auth.js";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Add OAuth columns + make password_hash nullable on startup
pool.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_id TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth
    ON users(oauth_provider, oauth_provider_id)
    WHERE oauth_provider IS NOT NULL;
`).catch(() => {});

pool.query(`
  DO $$ BEGIN
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL;
  END $$;
`).catch(() => {});

function appUrl(): string {
  return (process.env.APP_URL || "https://devpulse.tatsatpandey.com").replace(/\/$/, "");
}

function siteUrl(): string {
  return (process.env.SITE_URL || appUrl()).replace(/\/$/, "");
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// ── OAuth CSRF state ───────────────────────────────────────────

function issueOAuthState(res: Response): string {
  const state = crypto.randomBytes(24).toString("hex");
  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000, // 10 minutes
  });
  return state;
}

function verifyOAuthState(req: Request, res: Response): boolean {
  const expected = (req as any).cookies?.oauth_state as string | undefined;
  const received = String(req.query.state || "");
  res.clearCookie("oauth_state");
  return !!expected && !!received && expected === received;
}

function safeUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? null,
    isAdmin: isAdminEmail(row.email as string),
    avatarUrl: row.avatar_url ?? null,
  };
}

async function findOrCreateOAuthUser(opts: {
  provider: string;
  providerId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const { provider, providerId, email, displayName, avatarUrl } = opts;

  const byOAuth = await pool.query(
    `SELECT * FROM users WHERE oauth_provider = $1 AND oauth_provider_id = $2`,
    [provider, providerId]
  );
  if (byOAuth.rows.length > 0) return byOAuth.rows[0];

  const byEmail = await pool.query(
    `UPDATE users SET oauth_provider = $1, oauth_provider_id = $2,
      avatar_url = COALESCE(avatar_url, $3)
     WHERE email = $4 RETURNING *`,
    [provider, providerId, avatarUrl, email.toLowerCase()]
  );
  if (byEmail.rows.length > 0) return byEmail.rows[0];

  const created = await pool.query(
    `INSERT INTO users (email, display_name, oauth_provider, oauth_provider_id, avatar_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [email.toLowerCase(), displayName?.slice(0, 80) || null, provider, providerId, avatarUrl]
  );
  return created.rows[0];
}

// ── Google OAuth ──────────────────────────────────────────────────────

router.get("/google", (_req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) { res.status(503).json({ error: "Google OAuth not configured" }); return; }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl()}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state: issueOAuthState(res),
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/google/callback", async (req: Request, res: Response) => {
  const { code, error } = req.query as Record<string, string>;
  if (error || !code) { res.redirect("/login?error=google_denied"); return; }
  if (!verifyOAuthState(req, res)) { res.redirect("/login?error=google_state"); return; }
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl()}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const token = await tokenRes.json() as Record<string, string>;
    if (!token.access_token) { res.redirect("/login?error=google_token"); return; }

    const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const gUser = await infoRes.json() as Record<string, string>;
    if (!gUser.email) { res.redirect("/login?error=google_email"); return; }

    const user = await findOrCreateOAuthUser({
      provider: "google",
      providerId: gUser.sub,
      email: gUser.email,
      displayName: gUser.name || gUser.given_name || null,
      avatarUrl: gUser.picture || null,
    });
    setAuthCookie(res, signToken(user.id, user.email));
    res.redirect("/");
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.redirect("/login?error=google_failed");
  }
});

// ── GitHub OAuth ──────────────────────────────────────────────────────

router.get("/github-oauth", (_req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) { res.status(503).json({ error: "GitHub OAuth not configured" }); return; }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl()}/api/auth/github-oauth/callback`,
    scope: "read:user user:email",
    state: issueOAuthState(res),
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

router.get("/github-oauth/callback", async (req: Request, res: Response) => {
  const { code, error } = req.query as Record<string, string>;
  if (error || !code) { res.redirect("/login?error=github_denied"); return; }
  if (!verifyOAuthState(req, res)) { res.redirect("/login?error=github_state"); return; }
  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${appUrl()}/api/auth/github-oauth/callback`,
      }),
    });
    const token = await tokenRes.json() as Record<string, string>;
    if (!token.access_token) { res.redirect("/login?error=github_token"); return; }

    const [userRes, emailRes] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token.access_token}`, "User-Agent": "devpulse/1.0" },
      }),
      fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${token.access_token}`, "User-Agent": "devpulse/1.0" },
      }),
    ]);
    const ghUser = await userRes.json() as Record<string, any>;
    const emails = await emailRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
    const primaryEmail = emails.find(e => e.primary && e.verified)?.email
      || emails.find(e => e.verified)?.email
      || ghUser.email;

    if (!primaryEmail) { res.redirect("/login?error=github_email"); return; }

    const user = await findOrCreateOAuthUser({
      provider: "github",
      providerId: String(ghUser.id),
      email: primaryEmail,
      displayName: ghUser.name || ghUser.login || null,
      avatarUrl: ghUser.avatar_url || null,
    });
    setAuthCookie(res, signToken(user.id, user.email));
    res.redirect("/");
  } catch (err) {
    console.error("GitHub OAuth error:", err);
    res.redirect("/login?error=github_failed");
  }
});

// ── Email / password ──────────────────────────────────────────────────

router.post("/register", async (req, res: Response) => {
  const { email, password, displayName } = req.body as Record<string, string>;
  if (!email?.trim()) { res.status(400).json({ error: "Email is required" }); return; }
  if (!EMAIL_RE.test(email.trim())) { res.status(400).json({ error: "Invalid email format" }); return; }
  if (!password || password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
  if (password.length > 72) { res.status(400).json({ error: "Password too long" }); return; }
  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING *`,
      [email.trim().toLowerCase(), hash, displayName?.trim().slice(0, 80) || null]
    );
    setAuthCookie(res, signToken(rows[0].id, rows[0].email));
    res.status(201).json({ user: safeUser(rows[0]) });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "An account with that email already exists" });
    } else {
      console.error("Register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  }
});

router.post("/login", async (req, res: Response) => {
  const { email, password } = req.body as Record<string, string>;
  if (!email || !password) { res.status(400).json({ error: "Email and password are required" }); return; }
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.trim().toLowerCase()]);
    const user = rows[0];
    if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    setAuthCookie(res, signToken(user.id, user.email));
    res.json({ user: safeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ── Password reset ────────────────────────────────────────────────────

router.post("/forgot-password", async (req, res: Response) => {
  const email = String((req.body as Record<string, string>)?.email ?? "").trim().toLowerCase();
  // Always respond 200 { ok: true } — never reveal whether the account exists.
  try {
    if (email && EMAIL_RE.test(email)) {
      const { rows } = await pool.query("SELECT id, password_hash FROM users WHERE email = $1", [email]);
      const user = rows[0];
      if (user?.password_hash) {
        const token = crypto.randomBytes(32).toString("hex");
        await pool.query(
          "DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL",
          [user.id]
        );
        await pool.query(
          `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
          [user.id, sha256(token)]
        );
        const resetUrl = `${siteUrl()}/reset-password?token=${token}`;
        const resend = getResend();
        if (resend) {
          await resend.emails.send({
            from: process.env.RESEND_FROM || "DevPulse <digest@devpulse.ai>",
            to: email,
            subject: "Reset your DevPulse password",
            html: `
              <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #333;">
                <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Reset your password</h2>
                <p style="color: #555; line-height: 1.6;">
                  We received a request to reset your DevPulse password.
                  This link expires in 30 minutes.
                </p>
                <p style="margin-top: 24px;">
                  <a href="${resetUrl}"
                     style="background:#0E7C5A; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; font-size:14px;">
                    Reset password →
                  </a>
                </p>
                <p style="font-size:12px; color:#999; margin-top:32px;">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            `,
          });
        } else {
          console.log(`Password reset link for ${email}: ${resetUrl}`);
        }
      }
    }
  } catch (err) {
    console.error("Forgot password error:", err);
  }
  res.json({ ok: true });
});

router.post("/reset-password", async (req, res: Response) => {
  const { token, password } = req.body as Record<string, string>;
  if (!token) { res.status(400).json({ error: "Invalid or expired reset link" }); return; }
  if (!password || password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
  if (password.length > 72) { res.status(400).json({ error: "Password too long" }); return; }
  try {
    const { rows } = await pool.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [sha256(token)]
    );
    const reset = rows[0];
    if (!reset) { res.status(400).json({ error: "Invalid or expired reset link" }); return; }

    const hash = await bcrypt.hash(password, 12);
    await pool.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hash, reset.user_id]);
    await pool.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1", [reset.id]);
    await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1 AND id <> $2", [reset.user_id, reset.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Password reset failed" });
  }
});

router.post("/logout", (_req, res: Response) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.userId]);
    if (!rows[0]) { res.status(401).json({ error: "Unauthorized" }); return; }
    res.json({ user: safeUser(rows[0]) });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// Permanently delete the authenticated user's account and all associated data.
// All user-scoped tables (user_saves, user_topic_follows, user_source_mutes,
// user_seen_items, user_chapter_progress) reference users(id) ON DELETE CASCADE.
router.delete("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.userId]);
    clearAuthCookie(res);
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
