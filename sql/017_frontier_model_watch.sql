-- ============================================
-- 017: Frontier model watch — Kimi, DeepSeek, Qwen coverage
-- Run: psql -U postgres -d ai_pulse -f sql/017_frontier_model_watch.sql
--
-- Adds dedicated Model Release topics + sources for frontier labs we were
-- missing (Moonshot's Kimi, DeepSeek, Qwen), powering the new /models page
-- which surfaces every topic in the 'Model Release' category.
-- ============================================

-- ============================================
-- 1. NEW MODEL RELEASE TOPICS
-- ============================================
INSERT INTO topics (name, slug, category, category_color, description)
VALUES
  ('Kimi',     'kimi',     'Model Release', '#0aa39a', 'Moonshot AI''s Kimi model family — K-series releases, benchmarks, agentic coding'),
  ('DeepSeek', 'deepseek', 'Model Release', '#4d6bfe', 'DeepSeek models — V-series, R-series reasoning, open-weight releases'),
  ('Qwen',     'qwen',     'Model Release', '#6f42c1', 'Alibaba''s Qwen model family — open-weight releases, coder and VL variants')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. SOURCES
-- ============================================

-- Hacker News searches (high-signal for frontier model launches)
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'HN Kimi / Moonshot', 'Hacker News', 'news', 'https://hn.algolia.com/api/v1/search_by_date?query=kimi+OR+moonshot&tags=story&hitsPerPage=20', 'hacker-news', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://hn.algolia.com/api/v1/search_by_date?query=kimi+OR+moonshot&tags=story&hitsPerPage=20');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'HN DeepSeek', 'Hacker News', 'news', 'https://hn.algolia.com/api/v1/search_by_date?query=deepseek&tags=story&hitsPerPage=20', 'hacker-news', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://hn.algolia.com/api/v1/search_by_date?query=deepseek&tags=story&hitsPerPage=20');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'HN Qwen', 'Hacker News', 'news', 'https://hn.algolia.com/api/v1/search_by_date?query=qwen&tags=story&hitsPerPage=20', 'hacker-news', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://hn.algolia.com/api/v1/search_by_date?query=qwen&tags=story&hitsPerPage=20');

-- Reddit r/LocalLLaMA searches (where frontier open-weight drops break first)
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/LocalLLaMA (Kimi)', 'Reddit', 'community', 'https://www.reddit.com/r/LocalLLaMA/search.json?q=kimi+OR+moonshot&sort=new&limit=25&restrict_sr=1', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://www.reddit.com/r/LocalLLaMA/search.json?q=kimi+OR+moonshot&sort=new&limit=25&restrict_sr=1');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/LocalLLaMA (DeepSeek + Qwen)', 'Reddit', 'community', 'https://www.reddit.com/r/LocalLLaMA/search.json?q=deepseek+OR+qwen&sort=new&limit=25&restrict_sr=1', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://www.reddit.com/r/LocalLLaMA/search.json?q=deepseek+OR+qwen&sort=new&limit=25&restrict_sr=1');

-- Official Qwen blog (Hugo RSS)
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Qwen Blog', 'Blog', 'news', 'https://qwenlm.github.io/blog/index.xml', 'rss', true, 5
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://qwenlm.github.io/blog/index.xml');

-- Google News queries for launch coverage
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'GNews - Kimi Moonshot', 'GNews', 'news', 'Kimi Moonshot AI model', 'gnews', true, 3
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'Kimi Moonshot AI model' AND fetcher_key = 'gnews');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'GNews - DeepSeek', 'GNews', 'news', 'DeepSeek AI model', 'gnews', true, 3
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'DeepSeek AI model' AND fetcher_key = 'gnews');

-- ============================================
-- 3. RECLASSIFY EXISTING ITEMS
-- ============================================
UPDATE items SET topic_id = (SELECT id FROM topics WHERE slug = 'kimi')
WHERE (LOWER(title) LIKE '%kimi%' OR LOWER(title) LIKE '%moonshot%')
  AND topic_id IS DISTINCT FROM (SELECT id FROM topics WHERE slug = 'kimi');

UPDATE items SET topic_id = (SELECT id FROM topics WHERE slug = 'deepseek')
WHERE LOWER(title) LIKE '%deepseek%'
  AND topic_id IS DISTINCT FROM (SELECT id FROM topics WHERE slug = 'deepseek');

UPDATE items SET topic_id = (SELECT id FROM topics WHERE slug = 'qwen')
WHERE LOWER(title) LIKE '%qwen%'
  AND topic_id IS DISTINCT FROM (SELECT id FROM topics WHERE slug = 'qwen');
