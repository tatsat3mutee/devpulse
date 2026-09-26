// DevPulse account API: Google/GitHub sign-in and saved-story sync, backed by Neon Postgres.
import postgres from "postgres";
import { createApp } from "./app";
import { createStore, type Query } from "./store";

const env = (name: string) => process.env[name]?.trim() || undefined;
const required = (name: string) => {
  const value = env(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const sql = postgres(required("DATABASE_URL"), { ssl: "require", max: 5, idle_timeout: 20, connect_timeout: 10 });
const query: Query = (text, params = []) => sql.unsafe(text, params as never[]) as never;
const store = createStore(query);
await store.migrate(await Bun.file(new URL("../schema.sql", import.meta.url)).text());

const providers = {
  ...(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET") ? { google: { clientId: env("GOOGLE_CLIENT_ID")!, clientSecret: env("GOOGLE_CLIENT_SECRET")! } } : {}),
  ...(env("GITHUB_CLIENT_ID") && env("GITHUB_CLIENT_SECRET") ? { github: { clientId: env("GITHUB_CLIENT_ID")!, clientSecret: env("GITHUB_CLIENT_SECRET")! } } : {}),
};
const handle = createApp(store, { siteOrigin: required("SITE_ORIGIN"), apiOrigin: required("API_ORIGIN"), providers });

const server = Bun.serve({ port: Number(env("PORT") ?? 3000), fetch: handle, maxRequestBodySize: 2_000_000 });
console.log(`DevPulse API on :${server.port} (sign-in: ${Object.keys(providers).join(", ") || "none configured"})`);

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, async () => {
    server.stop();
    await sql.end({ timeout: 5 });
    process.exit(0);
  });
}
