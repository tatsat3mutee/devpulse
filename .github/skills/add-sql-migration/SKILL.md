---
name: add-sql-migration
description: 'Generate a numbered SQL migration for DevPulse. Creates idempotent INSERT/ALTER statements with ON CONFLICT, proper TEXT[] array syntax, and JSONB defaults. Use when: adding topics, sources, knowledge guides, altering schema, seeding data, creating database migration.'
---

# Add SQL Migration

Generate a numbered, idempotent SQL migration file for the DevPulse PostgreSQL database.

## When to Use This Skill

- Adding new topics, sources, or knowledge guides to the database
- Altering table schema (new columns, indexes)
- Seeding or updating reference data
- Creating a new migration file in `sql/`

## Quick Start

1. Determine the next migration number (check `sql/` directory)
2. Create `sql/NNN_description.sql` using the [migration skeleton](./templates/migration-skeleton.sql)
3. Use idempotent patterns (`ON CONFLICT`, `IF NOT EXISTS`)
4. Run with `psql -U postgres -d ai_pulse -f sql/NNN_description.sql`

## Step-by-Step Procedure

### Step 1 — Determine the Migration Number

Check existing files in `sql/`. The current highest is `008`. Name the next file `sql/009_description.sql`.

Use snake_case for the description: `009_add_devto_sources.sql`.

### Step 2 — Write Idempotent SQL

Every statement must be safe to run multiple times:

**INSERT rows:**
```sql
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES ('Name', 'Platform', 'category', 'https://...', 'fetcher-key', true)
ON CONFLICT DO NOTHING;
```

**Add columns:**
```sql
ALTER TABLE items ADD COLUMN IF NOT EXISTS new_col TEXT;
```

**Create tables:**
```sql
CREATE TABLE IF NOT EXISTS new_table ( ... );
```

**Create indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_name ON table(column);
```

### Step 3 — Follow Data Conventions

See [schema summary](./references/schema-summary.md) for full table definitions and conventions.

#### Topics
```sql
INSERT INTO topics (name, slug, category, category_color, description)
VALUES ('Topic Name', 'topic-slug', 'Category', '#HEX_COLOR', 'Description text')
ON CONFLICT (slug) DO NOTHING;
```
- `slug`: kebab-case, unique
- `category`: one of `Technique`, `Tool`, `Company`, `Model Release`, `Cloud`, `Education`, `News`, `Analysis`
- `category_color`: hex color string

#### Sources
```sql
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES ('Source Name', 'Platform', 'category', 'url_or_param', 'fetcher-key', true)
ON CONFLICT DO NOTHING;
```
- `category`: `research`, `code`, `social`, `news`, `education`, `general`
- `fetcher_key`: must match a key in `backend/src/fetchers/index.ts` registry

#### TEXT[] Arrays
```sql
ARRAY['tag-one', 'tag-two', 'tag-three']
```

#### JSONB Defaults
```sql
metadata JSONB DEFAULT '{}'
```

### Step 4 — Add a Header Comment

```sql
-- ============================================
-- NNN: Description of what this migration does
-- ============================================
```

## Checklist

See [full checklist](./references/checklist.md).

## Common Patterns

- **Bulk inserts**: Use a single `INSERT INTO ... VALUES (...), (...), (...) ON CONFLICT ...` for multiple rows of the same table.
- **E-strings for markdown**: When inserting markdown content (e.g. knowledge guides), use `E'...'` with escaped single quotes (`''`), and `\n` for newlines.
- **Multi-table migrations**: Group related changes with comment separators.
