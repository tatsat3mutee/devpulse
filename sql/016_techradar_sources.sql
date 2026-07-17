-- ============================================
-- 016: Port remaining sources from the retired techradar repo
-- Run: psql -U postgres -d ai_pulse -f sql/016_techradar_sources.sql
--
-- TechRadar (github.com/tatsat3mutee/techradar) is being retired.
-- All of its feeds already exist in DevPulse except these three.
-- ============================================

-- Google DeepMind — Gemini, AlphaFold, frontier research announcements
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Google DeepMind Blog', 'Google', 'news', 'https://deepmind.google/blog/rss.xml', 'rss', true, 5
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://deepmind.google/blog/rss.xml');

-- Hugging Face Blog — model releases, library updates, community research
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Hugging Face Blog', 'Hugging Face', 'news', 'https://huggingface.co/blog/feed.xml', 'rss', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://huggingface.co/blog/feed.xml');

-- BAIR Blog — Berkeley AI Research, long-form academic posts
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'BAIR Blog', 'Blog', 'research', 'https://bair.berkeley.edu/blog/feed.xml', 'rss', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://bair.berkeley.edu/blog/feed.xml');
