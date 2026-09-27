import type { Profile } from "./store";

export type Provider = "google" | "github";
export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
export type ProviderKeys = { clientId: string; clientSecret: string };

/** The provider's consent screen for this sign-in attempt. */
export function authorizeUrl(provider: Provider, keys: ProviderKeys, redirectUri: string, state: string): string {
  if (provider === "google") {
    return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: keys.clientId, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile",
      access_type: "online", prompt: "select_account", state,
    })}`;
  }
  return `https://github.com/login/oauth/authorize?${new URLSearchParams({
    client_id: keys.clientId, redirect_uri: redirectUri, scope: "read:user user:email", state, allow_signup: "true",
  })}`;
}

const json = async (response: Response) => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
};
const text = (value: unknown) => typeof value === "string" && value ? value : undefined;

/** Exchanges the callback code for the user's identity. Only verified emails are ever used to link accounts. */
export async function exchangeCode(provider: Provider, keys: ProviderKeys, code: string, redirectUri: string, fetcher: Fetcher = fetch): Promise<Profile> {
  if (provider === "google") {
    const token = await json(await fetcher("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ code, client_id: keys.clientId, client_secret: keys.clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }).toString(),
    }));
    const access = text(token.access_token);
    if (!access) throw new Error("Google returned no access token");
    const info = await json(await fetcher("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access}` } }));
    const id = text(info.sub);
    if (!id) throw new Error("Google returned no user id");
    return { provider, providerId: id, email: text(info.email), emailVerified: info.email_verified === true, name: text(info.name), avatarUrl: text(info.picture) };
  }

  const token = await json(await fetcher("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: keys.clientId, client_secret: keys.clientSecret, code, redirect_uri: redirectUri }),
  }));
  const access = text(token.access_token);
  if (!access) throw new Error("GitHub returned no access token");
  const headers = { Authorization: `Bearer ${access}`, Accept: "application/vnd.github+json", "User-Agent": "DevPulse" };
  const user = await json(await fetcher("https://api.github.com/user", { headers }));
  if (typeof user.id !== "number") throw new Error("GitHub returned no user id");
  const emails = await fetcher("https://api.github.com/user/emails", { headers }).then((response) => response.ok ? response.json() as Promise<unknown> : []).catch(() => []);
  const primary = Array.isArray(emails) ? emails.find((entry) => entry && entry.primary && entry.verified && typeof entry.email === "string") : undefined;
  return { provider, providerId: String(user.id), email: primary?.email, emailVerified: Boolean(primary), name: text(user.name) ?? text(user.login), avatarUrl: text(user.avatar_url) };
}
