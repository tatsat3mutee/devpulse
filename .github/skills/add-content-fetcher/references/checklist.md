# Add Content Fetcher — Checklist

## Fetcher File (`backend/src/fetchers/{name}.ts`)

- [ ] Exports a named function matching `FetcherFn` signature: `(sourceUrl: string) => Promise<FetchResult[]>`
- [ ] Imports `FetchResult` from `"./types.js"` (note `.js` extension for ESM)
- [ ] Sets `User-Agent: ai-pulse/1.0` header on outbound requests
- [ ] Throws on non-OK HTTP responses with the status code in the message
- [ ] Applies a 7-day recency gate (`pubDate < weekAgo`) to skip stale items
- [ ] Truncates `description` to 500 characters
- [ ] Returns a valid `type` value: `"paper"` | `"repo"` | `"social"` | `"news"` | `"video"` | `"article"`
- [ ] `platform` string matches what will appear in the frontend `PLATFORMS` array
- [ ] `url` field is an absolute URL (used as dedup key)
- [ ] `tags` is always an array (empty `[]` if none available)
- [ ] `publishedAt` is a valid `Date` object
- [ ] Stores platform-specific data in `metadata` (optional)

## Registry (`backend/src/fetchers/index.ts`)

- [ ] Import added at the top of the file
- [ ] Entry added to `registry` object with a unique `fetcher_key`
- [ ] Key uses kebab-case: `"my-platform"`

## SQL Migration (`sql/NNN_*.sql`)

- [ ] File is numbered sequentially (check highest existing number)
- [ ] Uses `INSERT INTO sources ... ON CONFLICT DO NOTHING`
- [ ] `fetcher_key` matches the registry key exactly
- [ ] `category` is one of: `research`, `code`, `social`, `news`, `education`, `general`
- [ ] `platform` matches the `FetchResult.platform` value
- [ ] `url` contains the base URL or parameter the fetcher expects as `sourceUrl`

## Frontend (`frontend/src/pages/FeedPage.tsx`)

- [ ] New platform name added to `PLATFORMS` array
- [ ] String matches the `platform` field from the fetcher exactly (case-sensitive)

## Testing

- [ ] Fetcher can be tested via `POST /api/fetch/{fetcher_key}`
- [ ] Items appear in the feed after fetch
- [ ] No duplicate items on re-fetch (URL dedup works)
