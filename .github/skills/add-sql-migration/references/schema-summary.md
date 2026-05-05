# DevPulse Database Schema Summary

Source: `sql/001_schema.sql` (base) + migrations `002`–`008`

## Tables

### `sources`
Where we fetch content from.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `SERIAL PK` | Auto-increment |
| `name` | `TEXT NOT NULL` | Display name: `"arXiv AI Papers"` |
| `platform` | `TEXT NOT NULL` | Brand name: `"arXiv"`, `"GitHub"`, `"Reddit"` |
| `category` | `TEXT NOT NULL DEFAULT 'general'` | `research`, `code`, `social`, `news`, `education`, `general` |
| `url` | `TEXT NOT NULL` | Base URL, API endpoint, channel ID, or search query |
| `fetcher_key` | `TEXT NOT NULL` | Maps to registry in `index.ts`: `"arxiv"`, `"github-trending"` |
| `is_active` | `BOOLEAN DEFAULT true` | Inactive sources are skipped by cron |
| `last_fetched` | `TIMESTAMPTZ` | Updated after each successful fetch |
| `rating` | `NUMERIC(2,1) DEFAULT 3.0` | 1.0–5.0, for source quality ranking |
| `fetch_interval_minutes` | `INTEGER DEFAULT 60` | How often to fetch |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

### `topics`
Content grouping/clustering.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `SERIAL PK` | |
| `name` | `TEXT NOT NULL UNIQUE` | Display name: `"RAG"`, `"Claude Code"` |
| `slug` | `TEXT NOT NULL UNIQUE` | URL slug: `"rag"`, `"claude-code"` |
| `category` | `TEXT NOT NULL DEFAULT 'general'` | `Technique`, `Tool`, `Company`, `Model Release`, `Cloud`, `Education`, `News`, `Analysis` |
| `category_color` | `TEXT DEFAULT '#888888'` | Hex color for badge |
| `description` | `TEXT` | Short description |
| `first_seen` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `last_updated` | `TIMESTAMPTZ DEFAULT NOW()` | |

### `items`
The actual aggregated content.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `SERIAL PK` | |
| `source_id` | `INTEGER FK → sources` | `ON DELETE SET NULL` |
| `topic_id` | `INTEGER FK → topics` | `ON DELETE SET NULL`, set by LLM classifier |
| `title` | `TEXT NOT NULL` | |
| `description` | `TEXT` | |
| `url` | `TEXT NOT NULL UNIQUE` | Dedup key |
| `type` | `TEXT NOT NULL DEFAULT 'news'` | `paper`, `repo`, `social`, `news`, `video`, `article` |
| `platform` | `TEXT NOT NULL` | |
| `tags` | `TEXT[] DEFAULT '{}'` | PostgreSQL text array |
| `score` | `NUMERIC(8,2) DEFAULT 0` | Computed hotness score |
| `is_bookmarked` | `BOOLEAN DEFAULT false` | |
| `published_at` | `TIMESTAMPTZ` | |
| `fetched_at` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `metadata` | `JSONB DEFAULT '{}'` | |
| `image_url` | `TEXT` | Added in migration 006 |
| `author` | `TEXT` | Added in migration 006 |
| `duration` | `TEXT` | Added in migration 006 |

### `knowledge_guides`
Curated educational content.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `SERIAL PK` | |
| `title` | `TEXT NOT NULL` | |
| `slug` | `TEXT NOT NULL UNIQUE` | URL slug |
| `category` | `TEXT NOT NULL` | `vscode`, `copilot`, `mcp`, `ai-tools`, `cloud` |
| `content` | `TEXT NOT NULL` | Markdown content (E-string escaped) |
| `icon` | `TEXT DEFAULT '📖'` | Emoji icon |
| `difficulty` | `TEXT DEFAULT 'beginner'` | `beginner`, `intermediate`, `advanced` |
| `tags` | `TEXT[] DEFAULT '{}'` | |
| `is_published` | `BOOLEAN DEFAULT true` | |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

### `settings`
User preferences (key-value store).

| Column | Type | Notes |
|--------|------|-------|
| `key` | `TEXT PK` | |
| `value` | `TEXT NOT NULL` | |

## Indexes

```sql
idx_items_topic       ON items(topic_id)
idx_items_source      ON items(source_id)
idx_items_type        ON items(type)
idx_items_platform    ON items(platform)
idx_items_published   ON items(published_at DESC)
idx_items_score       ON items(score DESC)
idx_items_fetched     ON items(fetched_at DESC)
idx_topics_slug       ON topics(slug)
```

## Existing Fetcher Keys

`arxiv`, `reddit`, `github-trending`, `hacker-news`, `huggingface`, `twitter`, `linkedin`, `rss`, `youtube`, `gnews`

## Existing Topic Categories & Colors

| Category | Color |
|----------|-------|
| Technique | `#2563EB` |
| Tool | `#007ACC`, `#6F42C1`, `#8957E5`, `#2EA44F` |
| Company | Various brand colors |
| Model Release | `#DC2626` |
| Cloud | `#0078D4`, `#FF9900`, `#4285F4` |
| Education | `#E97627` |
| News | `#0078D4`, `#FF6F00` |
| Analysis | `#DA3B01` |
