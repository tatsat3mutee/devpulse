-- 013: Enterprise Expansion — New topics, sources, YouTube cleanup, language coverage
-- Run: psql -U postgres -d ai_pulse -f sql/013_enterprise_expansion.sql

-- ============================================
-- 1. NEW TOPICS (enterprise & developer-focused)
-- ============================================
INSERT INTO topics (name, slug, category, category_color, description)
VALUES
  ('Coding Agents', 'coding-agents', 'Tool', '#7c3aed', 'AI coding agents — Copilot Agent Mode, Cursor, Claude Code, Windsurf, Devin, Cline, Aider'),
  ('AI Testing', 'ai-testing', 'Tool', '#16a34a', 'AI-assisted testing — test generation, QA automation, mutation testing, AI evals for software'),
  ('AI DevOps', 'ai-devops', 'Technique', '#0ea5e9', 'AI in CI/CD pipelines, GitHub Actions AI, IaC with AI, platform engineering, AI SRE'),
  ('AI Security', 'ai-security', 'General', '#ef4444', 'LLM security — prompt injection defense, red teaming, guardrails, OWASP AI Top 10, adversarial attacks'),
  ('AI Governance', 'ai-governance', 'General', '#6b7280', 'Enterprise AI governance — compliance, cost optimization, private deployment, model auditing, policy')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. YOUTUBE SOURCES — Remove Lex Fridman, add Indian creators
-- ============================================

-- Deactivate Lex Fridman (channel produces too many non-AI clips)
UPDATE sources SET is_active = false WHERE url = 'UCSHZKyawb77ixDdsGog4iWA';

-- Add Indian AI/dev creators (use WHERE NOT EXISTS since sources.url has no unique constraint)
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Piyush Garg', 'YouTube', 'education', 'UCyPBAMFlAIadIjt-4vPqaLw', 'youtube', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'UCyPBAMFlAIadIjt-4vPqaLw');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Hitesh Choudhary', 'YouTube', 'education', 'UCVjlmGGb1suVvwYXdMMSHNA', 'youtube', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'UCVjlmGGb1suVvwYXdMMSHNA');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Harkirat Singh', 'YouTube', 'education', 'UC_seDWJHxCAkq95bCPoHj3Q', 'youtube', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'UC_seDWJHxCAkq95bCPoHj3Q');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Tanay Pratap', 'YouTube', 'education', 'UCNFmBuclxQPe57orKiQKp5g', 'youtube', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'UCNFmBuclxQPe57orKiQKp5g');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Akshay Saini', 'YouTube', 'education', 'UC3N9i_KvKZYP4F84FPIzgPQ', 'youtube', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'UC3N9i_KvKZYP4F84FPIzgPQ');

-- ============================================
-- 3. GITHUB TRENDING — Go, Rust, Java (enterprise languages)
-- ============================================
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'GitHub Trending (Go)', 'GitHub', 'code', 'https://github.com/trending/go', 'github-trending', true, 3
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://github.com/trending/go');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'GitHub Trending (Rust)', 'GitHub', 'code', 'https://github.com/trending/rust', 'github-trending', true, 3
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://github.com/trending/rust');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'GitHub Trending (Java)', 'GitHub', 'code', 'https://github.com/trending/java', 'github-trending', true, 3
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://github.com/trending/java');

-- ============================================
-- 4. TESTING / QA SOURCES
-- ============================================
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Reddit r/softwaretesting', 'Reddit', 'social', 'https://www.reddit.com/r/softwaretesting', 'reddit', true, 3
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://www.reddit.com/r/softwaretesting');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Reddit r/QualityAssurance', 'Reddit', 'social', 'https://www.reddit.com/r/QualityAssurance', 'reddit', true, 3
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://www.reddit.com/r/QualityAssurance');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Playwright Blog', 'Playwright', 'news', 'https://playwright.dev/blog/rss.xml', 'rss', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://playwright.dev/blog/rss.xml');

-- ============================================
-- 5. DEVOPS / PLATFORM ENGINEERING SOURCES
-- ============================================
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Reddit r/devops', 'Reddit', 'social', 'https://www.reddit.com/r/devops', 'reddit', true, 3
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://www.reddit.com/r/devops');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Reddit r/platformengineering', 'Reddit', 'social', 'https://www.reddit.com/r/platformengineering', 'reddit', true, 3
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://www.reddit.com/r/platformengineering');

INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'GitHub Engineering Blog', 'GitHub', 'news', 'https://github.blog/engineering/feed/', 'rss', true, 4
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://github.blog/engineering/feed/');

-- ============================================
-- 6. SECURITY SOURCES
-- ============================================
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active, rating)
SELECT 'Reddit r/netsec', 'Reddit', 'social', 'https://www.reddit.com/r/netsec', 'reddit', true, 3
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://www.reddit.com/r/netsec');
