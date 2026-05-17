-- 014: Deep Content Sources — Algorithm deep-dives, architecture, research, independent thinkers
-- Run: psql -U postgres -d ai_pulse -f sql/014_deep_content_sources.sql
--
-- DevPulse is a lens into the AI era: not just trending repos and corporate blogs,
-- but the scattered, high-signal content about algorithms, architecture, research
-- papers, and independent thinkers that's hard to find.

-- ============================================
-- 1. NEW TOPICS
-- ============================================
INSERT INTO topics (name, slug, category, category_color, description)
VALUES
  ('DSA & Algorithms', 'dsa-algorithms', 'Technique', '#8b5cf6', 'Data structures, algorithms, competitive programming, LeetCode, system design interviews'),
  ('System Design & Architecture', 'system-design', 'Technique', '#0891b2', 'System design, software architecture, scalability, distributed systems, design patterns'),
  ('Web Development', 'web-development', 'Tool', '#f97316', 'Frontend and backend web development — React, Next.js, Vue, Svelte, Node, CSS, Tailwind'),
  ('Perplexity AI', 'perplexity-ai', 'Company', '#22d3ee', 'Perplexity AI — AI-powered search, answer engine, Sonar API, citations'),
  ('Research Papers', 'research-papers', 'General', '#a855f7', 'ML/AI research papers, benchmarks, state-of-the-art results, conference proceedings')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. INDEPENDENT RESEARCHER BLOGS (via RSS fetcher)
-- ============================================

-- Lilian Weng — legendary ML explainer (OpenAI researcher)
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Lilian Weng Blog', 'Blog', 'research', 'https://lilianweng.github.io/index.xml', 'rss', true, 5
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://lilianweng.github.io/index.xml');

-- Sebastian Raschka — ML fundamentals, LLM deep-dives
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Sebastian Raschka', 'Blog', 'research', 'https://magazine.sebastianraschka.com/feed', 'rss', true, 5
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://magazine.sebastianraschka.com/feed');

-- Chip Huyen — ML systems, MLOps, practical ML
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Chip Huyen Blog', 'Blog', 'research', 'https://huyenchip.com/feed.xml', 'rss', true, 5
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://huyenchip.com/feed.xml');

-- Simon Willison — LLM tooling, prompt engineering, practical AI
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Simon Willison Blog', 'Blog', 'news', 'https://simonwillison.net/atom/everything/', 'rss', true, 5
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://simonwillison.net/atom/everything/');

-- Jay Alammar — visual ML explanations (Transformers, embeddings)
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Jay Alammar Blog', 'Blog', 'research', 'https://jalammar.github.io/feed.xml', 'rss', true, 5
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://jalammar.github.io/feed.xml');

-- The Gradient — long-form ML/AI essays
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'The Gradient', 'Blog', 'research', 'https://thegradient.pub/rss/', 'rss', true, 5
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://thegradient.pub/rss/');

-- deeplearning.ai — Andrew Ng's The Batch newsletter
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'The Batch (Andrew Ng)', 'Blog', 'news', 'https://www.deeplearning.ai/the-batch/feed/', 'rss', true, 5
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://www.deeplearning.ai/the-batch/feed/');

-- ============================================
-- 3. RESEARCH AGGREGATORS (via RSS fetcher)
-- ============================================

-- Papers With Code — latest ML papers with implementations
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Papers With Code', 'Blog', 'research', 'https://paperswithcode.com/latest', 'rss', true, 5
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://paperswithcode.com/latest');

-- ============================================
-- 4. REDDIT DEEP-CONTENT COMMUNITIES
-- ============================================

-- DSA & Algorithms
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/algorithms', 'Reddit', 'research', 'algorithms', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'algorithms' AND fetcher_key = 'reddit');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/compsci', 'Reddit', 'research', 'compsci', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'compsci' AND fetcher_key = 'reddit');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/leetcode', 'Reddit', 'social', 'leetcode', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'leetcode' AND fetcher_key = 'reddit');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/cscareerquestions', 'Reddit', 'social', 'cscareerquestions', 'reddit', true, 3
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'cscareerquestions' AND fetcher_key = 'reddit');

