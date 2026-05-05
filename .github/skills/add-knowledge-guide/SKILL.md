---
name: add-knowledge-guide
description: 'Create a knowledge guide SQL INSERT for DevPulse. Generates an E-string escaped markdown INSERT into knowledge_guides with proper category, tags, slug, difficulty, and icon. Use when: adding a knowledge guide, creating educational content, writing a guide, adding to the knowledge base.'
---

# Add Knowledge Guide

Create a SQL INSERT statement for a new knowledge guide in the DevPulse knowledge base.

## When to Use This Skill

- Adding a new educational guide to the knowledge base
- Creating curated content for the Knowledge page
- Inserting a new entry into the `knowledge_guides` table

## Quick Start

1. Write the guide content in markdown
2. Wrap it in an `INSERT INTO knowledge_guides` statement using E-string syntax
3. Add to an existing migration or create a new migration file

## Step-by-Step Procedure

### Step 1 — Plan the Guide

Determine:
- **Title**: Clear, descriptive (e.g. "Getting Started with GitHub Copilot")
- **Slug**: kebab-case, unique (e.g. `getting-started-copilot`)
- **Category**: one of `vscode`, `copilot`, `mcp`, `ai-tools`, `cloud`
- **Icon**: single emoji (e.g. `🤖`, `📖`, `🧬`, `🎯`, `🔍`)
- **Difficulty**: `beginner`, `intermediate`, or `advanced`
- **Tags**: relevant keywords as a TEXT[] array

### Step 2 — Write the Markdown Content

Structure every guide with:
1. `# Title` — matches the `title` field
2. Introduction paragraph — what and why
3. `## Getting Started` or `## Key Concepts` — core content
4. Tables for comparisons or reference
5. Code blocks with language tags
6. `## Best Practices` — numbered list of actionable tips

### Step 3 — Create the SQL INSERT

Use the [guide insert skeleton](./templates/guide-insert-skeleton.sql).

Key syntax rules:
- Use `E'...'` for the content string (enables `\n` newlines)
- Escape single quotes as `''` (double single-quote)
- Use `\n` for newlines within the E-string
- Use `ARRAY['tag1', 'tag2']` for tags
- Add `ON CONFLICT (slug) DO NOTHING` for idempotency

```sql
INSERT INTO knowledge_guides (title, slug, category, icon, difficulty, tags, content)
VALUES (
  'Guide Title',
  'guide-slug',
  'category',
  '🤖',
  'intermediate',
  ARRAY['tag1', 'tag2'],
  E'# Guide Title\n\nIntroduction...\n\n## Section\n\nContent...'
) ON CONFLICT (slug) DO NOTHING;
```

### Step 4 — Add to a Migration File

Either:
- Append to an existing migration if it's part of a larger change
- Create a new `sql/NNN_add_guide_name.sql` file

## Content Guidelines

See [content guidelines](./guidelines/content-guidelines.md) for writing conventions and E-string escaping rules.

## Schema Reference

See [knowledge schema reference](./references/knowledge-schema.md) for the full table definition and existing guides.
