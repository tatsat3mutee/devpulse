-- AI Pulse: New topics + sources migration
-- Run: docker exec ai-pulse-db psql -U postgres -d ai_pulse -f /tmp/003.sql

-- ============================================
-- NEW TOPICS
-- ============================================
INSERT INTO topics (name, slug, category, category_color, description) VALUES
  ('Spring AI',         'spring-ai',         'Framework',  '#6db33f', 'Spring AI — Java framework for AI/ML integration with Spring Boot'),
  ('LangChain',         'langchain',         'Framework',  '#1c3c3c', 'LangChain, LangGraph — orchestration frameworks for LLM apps'),
  ('GitHub Copilot',    'github-copilot',    'Tool',       '#000000', 'GitHub Copilot — AI pair programming, chat, agent mode'),
  ('Cursor / Windsurf', 'cursor-windsurf',   'Tool',       '#7c3aed', 'AI-native code editors — Cursor, Windsurf, Codeium'),
  ('New Models',        'new-models',        'Model Release', '#ef4444', 'New model releases, benchmarks, and announcements'),
  ('AI Coding',         'ai-coding',         'Tool',       '#f97316', 'AI coding tools, code generation, dev productivity'),
  ('Prompt Engineering','prompt-engineering', 'Technique',  '#a855f7', 'Prompt design, system prompts, chain-of-thought'),
  ('AI Safety',         'ai-safety',         'General',    '#dc2626', 'AI safety, alignment, responsible AI, regulation'),
  ('MLOps',             'mlops',             'Technique',  '#0891b2', 'ML operations, model deployment, monitoring, CI/CD for ML'),
  ('NLP',               'nlp',               'Technique',  '#2563eb', 'Natural Language Processing — text, speech, translation'),
  ('Multimodal',        'multimodal',        'Technique',  '#c026d3', 'Multimodal AI — vision+language, audio+text models'),
  ('AI Hardware',       'ai-hardware',       'General',    '#78716c', 'GPUs, TPUs, AI chips, Nvidia, AMD, custom silicon'),
  ('Hugging Face',      'hugging-face',      'Company',    '#ffd21e', 'Hugging Face platform, models, datasets, spaces')
ON CONFLICT DO NOTHING;

-- ============================================
-- NEW SOURCES
-- ============================================
INSERT INTO sources (name, platform, category, url, fetcher_key, rating) VALUES
  -- Spring AI & Java AI
  ('Reddit r/SpringBoot',        'Reddit',  'social',  'https://www.reddit.com/r/SpringBoot',    'reddit', 3.0),
  ('Reddit r/java',              'Reddit',  'social',  'https://www.reddit.com/r/java',          'reddit', 3.0),
  -- Copilot / coding tools
  ('Reddit r/githubcopilot',     'Reddit',  'social',  'https://www.reddit.com/r/githubcopilot', 'reddit', 3.0),
  ('Reddit r/cursor',            'Reddit',  'social',  'https://www.reddit.com/r/cursor',        'reddit', 3.0),
  -- More tech communities
  ('Reddit r/LangChain',         'Reddit',  'social',  'https://www.reddit.com/r/LangChain',     'reddit', 3.0),
  ('Reddit r/PromptEngineering', 'Reddit',  'social',  'https://www.reddit.com/r/PromptEngineering', 'reddit', 3.0),
  ('Reddit r/ArtificialIntelligence', 'Reddit', 'social', 'https://www.reddit.com/r/ArtificialIntelligence', 'reddit', 3.0),
  -- GitHub special repos (awesome lists)
  ('GitHub Awesome Copilot',     'GitHub',  'code',    'https://github.com/search?q=awesome+copilot+stars%3A%3E100&type=repositories&s=updated', 'github-trending', 3.0),
  ('GitHub Awesome LLM',         'GitHub',  'code',    'https://github.com/search?q=awesome+llm+stars%3A%3E100&type=repositories&s=updated', 'github-trending', 3.0),
  -- LinkedIn expanded
  ('LinkedIn AI Coding News',    'LinkedIn', 'news',   'https://news.google.com/rss/search?q=site:linkedin.com+copilot+OR+cursor+OR+AI+coding&hl=en-US&gl=US&ceid=US:en', 'linkedin', 3.0),
  ('LinkedIn Spring AI News',    'LinkedIn', 'news',   'https://news.google.com/rss/search?q=site:linkedin.com+spring+AI+OR+java+AI&hl=en-US&gl=US&ceid=US:en', 'linkedin', 3.0)
ON CONFLICT DO NOTHING;
