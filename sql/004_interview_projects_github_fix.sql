-- AI Pulse: Interview Prep, Project Ideas, fix GitHub sources
-- Run: docker exec ai-pulse-db psql -U postgres -d ai_pulse -f /tmp/004.sql

-- ============================================
-- NEW TOPICS: Interview Prep + Project Ideas
-- ============================================
INSERT INTO topics (name, slug, category, category_color, description) VALUES
  ('Interview Prep',    'interview-prep',    'Career',    '#0ea5e9', 'Coding interviews, system design, DSA prep, behavioral questions'),
  ('Project Ideas',     'project-ideas',     'Career',    '#22c55e', 'AI/ML project ideas, side projects, portfolio builders, hackathon starters')
ON CONFLICT DO NOTHING;

-- ============================================
-- NEW SOURCES: Interview + Project Ideas feeds
-- ============================================
INSERT INTO sources (name, platform, category, url, fetcher_key, rating) VALUES
  -- Interview prep Reddit communities
  ('Reddit r/cscareerquestions',  'Reddit',  'social', 'https://www.reddit.com/r/cscareerquestions',  'reddit', 3.0),
  ('Reddit r/leetcode',           'Reddit',  'social', 'https://www.reddit.com/r/leetcode',           'reddit', 3.0),
  ('Reddit r/ExperiencedDevs',    'Reddit',  'social', 'https://www.reddit.com/r/ExperiencedDevs',    'reddit', 3.0),
  ('Reddit r/MLQuestions',        'Reddit',  'social', 'https://www.reddit.com/r/MLQuestions',        'reddit', 3.0),
  -- Project ideas
  ('Reddit r/SideProject',        'Reddit',  'social', 'https://www.reddit.com/r/SideProject',        'reddit', 3.0),
  ('Reddit r/learnprogramming',   'Reddit',  'social', 'https://www.reddit.com/r/learnprogramming',   'reddit', 3.0),
  ('Reddit r/Python',             'Reddit',  'social', 'https://www.reddit.com/r/Python',             'reddit', 3.0)
ON CONFLICT DO NOTHING;

-- ============================================
-- FIX GitHub sources: use Search API URLs
-- ============================================
UPDATE sources SET url = 'https://api.github.com/search/repositories?q=machine-learning+OR+deep-learning+OR+LLM+language:python+pushed:>2026-04-20+stars:>50&sort=stars&order=desc'
  WHERE name = 'GitHub Trending (Python)';

UPDATE sources SET url = 'https://api.github.com/search/repositories?q=machine-learning+OR+deep-learning+OR+LLM+language:typescript+pushed:>2026-04-20+stars:>50&sort=stars&order=desc'
  WHERE name = 'GitHub Trending (TypeScript)';

UPDATE sources SET url = 'https://api.github.com/search/repositories?q=machine-learning+OR+deep-learning+OR+LLM+language:python+pushed:>2026-04-12+stars:>100&sort=stars&order=desc'
  WHERE name = 'GitHub Trending Weekly (Python)';

UPDATE sources SET url = 'https://api.github.com/search/repositories?q=machine-learning+OR+LLM+OR+AI+language:typescript+pushed:>2026-03-26+stars:>100&sort=stars&order=desc'
  WHERE name = 'GitHub Trending Monthly (TypeScript)';

UPDATE sources SET url = 'https://api.github.com/search/repositories?q=machine-learning+OR+LLM+OR+AI+language:python+pushed:>2026-03-26+stars:>100&sort=stars&order=desc'
  WHERE name = 'GitHub Trending Monthly (Python)';

-- New GitHub search sources (use API URL format directly)
INSERT INTO sources (name, platform, category, url, fetcher_key, rating) VALUES
  ('GitHub Interview Prep Repos',  'GitHub', 'code', 'https://api.github.com/search/repositories?q=interview+OR+coding-interview+OR+system-design+pushed:>2026-04-01+stars:>100&sort=updated&order=desc', 'github-trending', 3.0),
  ('GitHub Project Ideas Repos',   'GitHub', 'code', 'https://api.github.com/search/repositories?q=awesome+OR+project-ideas+OR+beginner-projects+pushed:>2026-04-01+stars:>50&sort=updated&order=desc',   'github-trending', 3.0),
  ('GitHub Spring AI Repos',       'GitHub', 'code', 'https://api.github.com/search/repositories?q=spring-ai+OR+spring-boot-ai+language:java+pushed:>2026-04-01+stars:>10&sort=updated&order=desc',      'github-trending', 3.0),
  ('GitHub Copilot Tools Repos',   'GitHub', 'code', 'https://api.github.com/search/repositories?q=copilot+OR+github-copilot+pushed:>2026-04-01+stars:>50&sort=updated&order=desc',                      'github-trending', 3.0),
  ('GitHub LLM Frameworks',        'GitHub', 'code', 'https://api.github.com/search/repositories?q=langchain+OR+llamaindex+OR+autogen+OR+crewai+pushed:>2026-04-12+stars:>50&sort=stars&order=desc',     'github-trending', 3.0)
ON CONFLICT DO NOTHING;

-- New LinkedIn sources for career content
INSERT INTO sources (name, platform, category, url, fetcher_key, rating) VALUES
  ('LinkedIn Interview Tips',     'LinkedIn', 'news', 'https://news.google.com/rss/search?q=site:linkedin.com+software+engineer+interview+OR+system+design+interview&hl=en-US&gl=US&ceid=US:en', 'linkedin', 3.0),
  ('LinkedIn AI Project Ideas',   'LinkedIn', 'news', 'https://news.google.com/rss/search?q=site:linkedin.com+AI+project+ideas+OR+ML+portfolio+OR+AI+side+project&hl=en-US&gl=US&ceid=US:en',   'linkedin', 3.0)
ON CONFLICT DO NOTHING;
