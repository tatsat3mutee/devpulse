-- AI Pulse Schema
-- Run: psql -U postgres -d ai_pulse -f sql/001_schema.sql

-- ============================================
-- SOURCES: Where we fetch from
-- ============================================
CREATE TABLE IF NOT EXISTS sources (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,                -- "arXiv AI Papers"
  platform      TEXT NOT NULL,                -- "arXiv", "GitHub", "Reddit"
  category      TEXT NOT NULL DEFAULT 'general', -- "research", "code", "social", "news"
  url           TEXT NOT NULL,                -- Base URL for the source
  fetcher_key   TEXT NOT NULL,                -- Maps to a fetcher function: "arxiv", "github-trending"
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_fetched  TIMESTAMPTZ,
  rating        NUMERIC(2,1) DEFAULT 3.0,    -- 1.0 to 5.0
  fetch_interval_minutes INTEGER DEFAULT 60,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TOPICS: Grouping/clustering of items
-- ============================================
CREATE TABLE IF NOT EXISTS topics (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,         -- "RAG", "Claude Code", "Agentic AI"
  slug          TEXT NOT NULL UNIQUE,         -- "rag", "claude-code", "agentic-ai"
  category      TEXT NOT NULL DEFAULT 'general', -- "Technique", "Tool", "Company", "Model Release"
  category_color TEXT DEFAULT '#888888',      -- Badge color for the category
  description   TEXT,
  first_seen    TIMESTAMPTZ DEFAULT NOW(),
  last_updated  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ITEMS: The actual content we aggregate
-- ============================================
CREATE TABLE IF NOT EXISTS items (
  id            SERIAL PRIMARY KEY,
  source_id     INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  topic_id      INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  url           TEXT NOT NULL,                -- Direct link to original content
  type          TEXT NOT NULL DEFAULT 'news', -- "paper", "repo", "social", "news"
  platform      TEXT NOT NULL,                -- "arXiv", "GitHub", "Reddit", etc.
  tags          TEXT[] DEFAULT '{}',          -- PostgreSQL array: {"cs.AI", "cs.CL"}
  score         NUMERIC(8,2) DEFAULT 0,      -- Computed hotness score
  is_bookmarked BOOLEAN DEFAULT false,
  published_at  TIMESTAMPTZ,                 -- When the original content was published
  fetched_at    TIMESTAMPTZ DEFAULT NOW(),    -- When we fetched it
  metadata      JSONB DEFAULT '{}',           -- Extra data: stars, citations, upvotes, etc.
  UNIQUE(url)                                 -- Dedupe by URL
);

-- ============================================
-- SETTINGS: User preferences (key-value)
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  key           TEXT PRIMARY KEY,
  value         TEXT NOT NULL
);

-- ============================================
-- INDEXES for fast queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_items_topic       ON items(topic_id);
CREATE INDEX IF NOT EXISTS idx_items_source      ON items(source_id);
CREATE INDEX IF NOT EXISTS idx_items_type        ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_platform    ON items(platform);
CREATE INDEX IF NOT EXISTS idx_items_published   ON items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_score       ON items(score DESC);
CREATE INDEX IF NOT EXISTS idx_items_fetched     ON items(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_topics_slug       ON topics(slug);
