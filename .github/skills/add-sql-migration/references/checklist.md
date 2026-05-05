# Add SQL Migration — Checklist

## File Naming

- [ ] File is in `sql/` directory
- [ ] Filename follows pattern: `NNN_snake_case_description.sql`
- [ ] Number is sequential (one higher than the current max)

## Idempotency

- [ ] `INSERT` statements use `ON CONFLICT DO NOTHING` or `ON CONFLICT (col) DO NOTHING`
- [ ] `ALTER TABLE` uses `ADD COLUMN IF NOT EXISTS`
- [ ] `CREATE TABLE` uses `IF NOT EXISTS`
- [ ] `CREATE INDEX` uses `IF NOT EXISTS`
- [ ] Migration can be safely re-run without errors or duplicates

## Data Conventions

### Topics
- [ ] `slug` is kebab-case and unique
- [ ] `category` matches existing categories or is a new valid one
- [ ] `category_color` is a valid hex color string
- [ ] `description` is concise (one sentence)

### Sources
- [ ] `platform` matches the value returned by the fetcher's `FetchResult.platform`
- [ ] `fetcher_key` matches a key in `backend/src/fetchers/index.ts` registry
- [ ] `category` is one of: `research`, `code`, `social`, `news`, `education`, `general`
- [ ] `url` contains what the fetcher expects as its `sourceUrl` parameter

### Knowledge Guides
- [ ] Uses `E'...'` syntax for markdown content with `\n` newlines
- [ ] Single quotes within content are escaped as `''`
- [ ] `slug` is unique and kebab-case
- [ ] `category` is one of: `vscode`, `copilot`, `mcp`, `ai-tools`, `cloud`
- [ ] `difficulty` is `beginner`, `intermediate`, or `advanced`
- [ ] `tags` uses `ARRAY['tag1', 'tag2']` syntax

### TEXT[] Arrays
- [ ] Uses `ARRAY['val1', 'val2']` syntax (not `'{val1,val2}'`)

## Header
- [ ] File starts with a descriptive comment block
