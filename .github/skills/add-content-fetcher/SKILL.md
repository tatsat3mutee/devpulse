---
name: add-content-fetcher
description: 'Scaffold a new content fetcher for DevPulse. Creates a FetcherFn in backend/src/fetchers/, registers it in index.ts, generates an SQL migration for sources, and updates frontend platform filters. Use when: adding a new data source, creating a fetcher, integrating a new API, adding a new platform.'
---

# Add Content Fetcher

Scaffold a complete content fetcher that pulls data from a new external API and integrates it into the DevPulse pipeline.

## When to Use This Skill

- Adding a new content source (e.g. Stack Overflow, Dev.to, Product Hunt)
- Integrating a new external API as a fetcher
- Creating a new `fetcher_key` for the sources table

## Quick Start

1. Create the fetcher file in `backend/src/fetchers/{name}.ts`
2. Register in `backend/src/fetchers/index.ts`
3. Add source rows via SQL migration in `sql/`
4. Update frontend platform filter in `frontend/src/pages/FeedPage.tsx`

## Step-by-Step Procedure

### Step 1 — Create the Fetcher File

Use the [fetcher skeleton template](./templates/fetcher-skeleton.ts) as a starting point.

The function must:
- Accept `sourceUrl: string` parameter (the `url` column from the `sources` table)
- Return `Promise<FetchResult[]>`
- Set a `User-Agent: ai-pulse/1.0` header on outbound requests
- Apply a recency gate (typically 7 days) to filter stale content
- Map all results to the `FetchResult` interface

```typescript
export async function fetchNewPlatform(sourceUrl: string): Promise<FetchResult[]> { ... }
```

### Step 2 — Register in the Fetcher Index

Open `backend/src/fetchers/index.ts` and:

1. Add the import at the top:
   ```typescript
   import { fetchNewPlatform } from "./new-platform.js";
   ```
2. Add the registry entry inside the `registry` object:
   ```typescript
   "new-platform": fetchNewPlatform,
   ```

The registry key must match the `fetcher_key` value in the `sources` table.

### Step 3 — Create SQL Migration

Create `sql/NNN_add_{platform}_source.sql` where NNN is the next number in sequence.

```sql
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('Source Display Name', 'PlatformName', 'category', 'https://api.example.com/endpoint', 'new-platform', true)
ON CONFLICT DO NOTHING;
```

Valid categories: `research`, `code`, `social`, `news`, `education`, `general`.

### Step 4 — Update Frontend Filters

In `frontend/src/pages/FeedPage.tsx`, add the new platform name to the `PLATFORMS` array:
```typescript
const PLATFORMS = ["", "arXiv", ..., "NewPlatform"];
```

The string must exactly match the `platform` field returned by the fetcher.

## Key Interfaces

See [FetchResult interface reference](./references/fetch-result-interface.md) for the full type definition and field conventions.

## Existing Fetcher Registry Keys

`arxiv`, `reddit`, `github-trending`, `hacker-news`, `huggingface`, `twitter`, `linkedin`, `rss`, `youtube`, `gnews`

## Valid FetchResult.type Values

`"paper"` | `"repo"` | `"social"` | `"news"` | `"video"` | `"article"`

## Checklist

See [full checklist](./references/checklist.md) before submitting.

## Common Patterns

- **RSS-based sources**: If the platform has an RSS/Atom feed, consider using the existing `rss` fetcher_key with a new source row instead of writing a custom fetcher.
- **Pagination**: If the API paginates, fetch only the first page (25-50 items). The cron runs hourly.
- **Rate limiting**: Use `Bun.sleep()` or `setTimeout` between paginated calls if needed.
- **Error shape**: Throw `new Error(\`PlatformName API ${res.status}\`)` on non-OK responses.
- **Metadata**: Store platform-specific data (stars, upvotes, citations) in `metadata` as a plain object.
