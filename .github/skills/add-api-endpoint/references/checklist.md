# Add API Endpoint — Checklist

## Backend Router (`backend/src/routes/{resource}.ts`)

- [ ] Uses `Router()` from Express
- [ ] Exports `default router`
- [ ] All SQL queries use parameterized placeholders (`$1`, `$2`, ...) — no string interpolation
- [ ] `paramIdx` counter increments correctly for each filter
- [ ] `limit` capped at 200: `Math.min(Number(limit) || 50, 200)`
- [ ] `offset` defaults to 0: `Number(offset) || 0`
- [ ] Error responses use `res.status(code).json({ error: "..." })`
- [ ] Errors are logged with `console.error("Error doing X:", err)`
- [ ] Single-item endpoints return 404 when not found
- [ ] All route handlers are wrapped in try/catch

## Server Registration (`backend/src/server.ts`)

- [ ] Router imported with `.js` extension: `import newRouter from "./routes/new-resource.js"`
- [ ] Mounted with `app.use("/api/resource-name", newRouter)`
- [ ] Placed before the static file serving / catch-all route
- [ ] Path uses kebab-case

## Frontend API (`frontend/src/lib/api.ts`)

- [ ] TypeScript interface added for the response type (if new shape)
- [ ] Method added to the `api` object
- [ ] Uses `request<T>()` helper (not raw fetch)
- [ ] Query params built with `new URLSearchParams(params).toString()`
- [ ] Path matches the backend mount path exactly

## Security

- [ ] No user input interpolated into SQL strings
- [ ] Numeric inputs cast with `Number()` before use
- [ ] ILIKE patterns use parameterized `$N` (not template literals)
- [ ] No secrets or credentials in response bodies