-- System Design & Architecture
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/softwarearchitecture', 'Reddit', 'social', 'softwarearchitecture', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'softwarearchitecture' AND fetcher_key = 'reddit');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/ExperiencedDevs', 'Reddit', 'social', 'ExperiencedDevs', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'ExperiencedDevs' AND fetcher_key = 'reddit');

-- ML Research Communities
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/mlscaling', 'Reddit', 'research', 'mlscaling', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'mlscaling' AND fetcher_key = 'reddit');

-- AI Tools
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/perplexity_ai', 'Reddit', 'social', 'perplexity_ai', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'perplexity_ai' AND fetcher_key = 'reddit');

-- Web Development
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/webdev', 'Reddit', 'social', 'webdev', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'webdev' AND fetcher_key = 'reddit');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/reactjs', 'Reddit', 'social', 'reactjs', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'reactjs' AND fetcher_key = 'reddit');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/nextjs', 'Reddit', 'social', 'nextjs', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'nextjs' AND fetcher_key = 'reddit');

-- Languages & Infrastructure
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/golang', 'Reddit', 'social', 'golang', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'golang' AND fetcher_key = 'reddit');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/rust', 'Reddit', 'social', 'rust', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'rust' AND fetcher_key = 'reddit');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/kubernetes', 'Reddit', 'social', 'kubernetes', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'kubernetes' AND fetcher_key = 'reddit');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'r/devops', 'Reddit', 'social', 'devops', 'reddit', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'devops' AND fetcher_key = 'reddit');

-- ============================================
-- 5. GITHUB SEARCH — Novel/research repos
-- ============================================

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'GitHub Algorithm Repos', 'GitHub', 'research',
  'https://api.github.com/search/repositories?q=topic:algorithms+stars:>20+pushed:>2025-04-01&sort=updated&order=desc',
  'github-trending', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE name = 'GitHub Algorithm Repos');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'GitHub System Design Repos', 'GitHub', 'research',
  'https://api.github.com/search/repositories?q=topic:system-design+stars:>20+pushed:>2025-04-01&sort=updated&order=desc',
  'github-trending', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE name = 'GitHub System Design Repos');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'GitHub Paper Implementations', 'GitHub', 'research',
  'https://api.github.com/search/repositories?q=paper+implementation+machine+learning+stars:>10+pushed:>2025-04-01&sort=updated&order=desc',
  'github-trending', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE name = 'GitHub Paper Implementations');

-- ============================================
-- 6. YOUTUBE DEEP-DIVE CHANNELS
-- ============================================

-- ByteByteGo — Alex Xu, system design visualized
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'ByteByteGo', 'YouTube', 'education', 'UCZgt6AzoyjslHTC9dz0UoTw', 'youtube', true, 5
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'UCZgt6AzoyjslHTC9dz0UoTw');

-- NeetCode — DSA & algorithms with clear explanations
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'NeetCode', 'YouTube', 'education', 'UC_mYaQAE6-71rjSN6CeCA-g', 'youtube', true, 5
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'UC_mYaQAE6-71rjSN6CeCA-g');

-- ArjanCodes — software design patterns in Python
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'ArjanCodes', 'YouTube', 'education', 'UCVhQ2NnY5Rskt6UjCUkJ_DA', 'youtube', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'UCVhQ2NnY5Rskt6UjCUkJ_DA');

-- Hussein Nasser — backend engineering & architecture deep-dives
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Hussein Nasser', 'YouTube', 'education', 'UC_ML5xP23TOWKUcc-oAE_Eg', 'youtube', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'UC_ML5xP23TOWKUcc-oAE_Eg');

-- AI Coffee Break with Letitia — ML paper explanations
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'AI Coffee Break', 'YouTube', 'education', 'UCobqgqE4i5Kf7wrxRiODiUA', 'youtube', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'UCobqgqE4i5Kf7wrxRiODiUA');

-- The Coding Train — creative coding, algorithms visualized
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'The Coding Train', 'YouTube', 'education', 'UCvjgXvBlISQQnCxQCZEfg8g', 'youtube', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'UCvjgXvBlISQQnCxQCZEfg8g');
