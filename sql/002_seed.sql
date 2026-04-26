-- AI Pulse Seed Data
-- Run: psql -U postgres -d ai_pulse -f sql/002_seed.sql

-- ============================================
-- SOURCES (Phase 1: free APIs, no auth)
-- ============================================
INSERT INTO sources (name, platform, category, url, fetcher_key, rating) VALUES
  ('arXiv AI Papers',           'arXiv',        'research', 'https://export.arxiv.org/api/query',        'arxiv',            3.0),
  ('GitHub Trending (Python)',  'GitHub',        'code',     'https://github.com/trending/python',        'github-trending',  3.0),
  ('GitHub Trending (TypeScript)', 'GitHub',     'code',     'https://github.com/trending/typescript',    'github-trending',  3.0),
  ('Hacker News Top Stories',   'Hacker News',  'news',     'https://hn.algolia.com/api/v1',             'hacker-news',      3.0),
  ('Hugging Face Daily Papers', 'Hugging Face', 'research', 'https://huggingface.co/api/daily_papers',   'huggingface',      3.0),
  ('Reddit r/MachineLearning',  'Reddit',       'social',   'https://www.reddit.com/r/MachineLearning',  'reddit',           3.0),
  ('Reddit r/LocalLLaMA',       'Reddit',       'social',   'https://www.reddit.com/r/LocalLLaMA',       'reddit',           3.0),
  ('Reddit r/artificial',       'Reddit',       'social',   'https://www.reddit.com/r/artificial',       'reddit',           3.0),
  ('Reddit r/ChatGPT',          'Reddit',       'social',   'https://www.reddit.com/r/ChatGPT',          'reddit',           3.0),
  ('Reddit r/deeplearning',     'Reddit',       'social',   'https://www.reddit.com/r/deeplearning',     'reddit',           3.0),
  ('Reddit r/singularity',      'Reddit',       'social',   'https://www.reddit.com/r/singularity',      'reddit',           3.0),
  ('Reddit r/ClaudeAI',         'Reddit',       'social',   'https://www.reddit.com/r/ClaudeAI',         'reddit',           3.0),
  ('Reddit r/OpenAI',           'Reddit',       'social',   'https://www.reddit.com/r/OpenAI',           'reddit',           3.0),
  ('Reddit r/ollama',           'Reddit',       'social',   'https://www.reddit.com/r/ollama',           'reddit',           3.0),
  ('Reddit r/StableDiffusion',  'Reddit',       'social',   'https://www.reddit.com/r/StableDiffusion',  'reddit',           3.0),
  ('GitHub Trending Weekly (Python)',    'GitHub', 'code',   'https://github.com/trending/python?since=weekly',     'github-trending', 3.0),
  ('GitHub Trending Monthly (TypeScript)', 'GitHub', 'code', 'https://github.com/trending/typescript?since=monthly', 'github-trending', 3.0),
  ('GitHub Trending Monthly (Python)',   'GitHub', 'code',   'https://github.com/trending/python?since=monthly',    'github-trending', 3.0),
  ('X AI Search',                'X',             'social',  'https://api.x.com/2/tweets/search/recent?q=AI+OR+LLM+OR+GPT+lang:en+-is:retweet', 'twitter', 3.0),
  ('X ML Search',                'X',             'social',  'https://api.x.com/2/tweets/search/recent?q=machine+learning+OR+deep+learning+lang:en+-is:retweet', 'twitter', 3.0),
  ('LinkedIn AI News',           'LinkedIn',      'news',    'https://news.google.com/rss/search?q=site:linkedin.com+artificial+intelligence+OR+LLM+OR+GPT&hl=en-US&gl=US&ceid=US:en', 'linkedin', 3.0),
  ('LinkedIn ML News',           'LinkedIn',      'news',    'https://news.google.com/rss/search?q=site:linkedin.com+machine+learning+OR+deep+learning&hl=en-US&gl=US&ceid=US:en', 'linkedin', 3.0)
ON CONFLICT DO NOTHING;

-- ============================================
-- TOPICS (initial clusters)
-- ============================================
INSERT INTO topics (name, slug, category, category_color, description) VALUES
  ('RAG',              'rag',              'Technique',     '#e8a87c', 'Retrieval-Augmented Generation — combining search with LLMs'),
  ('Agentic AI',       'agentic-ai',       'Technique',     '#6366f1', 'AI agents that plan, use tools, and execute multi-step tasks'),
  ('Claude Code',      'claude-code',      'Tool',          '#d97706', 'Anthropic''s terminal-native agentic coding tool'),
  ('Agent Skills',     'agent-skills',     'General',       '#888888', 'Skills, plugins, and customization for AI coding agents'),
  ('GPT',              'gpt',              'Model Release', '#10a37f', 'OpenAI GPT model family — GPT-4, GPT-5, o-series'),
  ('Grok',             'grok',             'Model Release', '#1da1f2', 'xAI''s Grok model series'),
  ('Mistral AI',       'mistral-ai',       'Company',       '#ff6b35', 'Mistral AI — Mixtral, Pixtral, and European AI'),
  ('Anthropic',        'anthropic',        'Company',       '#d97706', 'Anthropic — Claude model family and safety research'),
  ('Microsoft',        'microsoft',        'Company',       '#0078d4', 'Microsoft AI — Copilot, Azure AI, Phi models'),
  ('Google DeepMind',  'google-deepmind',  'Company',       '#4285f4', 'Google DeepMind — Gemini, AlphaFold, research'),
  ('Meta AI',          'meta-ai',          'Company',       '#0668E1', 'Meta AI — Llama, open-weight models'),
  ('Alibaba Cloud',    'alibaba-cloud',    'Company',       '#ff6a00', 'Alibaba — Qwen models, cloud AI services'),
  ('Fine-Tuning',      'fine-tuning',      'Technique',     '#8b5cf6', 'Model fine-tuning, LoRA, QLoRA, PEFT techniques'),
  ('MCP',              'mcp',              'Tool',          '#10a37f', 'Model Context Protocol — standardized tool integration for AI'),
  ('Embeddings',       'embeddings',       'Technique',     '#06b6d4', 'Text/image embeddings, vector search, similarity'),
  ('Open Source',      'open-source',      'General',       '#238636', 'Open-source AI models, tools, and frameworks'),
  ('LLM Inference',    'llm-inference',    'Technique',     '#f59e0b', 'Serving, optimization, quantization, vLLM, Ollama'),
  ('Computer Vision',  'computer-vision',  'Technique',     '#ec4899', 'Image/video models, diffusion, object detection'),
  ('General',          'general',          'General',       '#888888', 'Uncategorized AI developments')
ON CONFLICT DO NOTHING;

-- ============================================
-- DEFAULT SETTINGS
-- ============================================
INSERT INTO settings (key, value) VALUES
  ('digest_name', 'AI Digest'),
  ('fetch_interval_minutes', '60'),
  ('theme', 'light')
ON CONFLICT DO NOTHING;
