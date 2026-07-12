-- 015: Password reset tokens + missing indexes
-- Run ONCE: psql $DATABASE_URL -f sql/015_password_reset_and_indexes.sql

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id);

-- Missing indexes on existing tables
CREATE INDEX IF NOT EXISTS idx_user_saves_item ON user_saves(item_id);
CREATE INDEX IF NOT EXISTS idx_items_retention ON items ((COALESCE(published_at, fetched_at)));
