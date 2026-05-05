-- Fix broken RSS feed URLs and disable dead Reddit subreddit
-- Run against your PostgreSQL instance

-- VS Code Blog: correct feed URL
UPDATE sources
SET url = 'https://code.visualstudio.com/blogs/feed.xml'
WHERE name = 'VS Code Blog';

-- Anthropic News: correct RSS path
UPDATE sources
SET url = 'https://www.anthropic.com/rss.xml'
WHERE name = 'Anthropic News';

-- Meta AI Blog: correct path (rss/ not feed/)
UPDATE sources
SET url = 'https://ai.meta.com/blog/rss/'
WHERE name = 'Meta AI Blog';

-- r/ArtificialIntelligence is quarantined on Reddit — disable it
-- r/artificial covers the same content and works fine
UPDATE sources
SET is_active = false
WHERE name = 'Reddit r/ArtificialIntelligence';
