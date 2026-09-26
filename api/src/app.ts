import { randomBytes } from "node:crypto";
import { z } from "zod";
import { authorizeUrl, exchangeCode, type Fetcher, type Provider, type ProviderKeys } from "./oauth";
import type { Store, User } from "./store";

export type Config = {
  /** The static site, e.g. https://devpulse.tatsatpandey.com. The only origin allowed to call the API. */
  siteOrigin: string;
  /** This API's public origin, used for OAuth callbacks, e.g. https://api.devpulse.tatsatpandey.com. */
  apiOrigin: string;
  providers: Partial<Record<Provider, ProviderKeys>>;
  /** Secure cookies everywhere except local http tests. */
  secureCookies?: boolean;
};

const SESSION = "dp_session";
const OAUTH = "dp_oauth";
const SESSION_MAX_AGE = 90 * 86_400;

const entrySchema = z.object({
  storyId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/),
  url: z.url().max(2000).refine((value) => /^https?:\/\//.test(value), { message: "http(s) only" }),
  headline: z.string().min(1).max(300),
  date: z.iso.date(),
  topic: z.string().min(1).max(40),
  saved: z.boolean(),
  note: z.string().max(5000),
  updatedAt: z.number().int().nonnegative(),
});
const prefsSchema = z.object({
  follow: z.array(z.string().min(1).max(40)).max(20),
  muted: z.array(z.string().min(1).max(253).regex(/^[a-z0-9.-]+$/)).max(100),
  updatedAt: z.number().int().nonnegative(),
});
const syncSchema = z.object({ since: z.number().int().nonnegative().default(0), entries: z.array(entrySchema).max(500).default([]), prefs: prefsSchema.optional() });

const cookies = (request: Request) => Object.fromEntries((request.headers.get("cookie") ?? "").split(/;\s*/).filter(Boolean).map((pair) => {
  const index = pair.indexOf("=");
  return [pair.slice(0, index), decodeURIComponent(pair.slice(index + 1))];
}));

