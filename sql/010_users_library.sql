-- 010: Multi-user auth + personal library
-- Run ONCE: psql $DATABASE_URL -f sql/010_users_library.sql

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS user_saves (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id   INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  note      TEXT,
  saved_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_user_saves_user ON user_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saves_item ON user_saves(item_id);
CREATE INDEX IF NOT EXISTS idx_user_saves_time ON user_saves(user_id, saved_at DESC);
