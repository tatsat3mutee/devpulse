import { createHash, randomBytes } from "node:crypto";

/** Anything that runs parameterised SQL and returns rows: postgres.js in production, PGlite in tests. */
export type Query = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

export type Profile = { provider: "google" | "github"; providerId: string; email?: string; emailVerified: boolean; name?: string; avatarUrl?: string };
export type User = { id: number; email: string | null; name: string | null; avatarUrl: string | null };
export type LibraryEntry = { storyId: string; url: string; headline: string; date: string; topic: string; saved: boolean; note: string; updatedAt: number };
export type Prefs = { follow: string[]; muted: string[]; updatedAt: number };

const SESSION_DAYS = 90;
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

type UserRow = { id: string | number; email: string | null; name: string | null; avatar_url: string | null };
const toUser = (row: UserRow): User => ({ id: Number(row.id), email: row.email, name: row.name, avatarUrl: row.avatar_url });

export function createStore(query: Query) {
  return {
    async migrate(schema: string) {
      for (const statement of schema.split(/;\s*\n/).map((part) => part.replace(/^\s*--.*$/gm, "").trim()).filter(Boolean)) await query(statement);
    },

    /** Finds the user for a sign-in, linking to an existing account only through a verified email. */
    async userForProfile(profile: Profile): Promise<User> {
      const [known] = await query<UserRow>(
        `SELECT u.* FROM dp_identities i JOIN dp_users u ON u.id = i.user_id WHERE i.provider = $1 AND i.provider_id = $2`,
        [profile.provider, profile.providerId],
      );
      if (known) {
        const [updated] = await query<UserRow>(
          `UPDATE dp_users SET name = COALESCE($2, name), avatar_url = COALESCE($3, avatar_url) WHERE id = $1 RETURNING *`,
          [known.id, profile.name ?? null, profile.avatarUrl ?? null],
        );
        return toUser(updated);
      }
      const email = profile.email?.toLowerCase();
      let [user] = email && profile.emailVerified
        ? await query<UserRow>(`SELECT * FROM dp_users WHERE lower(email) = $1 ORDER BY id LIMIT 1`, [email])
        : [];
      if (!user) {
        [user] = await query<UserRow>(
          `INSERT INTO dp_users (email, name, avatar_url) VALUES ($1, $2, $3) RETURNING *`,
          [profile.emailVerified ? email ?? null : null, profile.name ?? null, profile.avatarUrl ?? null],
        );
      }
      await query(`INSERT INTO dp_identities (provider, provider_id, user_id, email) VALUES ($1, $2, $3, $4)`, [profile.provider, profile.providerId, user.id, email ?? null]);
      return toUser(user);
    },

    async createSession(userId: number): Promise<string> {
      const token = randomBytes(32).toString("base64url");
      await query(`INSERT INTO dp_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)`, [hashToken(token), userId, String(SESSION_DAYS)]);
      return token;
    },

    async userForSession(token: string): Promise<User | null> {
      const [row] = await query<UserRow>(
        `SELECT u.* FROM dp_sessions s JOIN dp_users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [hashToken(token)],
      );
      return row ? toUser(row) : null;
    },

    async endSession(token: string) {
      await query(`DELETE FROM dp_sessions WHERE token_hash = $1`, [hashToken(token)]);
    },

    async deleteUser(userId: number) {
      await query(`DELETE FROM dp_users WHERE id = $1`, [userId]);
    },

    /**
     * Two-way sync. Incoming entries win only if they were edited later than what is stored;
     * the reply carries everything stored at or after `since`, so every device converges.
     */
    async sync(userId: number, since: number, entries: LibraryEntry[], prefs: Prefs | undefined, now = Date.now()) {
      for (const entry of entries) {
        await query(
          `INSERT INTO dp_library (user_id, story_id, url, headline, date, topic, saved, note, updated_at, synced_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (user_id, story_id) DO UPDATE SET
             url = EXCLUDED.url, headline = EXCLUDED.headline, date = EXCLUDED.date, topic = EXCLUDED.topic,
             saved = EXCLUDED.saved, note = EXCLUDED.note, updated_at = EXCLUDED.updated_at, synced_at = EXCLUDED.synced_at
           WHERE dp_library.updated_at < EXCLUDED.updated_at`,
          [userId, entry.storyId, entry.url, entry.headline, entry.date, entry.topic, entry.saved, entry.note, entry.updatedAt, now],
        );
      }
      if (prefs) {
        await query(
          `INSERT INTO dp_prefs (user_id, data, updated_at, synced_at) VALUES ($1, $2::jsonb, $3, $4)
           ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at, synced_at = EXCLUDED.synced_at
           WHERE dp_prefs.updated_at < EXCLUDED.updated_at`,
          [userId, JSON.stringify({ follow: prefs.follow, muted: prefs.muted }), prefs.updatedAt, now],
        );
      }
      const rows = await query<Record<string, unknown>>(`SELECT * FROM dp_library WHERE user_id = $1 AND synced_at >= $2 ORDER BY synced_at`, [userId, since]);
      const [prefRow] = await query<{ data: { follow: string[]; muted: string[] } | string; updated_at: string | number }>(`SELECT data, updated_at FROM dp_prefs WHERE user_id = $1`, [userId]);
      const prefData = prefRow ? (typeof prefRow.data === "string" ? JSON.parse(prefRow.data) : prefRow.data) : undefined;
      return {
        serverTime: now,
        entries: rows.map((row): LibraryEntry => ({
          storyId: String(row.story_id), url: String(row.url), headline: String(row.headline), date: String(row.date), topic: String(row.topic),
          saved: Boolean(row.saved), note: String(row.note), updatedAt: Number(row.updated_at),
        })),
        prefs: prefRow ? { follow: prefData.follow ?? [], muted: prefData.muted ?? [], updatedAt: Number(prefRow.updated_at) } : undefined,
      };
    },
  };
}
export type Store = ReturnType<typeof createStore>;
