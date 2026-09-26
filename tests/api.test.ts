import { beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { createApp, safeReturnPath } from "../api/src/app";
import { createStore, hashToken, type Query } from "../api/src/store";

const SITE = "https://devpulse.example";
const API = "https://api.devpulse.example";
const schema = readFileSync(resolve(import.meta.dir, "../api/schema.sql"), "utf8");

// A fake Google and GitHub that return whichever identity the test sets.
let googleUser: Record<string, unknown> = {};
let githubUser: Record<string, unknown> = {};
let githubEmails: unknown[] = [];
const fetcher = async (url: string) => {
  if (url.startsWith("https://oauth2.googleapis.com/token") || url.startsWith("https://github.com/login/oauth/access_token")) return Response.json({ access_token: "provider-token" });
  if (url.startsWith("https://openidconnect.googleapis.com")) return Response.json(googleUser);
  if (url === "https://api.github.com/user") return Response.json(githubUser);
  if (url === "https://api.github.com/user/emails") return Response.json(githubEmails);
  return new Response("not found", { status: 404 });
};

let db: PGlite;
let query: Query;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  db = new PGlite();
  query = async (text, params = []) => (await db.query(text, params as unknown[])).rows as never;
  const store = createStore(query);
  await store.migrate(schema);
  app = createApp(store, { siteOrigin: SITE, apiOrigin: API, providers: { google: { clientId: "g-id", clientSecret: "g-secret" }, github: { clientId: "h-id", clientSecret: "h-secret" } }, secureCookies: false }, fetcher as never);
  googleUser = { sub: "g-1", email: "Ada@Example.com", email_verified: true, name: "Ada", picture: "https://img.example/ada.png" };
  githubUser = { id: 42, login: "ada", name: null, avatar_url: "https://img.example/gh.png" };
  githubEmails = [{ email: "other@example.com", primary: false, verified: true }, { email: "ada@example.com", primary: true, verified: true }];
});

const setCookies = (response: Response) => response.headers.getSetCookie();
const cookieValue = (response: Response, name: string) => setCookies(response).map((value) => value.match(new RegExp(`^${name}=([^;]*)`))?.[1]).find((value) => value !== undefined);

/** Walks the whole sign-in: start → provider → callback. Returns the session cookie and the final redirect. */
async function signIn(provider: "google" | "github", returnTo = "/saved/") {
  const start = await app(new Request(`${API}/auth/${provider}/start?return=${encodeURIComponent(returnTo)}`));
  expect(start.status).toBe(302);
  const state = new URL(start.headers.get("location")!).searchParams.get("state")!;
  const oauth = cookieValue(start, "dp_oauth")!;
  const callback = await app(new Request(`${API}/auth/${provider}/callback?code=abc&state=${state}`, { headers: { cookie: `dp_oauth=${oauth}` } }));
  return { response: callback, session: cookieValue(callback, "dp_session") };
}
const authed = (session: string, path: string, init: RequestInit = {}) =>
  app(new Request(`${API}${path}`, { ...init, headers: { cookie: `dp_session=${session}`, origin: SITE, "content-type": "application/json", ...(init.headers ?? {}) } }));

describe("sign-in", () => {
  test("start redirects to the provider with a state cookie and our callback", async () => {
    const response = await app(new Request(`${API}/auth/google/start?return=/edition/2026-09-26/`));
    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe("https://accounts.google.com");
    expect(location.searchParams.get("redirect_uri")).toBe(`${API}/auth/google/callback`);
    expect(setCookies(response)[0]).toMatch(/^dp_oauth=.+; Path=\/auth; Max-Age=600; HttpOnly; SameSite=Lax$/);
  });

  test("callback creates a user and a session, then returns to the page the reader came from", async () => {
    const { response, session } = await signIn("google", "/story/2026-09-26--hn-1/");
    expect(response.headers.get("location")).toBe(`${SITE}/story/2026-09-26--hn-1/`);
    expect(setCookies(response).find((value) => value.startsWith("dp_session="))).toContain("HttpOnly; SameSite=Lax");
    const me = await (await authed(session!, "/me")).json();
    expect(me.user).toMatchObject({ name: "Ada", email: "ada@example.com" });
    // Only a hash of the token is stored.
    expect(await query(`SELECT 1 FROM dp_sessions WHERE token_hash = $1`, [session])).toHaveLength(0);
    expect(await query(`SELECT 1 FROM dp_sessions WHERE token_hash = $1`, [hashToken(session!)])).toHaveLength(1);
  });

  test("a mismatched or missing state is refused", async () => {
    const response = await app(new Request(`${API}/auth/google/callback?code=abc&state=forged`, { headers: { cookie: "dp_oauth=real|/saved/" } }));
    expect(response.headers.get("location")).toBe(`${SITE}/saved/?signin=expired`);
    expect(cookieValue(response, "dp_session")).toBeUndefined();
  });

  test("Google and GitHub with the same verified email are one account; unverified email never links", async () => {
    const google = await signIn("google");
    const github = await signIn("github");
    const a = (await (await authed(google.session!, "/me")).json()).user.id;
    const b = (await (await authed(github.session!, "/me")).json()).user.id;
    expect(a).toBe(b);
    githubUser = { id: 99, login: "mallory" };
    githubEmails = [{ email: "ada@example.com", primary: true, verified: false }];
    const other = await signIn("github");
    expect((await (await authed(other.session!, "/me")).json()).user.id).not.toBe(a);
  });

  test("return paths cannot leave the site", () => {
    expect(safeReturnPath("/weekly")).toBe("/weekly");
    expect(safeReturnPath("//evil.example/x")).toBe("/saved/");
    expect(safeReturnPath("/\\evil.example")).toBe("/saved/");
    expect(safeReturnPath("https://evil.example")).toBe("/saved/");
    expect(safeReturnPath(null)).toBe("/saved/");
  });

  test("unconfigured providers are reported, not attempted", async () => {
    const store = createStore(query);
    const bare = createApp(store, { siteOrigin: SITE, apiOrigin: API, providers: {} }, fetcher as never);
    expect((await bare(new Request(`${API}/auth/github/start`))).status).toBe(503);
  });
});

