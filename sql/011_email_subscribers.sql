-- Migration 011: email digest subscribers
CREATE TABLE IF NOT EXISTS email_subscribers (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  confirmed     BOOLEAN NOT NULL DEFAULT true,
  frequency     TEXT NOT NULL DEFAULT 'weekly',  -- 'weekly' | 'daily'
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

-- Index for fast lookup on digest sending
CREATE INDEX IF NOT EXISTS idx_email_subscribers_active
  ON email_subscribers (confirmed, unsubscribed_at)
  WHERE unsubscribed_at IS NULL;
