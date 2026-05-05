import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import pool from "../db.js";
import { requireAuth, setAuthCookie, clearAuthCookie, signToken, AuthRequest, isAdminEmail } from "../middleware/auth.js";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? null,
    isAdmin: isAdminEmail(row.email as string),
  };
}

// POST /api/auth/register
router.post("/register", async (req, res: Response) => {
  const { email, password, displayName } = req.body as Record<string, string>;

  if (!email?.trim()) { res.status(400).json({ error: "Email is required" }); return; }
  if (!EMAIL_RE.test(email.trim())) { res.status(400).json({ error: "Invalid email format" }); return; }
  if (!password || password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
  if (password.length > 72) { res.status(400).json({ error: "Password too long" }); return; }

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name`,
      [email.trim().toLowerCase(), hash, displayName?.trim().slice(0, 80) || null]
    );
    const user = rows[0];
    setAuthCookie(res, signToken(user.id, user.email));
    res.status(201).json({ user: safeUser(user) });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "An account with that email already exists" });
    } else {
      console.error("Register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  }
});

// POST /api/auth/login
router.post("/login", async (req, res: Response) => {
  const { email, password } = req.body as Record<string, string>;
  if (!email || !password) { res.status(400).json({ error: "Email and password are required" }); return; }

  try {
    const { rows } = await pool.query(
      "SELECT id, email, password_hash, display_name FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
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

// POST /api/auth/logout
router.post("/logout", (_req, res: Response) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, email, display_name FROM users WHERE id = $1",
      [req.userId]
    );
    if (!rows[0]) { res.status(401).json({ error: "Unauthorized" }); return; }
    res.json({ user: safeUser(rows[0]) });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