describe("sync", () => {
  const entry = (overrides: Record<string, unknown> = {}) => ({ storyId: "hn-1", url: "https://example.com/a", headline: "A story", date: "2026-09-26", topic: "agents", saved: true, note: "", updatedAt: 1000, ...overrides });
  const sync = (session: string, body: unknown) => authed(session, "/sync", { method: "POST", body: JSON.stringify(body) });

  test("the newest edit wins and every device converges", async () => {
    const { session } = await signIn("google");
    let reply = await (await sync(session!, { since: 0, entries: [entry({ note: "phone note", updatedAt: 2000 })] })).json();
    expect(reply.entries).toEqual([entry({ note: "phone note", updatedAt: 2000 })]);
    // A stale edit from the laptop is ignored…
    reply = await (await sync(session!, { since: 0, entries: [entry({ note: "old laptop note", updatedAt: 1500 })] })).json();
    expect(reply.entries[0].note).toBe("phone note");
    // …a newer one replaces it, and "since" only returns what changed.
    const since = reply.serverTime;
    reply = await (await sync(session!, { since, entries: [entry({ note: "newest", saved: false, updatedAt: 3000 })] })).json();
    expect(reply.entries).toEqual([entry({ note: "newest", saved: false, updatedAt: 3000 })]);
    reply = await (await sync(session!, { since: reply.serverTime + 1, entries: [] })).json();
    expect(reply.entries).toEqual([]);
  });

  test("preferences sync with the same rule", async () => {
    const { session } = await signIn("google");
    await sync(session!, { prefs: { follow: ["agents"], muted: ["example.com"], updatedAt: 500 } });
    const reply = await (await sync(session!, { prefs: { follow: [], muted: [], updatedAt: 100 } })).json();
    expect(reply.prefs).toEqual({ follow: ["agents"], muted: ["example.com"], updatedAt: 500 });
  });

  test("edit times from the future are clamped so they cannot win forever", async () => {
    const { session } = await signIn("google");
    const reply = await (await sync(session!, { entries: [entry({ updatedAt: Date.now() + 10 * 86_400_000 })] })).json();
    expect(reply.entries[0].updatedAt).toBeLessThanOrEqual(Date.now());
  });

  test("bad input, other sites and signed-out requests are refused", async () => {
    const { session } = await signIn("google");
    expect((await sync(session!, { entries: [entry({ url: "javascript:alert(1)" })] })).status).toBe(400);
    expect((await sync(session!, { entries: [entry({ note: "x".repeat(5001) })] })).status).toBe(400);
    expect((await sync(session!, { entries: [entry({ storyId: "../etc" })] })).status).toBe(400);
    const foreign = await app(new Request(`${API}/sync`, { method: "POST", headers: { cookie: `dp_session=${session}`, origin: "https://evil.example", "content-type": "application/json" }, body: "{}" }));
    expect(foreign.status).toBe(403);
    expect((await sync("not-a-session", { entries: [] })).status).toBe(401);
  });

  test("users only ever see their own library", async () => {
    const ada = await signIn("google");
    await sync(ada.session!, { entries: [entry({ note: "private" })] });
    googleUser = { sub: "g-2", email: "bob@example.com", email_verified: true, name: "Bob" };
    const bob = await signIn("google");
    expect((await (await sync(bob.session!, { since: 0 })).json()).entries).toEqual([]);
  });
});

describe("account", () => {
  test("CORS allows only the site, with credentials", async () => {
    const preflight = await app(new Request(`${API}/sync`, { method: "OPTIONS", headers: { origin: SITE } }));
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe(SITE);
    expect(preflight.headers.get("access-control-allow-credentials")).toBe("true");
  });

  test("signing out ends the session; deleting the account removes all of its data", async () => {
    const first = await signIn("google");
    await authed(first.session!, "/sync", { method: "POST", body: JSON.stringify({ entries: [{ storyId: "hn-1", url: "https://example.com/a", headline: "A", date: "2026-09-26", topic: "agents", saved: true, note: "n", updatedAt: 1 }] }) });
    await authed(first.session!, "/logout", { method: "POST" });
    expect((await authed(first.session!, "/me")).status).toBe(401);
    const second = await signIn("google");
    expect((await authed(second.session!, "/me", { method: "DELETE" })).status).toBe(200);
    for (const table of ["dp_users", "dp_identities", "dp_sessions", "dp_library"]) expect(await query(`SELECT 1 FROM ${table}`)).toHaveLength(0);
  });
});
