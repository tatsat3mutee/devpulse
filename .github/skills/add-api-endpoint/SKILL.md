---
name: add-api-endpoint
description: 'Add an Express route and frontend api.ts method for DevPulse. Creates a router with parameterized queries, pagination, TypeScript interfaces, and the corresponding frontend API wrapper. Use when: adding a new API endpoint, creating a backend route, adding a REST endpoint, extending the API.'
---

# Add API Endpoint

Add a new Express route to the backend and a matching `api.ts` method on the frontend.

## When to Use This Skill

- Adding a new REST endpoint to the backend
- Creating a new data query route
- Extending the frontend API client
- Adding CRUD operations for a resource

## Quick Start

1. Create route file `backend/src/routes/{resource}.ts` (or extend an existing one)
2. Register the router in `backend/src/server.ts`
3. Add the API method in `frontend/src/lib/api.ts`
4. Add TypeScript interfaces if needed

## Step-by-Step Procedure

### Step 1 — Create the Router

Use the [router skeleton template](./templates/router-skeleton.ts).

Conventions:
- One file per resource in `backend/src/routes/`
- `Router()` from Express
- All queries use **parameterized placeholders** (`$1`, `$2`, ...) — never interpolate user input
- Incremental `paramIdx` counter for dynamic WHERE clauses
- Pagination via `limit` + `offset` query params, capped at 200

```typescript
import { Router, Request, Response } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  // ... parameterized query
});

export default router;
```

### Step 2 — Register in server.ts

In `backend/src/server.ts`:

1. Import the router:
   ```typescript
   import newRouter from "./routes/new-resource.js";
   ```

2. Mount it:
   ```typescript
   app.use("/api/new-resource", newRouter);
   ```

Place it **before** the static file serving and catch-all route.

### Step 3 — Add Frontend API Method

In `frontend/src/lib/api.ts`:

1. Add a TypeScript interface for the response shape (if new):
   ```typescript
   export interface NewResource {
     id: number;
     name: string;
     // ...
   }
   ```

2. Add the method to the `api` object:
   ```typescript
   getNewResources(params?: Record<string, string>) {
     const qs = params ? "?" + new URLSearchParams(params).toString() : "";
     return request<NewResource[]>(`/new-resource${qs}`);
   },
   ```

### Step 4 — Query Builder Pattern

For endpoints with optional filters, follow the existing pattern:

```typescript
const conditions: string[] = [];
const params: unknown[] = [];
let paramIdx = 1;

if (type) {
  conditions.push(`t.type = $${paramIdx++}`);
  params.push(type);
}

const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
const lim = Math.min(Number(limit) || 50, 200);
const off = Number(offset) || 0;
```

See [API patterns reference](./references/api-patterns.md) for the full query builder pattern and existing endpoints.

## Checklist

See [full checklist](./references/checklist.md).

## Common Patterns

- **GET list**: Return `{ items: T[], total: number, limit: number, offset: number }`
- **GET single**: Return the object directly, 404 if not found
- **POST create**: Return the created object
- **PATCH update**: Return the updated object
- **Error shape**: `res.status(500).json({ error: "Failed to ..." })`
- **Error logging**: `console.error("Error doing X:", err)`
