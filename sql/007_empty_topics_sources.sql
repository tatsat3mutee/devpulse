-- ============================================
-- 007: Add sources for empty topics
-- Context Engineering, Vibe Coding, Agentic Patterns, AI Evals, Copilot Updates
-- ============================================

-- ── Context Engineering ─────────────────────────────────────────────
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('Reddit r/ContextEngineering', 'Reddit', 'social', 'https://www.reddit.com/r/ContextEngineering', 'reddit', true),
  ('Reddit r/LangChain (Context)', 'Reddit', 'social', 'https://www.reddit.com/r/LangChain', 'reddit', true),
  ('GitHub Context Engineering Repos', 'GitHub', 'code', 'https://api.github.com/search/repositories?q=context+engineering+OR+context+window+optimization+pushed:>DATEPLACEHOLDER&sort=stars&order=desc&per_page=15', 'github-trending', true),
  ('HN Context Engineering', 'Hacker News', 'social', 'https://hn.algolia.com/api/v1/search?query=context+engineering+OR+context+window&tags=story', 'hacker-news', true)
ON CONFLICT DO NOTHING;

-- ── Vibe Coding ─────────────────────────────────────────────────────
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('Reddit r/vibecoding', 'Reddit', 'social', 'https://www.reddit.com/r/vibecoding', 'reddit', true),
  ('Reddit r/ChatGPTCoding', 'Reddit', 'social', 'https://www.reddit.com/r/ChatGPTCoding', 'reddit', true),
  ('GitHub Vibe Coding Repos', 'GitHub', 'code', 'https://api.github.com/search/repositories?q=vibe+coding+OR+bolt.new+OR+lovable+pushed:>DATEPLACEHOLDER&sort=stars&order=desc&per_page=15', 'github-trending', true),
  ('HN Vibe Coding', 'Hacker News', 'social', 'https://hn.algolia.com/api/v1/search?query=vibe+coding+OR+bolt.new+OR+v0.dev&tags=story', 'hacker-news', true)
ON CONFLICT DO NOTHING;

-- ── Agentic Patterns ────────────────────────────────────────────────
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('Reddit r/AgenticAI', 'Reddit', 'social', 'https://www.reddit.com/r/agentic', 'reddit', true),
  ('GitHub Agentic Pattern Repos', 'GitHub', 'code', 'https://api.github.com/search/repositories?q=agentic+pattern+OR+agent+loop+OR+multi+agent+orchestration+pushed:>DATEPLACEHOLDER&sort=stars&order=desc&per_page=15', 'github-trending', true),
  ('HN Agentic Patterns', 'Hacker News', 'social', 'https://hn.algolia.com/api/v1/search?query=agentic+pattern+OR+agent+loop+OR+multi+agent&tags=story', 'hacker-news', true),
  ('CrewAI Blog', 'CrewAI', 'news', 'https://blog.crewai.com/rss/', 'rss', true)
ON CONFLICT DO NOTHING;

-- ── AI Evals & Harness ──────────────────────────────────────────────
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('GitHub AI Eval Repos', 'GitHub', 'code', 'https://api.github.com/search/repositories?q=ai+eval+OR+lm-eval+OR+evaluation+harness+pushed:>DATEPLACEHOLDER&sort=stars&order=desc&per_page=15', 'github-trending', true),
  ('HN AI Evals', 'Hacker News', 'social', 'https://hn.algolia.com/api/v1/search?query=ai+eval+OR+benchmark+OR+evaluation+harness&tags=story', 'hacker-news', true),
  ('Reddit r/MLQuestions (Evals)', 'Reddit', 'social', 'https://www.reddit.com/r/MLQuestions', 'reddit', true)
ON CONFLICT DO NOTHING;

-- ── Copilot Updates ─────────────────────────────────────────────────
-- GitHub Copilot Changelog RSS already exists from 006 but items get
-- classified as github-copilot. The keyword fix in topic-classifier.ts
-- handles reclassification. Adding one more dedicated source:
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('HN GitHub Copilot', 'Hacker News', 'social', 'https://hn.algolia.com/api/v1/search?query=github+copilot+update+OR+copilot+release&tags=story', 'hacker-news', true),
  ('Reddit r/GithubCopilot Updates', 'Reddit', 'social', 'https://www.reddit.com/r/githubcopilot', 'reddit', true)
ON CONFLICT DO NOTHING;
