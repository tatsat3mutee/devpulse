-- Add sources specifically targeting Mistral AI content

-- Reddit: r/MistralAI
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active) VALUES
  ('r/MistralAI', 'Reddit', 'community', 'https://www.reddit.com/r/MistralAI/hot.json?limit=25', 'reddit', true),
  ('r/LocalLLaMA (Mistral)', 'Reddit', 'community', 'https://www.reddit.com/r/LocalLLaMA/search.json?q=mistral+OR+mixtral+OR+pixtral&sort=new&limit=25&restrict_sr=1', 'reddit', true)
ON CONFLICT DO NOTHING;

-- GitHub: Mistral repos
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active) VALUES
  ('GitHub Mistral AI Repos', 'GitHub', 'code', 'https://api.github.com/search/repositories?q=mistral+OR+mixtral+OR+pixtral+pushed:>DATEPLACEHOLDER&sort=stars&order=desc&per_page=20', 'github-trending', true)
ON CONFLICT DO NOTHING;

-- Hacker News: Mistral search
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active) VALUES
  ('HN Mistral AI', 'Hacker News', 'news', 'https://hn.algolia.com/api/v1/search_by_date?query=mistral+OR+mixtral&tags=story&hitsPerPage=20', 'hacker-news', true)
ON CONFLICT DO NOTHING;

-- LinkedIn: Mistral news
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active) VALUES
  ('LinkedIn Mistral News', 'LinkedIn', 'news', 'https://news.google.com/rss/search?q=site:linkedin.com+Mistral+AI&hl=en-US&gl=US&ceid=US:en', 'linkedin', true)
ON CONFLICT DO NOTHING;

-- Reclassify the one existing item that mentions Mistral
UPDATE items SET topic_id = (SELECT id FROM topics WHERE slug = 'mistral-ai')
WHERE id IN (
  SELECT id FROM items
  WHERE (LOWER(title) LIKE '%mistral%' OR LOWER(title) LIKE '%mixtral%' OR LOWER(title) LIKE '%pixtral%')
    AND topic_id != (SELECT id FROM topics WHERE slug = 'mistral-ai')
);