/** Only same-site paths, never "//host" or "/\\host", so sign-in cannot be used as an open redirect. */
export const safeReturnPath = (value: string | null | undefined) =>
  value && /^\/(?![/\\])[\w\-./?=&%#~+]*$/.test(value) && value.length <= 300 ? value : "/saved/";

export function createApp(store: Store, config: Config, fetcher: Fetcher = fetch) {
  const secure = config.secureCookies ?? true;
  const cookie = (name: string, value: string, maxAge: number, path = "/") =>
    `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
  const hits = new Map<string, { count: number; reset: number }>();

  const headers = (extra: HeadersInit = {}) => {
    const out = new Headers(extra);
    out.set("Access-Control-Allow-Origin", config.siteOrigin);
    out.set("Access-Control-Allow-Credentials", "true");
    out.set("Vary", "Origin");
    out.set("X-Content-Type-Options", "nosniff");
    out.set("Referrer-Policy", "strict-origin-when-cross-origin");
    out.set("Cache-Control", "no-store");
    if (secure) out.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    return out;
  };
  const json = (body: unknown, status = 200, extra: HeadersInit = {}) => {
    const out = headers(extra);
    out.set("Content-Type", "application/json; charset=utf-8");
    return new Response(JSON.stringify(body), { status, headers: out });
  };
  const redirect = (location: string, setCookies: string[] = []) => {
    const out = headers({ Location: location });
    for (const value of setCookies) out.append("Set-Cookie", value);
    return new Response(null, { status: 302, headers: out });
  };
  const limited = (request: Request, bucket: string, max: number) => {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const key = `${bucket}:${ip}`;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) { hits.set(key, { count: 1, reset: now + 60_000 }); return false; }
    entry.count++;
    return entry.count > max;
  };
  const currentUser = async (request: Request): Promise<{ user: User; token: string } | null> => {
    const token = cookies(request)[SESSION];
    if (!token) return null;
    const user = await store.userForSession(token);
    return user ? { user, token } : null;
  };
  const publicUser = (user: User) => ({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl });

  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: headers({ "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600" }) });
      }
      if (path === "/health") return json({ ok: true, providers: Object.keys(config.providers) });

      // Anything that changes state must come from the site itself (cookies are SameSite=Lax as well).
      if (request.method !== "GET" && request.headers.get("origin") !== config.siteOrigin) return json({ error: "Forbidden origin" }, 403);

      const start = path.match(/^\/auth\/(google|github)\/start$/);
      if (start && request.method === "GET") {
        if (limited(request, "auth", 30)) return json({ error: "Too many attempts" }, 429);
        const provider = start[1] as Provider;
        const keys = config.providers[provider];
        if (!keys) return json({ error: `${provider} sign-in is not configured` }, 503);
        const state = randomBytes(24).toString("base64url");
        const returnTo = safeReturnPath(url.searchParams.get("return"));
        return redirect(authorizeUrl(provider, keys, `${config.apiOrigin}/auth/${provider}/callback`, state), [cookie(OAUTH, `${state}|${returnTo}`, 600, "/auth")]);
      }

      const callback = path.match(/^\/auth\/(google|github)\/callback$/);
      if (callback && request.method === "GET") {
        const provider = callback[1] as Provider;
        const keys = config.providers[provider];
        const [expected, returnTo] = (cookies(request)[OAUTH] ?? "").split("|");
        const clearState = cookie(OAUTH, "", 0, "/auth");
        const fail = (reason: string) => redirect(`${config.siteOrigin}/saved/?signin=${reason}`, [clearState]);
        if (!keys) return fail("unavailable");
        if (url.searchParams.get("error")) return fail("cancelled");
        if (!expected || url.searchParams.get("state") !== expected) return fail("expired");
        const code = url.searchParams.get("code");
        if (!code) return fail("cancelled");
        const profile = await exchangeCode(provider, keys, code, `${config.apiOrigin}/auth/${provider}/callback`, fetcher).catch(() => null);
        if (!profile) return fail("failed");
        const user = await store.userForProfile(profile);
        const token = await store.createSession(user.id);
        return redirect(`${config.siteOrigin}${safeReturnPath(returnTo)}`, [clearState, cookie(SESSION, token, SESSION_MAX_AGE)]);
      }

      if (path === "/me" && request.method === "GET") {
        const session = await currentUser(request);
        return session ? json({ user: publicUser(session.user) }) : json({ user: null }, 401);
      }

      if (path === "/logout" && request.method === "POST") {
        const session = await currentUser(request);
        if (session) await store.endSession(session.token);
        return json({ ok: true }, 200, { "Set-Cookie": cookie(SESSION, "", 0) });
      }

      if (path === "/me" && request.method === "DELETE") {
        const session = await currentUser(request);
        if (!session) return json({ error: "Not signed in" }, 401);
        await store.deleteUser(session.user.id);
        return json({ ok: true }, 200, { "Set-Cookie": cookie(SESSION, "", 0) });
      }

      if (path === "/sync" && request.method === "POST") {
        if (limited(request, "sync", 120)) return json({ error: "Too many requests" }, 429);
        const session = await currentUser(request);
        if (!session) return json({ error: "Not signed in" }, 401);
        const length = Number(request.headers.get("content-length") ?? 0);
        if (length > 1_500_000) return json({ error: "Request too large" }, 413);
        const parsed = syncSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Invalid sync request", issues: parsed.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".")}: ${issue.message}`) }, 400);
        const now = Date.now();
        // Edit times from the future would win every conflict forever; clamp them to now.
        const entries = parsed.data.entries.map((entry) => ({ ...entry, updatedAt: Math.min(entry.updatedAt, now) }));
        const prefs = parsed.data.prefs && { ...parsed.data.prefs, updatedAt: Math.min(parsed.data.prefs.updatedAt, now) };
        return json(await store.sync(session.user.id, parsed.data.since, entries, prefs, now));
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      console.error("api error", path, (error as Error).message);
      return json({ error: "Server error" }, 500);
    }
  };
}
