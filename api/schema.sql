-- DevPulse accounts and library. Prefixed dp_ so it can share a Neon database with older tables.
CREATE TABLE IF NOT EXISTS dp_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dp_users_email ON dp_users (lower(email));

-- One row per sign-in method; a verified email links Google and GitHub to the same user.
CREATE TABLE IF NOT EXISTS dp_identities (
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES dp_users (id) ON DELETE CASCADE,
  email TEXT,
  PRIMARY KEY (provider, provider_id)
);

-- Only a SHA-256 of the session token is stored, so a database leak does not leak sessions.
CREATE TABLE IF NOT EXISTS dp_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES dp_users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Saved stories and notes. updated_at is the client's edit time (last write wins);
-- synced_at is when the server stored it, so devices can ask for "everything since".
CREATE TABLE IF NOT EXISTS dp_library (
  user_id BIGINT NOT NULL REFERENCES dp_users (id) ON DELETE CASCADE,
  story_id TEXT NOT NULL,
  url TEXT NOT NULL,
  headline TEXT NOT NULL,
  date TEXT NOT NULL,
  topic TEXT NOT NULL,
  saved BOOLEAN NOT NULL DEFAULT false,
  note TEXT NOT NULL DEFAULT '',
  updated_at BIGINT NOT NULL,
  synced_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, story_id)
);
CREATE INDEX IF NOT EXISTS dp_library_synced ON dp_library (user_id, synced_at);

CREATE TABLE IF NOT EXISTS dp_prefs (
  user_id BIGINT PRIMARY KEY REFERENCES dp_users (id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at BIGINT NOT NULL,
  synced_at BIGINT NOT NULL
);
