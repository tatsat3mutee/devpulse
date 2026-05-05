-- Add a new knowledge guide
-- Include in sql/NNN_add_{{guide_slug}}.sql or append to an existing migration

INSERT INTO knowledge_guides (title, slug, category, icon, difficulty, tags, content)
VALUES (
  '{{Guide Title}}',
  '{{guide-slug}}',
  '{{category}}',       -- vscode | copilot | mcp | ai-tools | cloud
  '{{🤖}}',             -- Single emoji icon
  '{{difficulty}}',     -- beginner | intermediate | advanced
  ARRAY['{{tag1}}', '{{tag2}}', '{{tag3}}'],
  E'# {{Guide Title}}\n\n{{Introduction paragraph explaining what this guide covers and why it matters.}}\n\n## Getting Started\n\n{{Core content section with setup steps, concepts, or instructions.}}\n\n```{{language}}\n{{code example}}\n```\n\n## Key Concepts\n\n| Concept | Description |\n|---------|-----------|\n| {{Concept 1}} | {{Description}} |\n| {{Concept 2}} | {{Description}} |\n\n## Best Practices\n\n1. **{{Practice 1}}** — {{explanation}}\n2. **{{Practice 2}}** — {{explanation}}\n3. **{{Practice 3}}** — {{explanation}}\n4. **{{Practice 4}}** — {{explanation}}\n5. **{{Practice 5}}** — {{explanation}}'
) ON CONFLICT (slug) DO NOTHING;
