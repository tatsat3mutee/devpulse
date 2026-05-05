import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
}

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET not set");
  return s;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = (req.cookies as Record<string, string>)?.token;
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const payload = jwt.verify(token, getSecret()) as { userId: number; email: string };
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const token = (req.cookies as Record<string, string>)?.token;
  if (token) {
    try {
      const payload = jwt.verify(token, getSecret()) as { userId: number; email: string };
      req.userId = payload.userId;
      req.userEmail = payload.email;
    } catch { /* proceed anonymously */ }
  }
  next();
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!adminEmail || req.userEmail?.toLowerCase() !== adminEmail) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  });
}

export function isAdminEmail(email: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return !!adminEmail && email.toLowerCase() === adminEmail;
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie("token", { httpOnly: true, path: "/" });
}

export function signToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, getSecret(), { expiresIn: "7d" });
}
