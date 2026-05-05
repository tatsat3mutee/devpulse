# API Patterns Reference

## Backend Architecture

- **Runtime**: Express on Bun
- **Database**: PostgreSQL 16 via `pg` pool (`backend/src/db.ts`)
- **Route files**: `backend/src/routes/{resource}.ts`
- **Registration**: `backend/src/server.ts` with `app.use("/api/{resource}", router)`

## Existing Endpoints

| Method | Path | Router File | Description |
|--------|------|-------------|-------------|
| GET | `/api/items` | `routes/items.ts` | List items with filters & pagination |
| GET | `/api/items/:id` | `routes/items.ts` | Single item |
| PATCH | `/api/items/:id/bookmark` | `routes/items.ts` | Toggle bookmark |
| GET | `/api/topics` | `routes/topics.ts` | List topics with item counts |
| GET | `/api/topics/:slug` | `routes/topics.ts` | Topic detail with items |
| GET | `/api/sources` | `routes/sources.ts` | List sources |
| PATCH | `/api/sources/:id` | `routes/sources.ts` | Toggle active |
| POST | `/api/fetch` | `routes/fetch.ts` | Trigger all fetchers |
| POST | `/api/fetch/:key` | `routes/fetch.ts` | Trigger single fetcher |
| GET | `/api/knowledge` | `routes/knowledge.ts` | List published guides |
| GET | `/api/knowledge/:slug` | `routes/knowledge.ts` | Single guide with content |
| GET | `/api/health` | `server.ts` (inline) | Health check |

## Query Builder Pattern

The standard pattern for filterable list endpoints (from `routes/items.ts`):

```typescript
const conditions: string[] = [];
const params: unknown[] = [];
let paramIdx = 1;

if (filterValue) {
  conditions.push(`t.column = $${paramIdx++}`);
  params.push(filterValue);
}

if (search) {
  conditions.push(`(t.title ILIKE $${paramIdx} OR t.description ILIKE $${paramIdx})`);
  params.push(`%${search}%`);
  paramIdx++;
}

const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
const lim = Math.min(Number(limit) || 50, 200);
const off = Number(offset) || 0;
```

Key rules:
- Always use parameterized queries (`$1`, `$2`, ...) — **never** interpolate user input into SQL
- `limit` is capped at `200`
- `offset` defaults to `0`
- `paramIdx` increments for each added parameter

## Frontend API Client Pattern

Source: `frontend/src/lib/api.ts`

The `request<T>()` helper:
```typescript
async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}
```

Adding a new method to the `api` object:
```typescript
export const api = {
  // GET with query params:
  getResources(params?: Record<string, string>) {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<Resource[]>(`/resources${qs}`);
  },

  // GET single:
  getResource(id: number) {
    return request<Resource>(`/resources/${id}`);
  },

  // POST:
  createResource(data: Partial<Resource>) {
    return request<Resource>("/resources", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // PATCH:
  updateResource(id: number, data: Partial<Resource>) {
    return request<Resource>(`/resources/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};
```

## Response Shapes

**Paginated list:**
```json
{
  "items": [...],
  "total": 142,
  "limit": 50,
  "offset": 0
}
```

**Single resource:**
```json
{ "id": 1, "name": "...", ... }
```

**Error:**
```json
{ "error": "Failed to fetch items" }
```

**Fetch stats:**
```json
{
  "sourcesProcessed": 12,
  "itemsFetched": 87,
  "itemsInserted": 23,
  "errors": []
}
```
