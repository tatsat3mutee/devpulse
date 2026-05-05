-- ============================================
-- {{NNN}}: {{DESCRIPTION}}
-- ============================================

-- 1. {{Section description}}
INSERT INTO topics (name, slug, category, category_color, description)
VALUES
  ('{{Topic Name}}', '{{topic-slug}}', '{{Category}}', '{{#HEX}}', '{{Description}}')
ON CONFLICT (slug) DO NOTHING;

-- 2. {{Section description}}
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('{{Source Name}}', '{{Platform}}', '{{category}}', '{{https://api.example.com}}', '{{fetcher-key}}', true)
ON CONFLICT DO NOTHING;

-- 3. Schema changes (if needed)
-- ALTER TABLE items ADD COLUMN IF NOT EXISTS {{column_name}} {{TYPE}};
-- CREATE INDEX IF NOT EXISTS idx_{{table}}_{{column}} ON {{table}}({{column}});
