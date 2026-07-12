# DevPulse — Learning Guide

A walkthrough of **what we built and why**, written to teach the React frontend, the
Bun/Express backend, and the AI layer. Read it top to bottom, then open the referenced
files side by side.

---

## 1. The big picture

DevPulse is a **content aggregator**: it pulls AI/dev content from many sources, scores &
classifies it, stores it in Postgres, and shows it in a React UI with an AI chat.

```
Sources (arXiv, GitHub, HN, YouTube, RSS…) 
        │  fetchers (backend/src/fetchers/*)
        ▼
   cron.ts  ──►  score (scorer.ts)  ──►  classify + summarize (llm/*)  ──►  Postgres (items)
        │
        ▼
   Express API  (backend/src/routes/*)  ──►  React app (frontend/src/*)
```

**Two apps, one repo:**
- **Frontend** = React 19 + Vite + Tailwind (in `frontend/`). In dev it runs on port 5173.
- **Backend** = Bun + Express (in `backend/`) on port 3000. In production the backend also
  serves the built frontend, so one server does everything.

**Key idea:** the frontend never talks to the database. It calls the backend's `/api/*`
endpoints (via `frontend/src/lib/api.ts`), and the backend talks to Postgres.

---

## 2. React frontend — the concepts we used

React builds UIs out of **components** (functions that return JSX) and **hooks** (functions
that add state/behaviour). Here are the ones we used, with the features we built.

### 2.1 Components + props
A component is just a function. Props are its inputs.

```tsx
// frontend/src/components/VideoModal.tsx
interface Props { item: Item; onClose: () => void; }

export default function VideoModal({ item, onClose }: Props) { … }
```
`item` is the data to show; `onClose` is a **callback** the parent passes in so the child can
tell the parent "close me". This is the standard "data down, events up" pattern.

### 2.2 State — `useState`
State is data that, when it changes, re-renders the component.

```tsx
// frontend/src/components/FeedItem.tsx
const [shareOpen, setShareOpen] = useState(false);   // is the share menu open?
const [videoOpen, setVideoOpen] = useState(false);   // is the video modal open?
```
Clicking the share button calls `setShareOpen(o => !o)` which flips the boolean and
re-renders, showing/hiding the popover. That's the whole share-menu feature — no libraries.

### 2.3 Side effects — `useEffect`
`useEffect` runs code *after* render, e.g. fetching data or adding event listeners.

```tsx
// VideoModal.tsx — close on ESC, lock body scroll while open
useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
  window.addEventListener("keydown", onKey);
  document.body.style.overflow = "hidden";
  return () => {                          // cleanup runs when the modal unmounts
    window.removeEventListener("keydown", onKey);
    document.body.style.overflow = "";
  };
}, [onClose]);
```
The **returned function is cleanup** — React calls it to undo the effect. The `[onClose]`
array is the **dependency list**: the effect re-runs only if those values change.

### 2.4 Fetching data with effects
`EventsPage` fetches events whenever the filters change:

```tsx
// frontend/src/pages/EventsPage.tsx
useEffect(() => {
  setLoading(true);
  api.getEvents({ country: country || undefined, online: includeOnline })
    .then(res => setData({ events: res.events, countries: res.countries }))
    .catch(() => setError("Couldn't load events right now."))
    .finally(() => setLoading(false));
}, [country, includeOnline]);   // re-fetch when the country or toggle changes
```
Notice the three UI states: **loading / error / data**. Handling all three is a core habit.

### 2.5 Derived data — `useMemo`
`useMemo` caches a computed value so it only recalculates when inputs change. We used it to
filter events by city without re-fetching:

```tsx
const events = useMemo(() => {
  const q = cityQuery.trim().toLowerCase();
  if (!q) return data.events;
  return data.events.filter(e => (e.city || "").toLowerCase().includes(q));
}, [data.events, cityQuery]);
```

### 2.6 Persisting user choices — `localStorage`
For things that don't need an account (role, brief language, event country) we store the
choice in the browser:

```tsx
const [country, setCountry] = useState(() => localStorage.getItem("devpulse:eventCountry") || "");
const handleCountry = (c: string) => { localStorage.setItem("devpulse:eventCountry", c); setCountry(c); };
```
This is why bookmarks work **without logging in** — see `frontend/src/lib/localBookmarks.ts`.

### 2.7 Global state — Context
`AuthContext` (`frontend/src/context/AuthContext.tsx`) holds the logged-in user and shares it
with every component via `useAuth()`, instead of passing props down many levels.

```tsx
const { user, isSaved, saveItem, unsaveItem } = useAuth();
```

### 2.8 Routing + navigation
`react-router-dom` maps URLs to pages in `frontend/src/App.tsx`:

```tsx
<Route path="/events" element={<EventsPage />} />
<Route path="/learn" element={<Navigate to="/knowledge" replace />} />  // redirect old link
```
The sidebar items come from the `navItems` array — add one line there + one `<Route>` and a
new page exists. That's how we added **Events**.

### 2.9 Styling — Tailwind + design tokens
Classes like `bg-surface`, `text-ink`, `border-line` are **semantic tokens** defined in
`tailwind.config.js` / `index.css`, so light/dark mode "just works". The two-column hero we
built uses CSS grid:

```tsx
<div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 lg:gap-10 items-start"> … </div>
```
`lg:` means "only at large screens" — below that it stacks to one column (responsive design).

---

## 3. Backend — Bun + Express

Express is a tiny web framework. You create **routers** (groups of endpoints) and mount them
under a path in `backend/src/server.ts`:

```ts
app.use("/api/events", eventsRouter);   // every route in events.ts lives under /api/events
```

### 3.1 A REST endpoint (the Events feature)
`backend/src/routes/events.ts` shows the full shape of an endpoint we wrote:

```ts
router.get("/", async (req, res) => {
  const events = await loadEvents();                       // 1. get data
  const country = String(req.query.country || "").toLowerCase();  // 2. read query params
  let filtered = events;
  if (country) filtered = filtered.filter(e => (e.country||"").toLowerCase() === country);  // 3. filter
  res.json({ events: filtered.slice(0, 200), total: filtered.length, countries });          // 4. respond JSON
});
```
Concepts: `req.query` (URL `?country=India`), `res.json(...)` (send JSON), `async/await`.

### 3.2 Calling an external API + caching
The events come from the free **confs.tech** GitHub dataset. We fetch several JSON files and
**cache** the merged result for 6 hours so we don't hit GitHub on every request:

```ts
let cache: { at: number; events: ConfEvent[] } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000;

async function loadEvents() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.events;   // serve from cache
  // …fetch topic files, merge, dedupe by url, keep only upcoming, sort by date…
  cache = { at: Date.now(), events };
  return events;
}
```
**Why cache?** External calls are slow and rate-limited. Caching = fast + polite.

### 3.3 Talking to Postgres (parameterized queries)
Routes use a shared connection `pool` (`backend/src/db.ts`). Always pass values as
**parameters** (`$1`), never string-concatenate — that prevents SQL injection.

```ts
// backend/src/routes/chat.ts — pull feed items relevant to the user's question
await pool.query(
  `SELECT i.title, i.url FROM items i
    WHERE (i.title ILIKE ANY($1) OR i.description ILIKE ANY($1))
    ORDER BY i.score DESC LIMIT 8`,
  [patterns]                              // $1 is bound safely here
);
```

### 3.4 Scheduled jobs (the retention cleanup)
`backend/src/cron.ts` uses `node-cron` to run jobs on a schedule. We added a nightly cleanup
that deletes items older than 30 days **but keeps anything a user saved**:

```ts
await pool.query(
  `DELETE FROM items
    WHERE COALESCE(published_at, fetched_at) < NOW() - make_interval(days => $1::int)
      AND id NOT IN (SELECT item_id FROM user_saves)`,
  [RETENTION_DAYS]
);
```
We also run it ~30s after startup so it doesn't wait until 03:00 UTC. This is why the DB
dropped from ~12,700 to ~3,400 items.

### 3.5 Auth + account deletion
`backend/src/routes/auth.ts` uses a JWT stored in an httpOnly cookie. Account deletion is one
endpoint; the database does the rest via `ON DELETE CASCADE` foreign keys:

```ts
router.delete("/me", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM users WHERE id = $1", [req.userId]);  // cascades to saves, follows, etc.
  clearAuthCookie(res);
  res.json({ ok: true });
});
```
`requireAuth` is **middleware** — a function that runs before the handler to check the cookie.

---

## 4. The AI layer

### 4.1 One client, many providers (`backend/src/llm/client.ts`)
Instead of calling OpenAI/Groq SDKs everywhere, we have a single `askLLM(messages)` that
tries providers in order and **fails over** if one is rate-limited or down:

```
askLLM()  ──►  OpenRouter  ──►  Groq  ──►  Gemini  ──►  OpenAI
              (chat/reasoning)   (fast, free)  (fallbacks)
```
- Providers are only added if their API key exists (graceful degradation).
- Each has a **token-bucket rate limiter** (respect free-tier RPM) and a daily-quota block.
- We deliberately **skip OpenRouter for `fastModel` batch jobs** (classification/summaries) to
  keep those free on Groq — an important cost decision:

```ts
if (openrouter && !opts?.fastModel) providers.push({ name: "openrouter", … });
```

`messages` is the standard chat format everyone uses:
```ts
[{ role: "system", content: "You are DevPulse AI…" },
 { role: "user",   content: "What is RAG?" }]
```

### 4.2 RAG — grounding chat in our own feed (`backend/src/routes/chat.ts`)
**RAG = Retrieval-Augmented Generation.** Before answering, we *retrieve* relevant items from
our database and inject them into the system prompt, so the model can cite real DevPulse
content instead of hallucinating.

```ts
const { block, sources } = await getFeedContext(message);  // 1. retrieve matching items
const systemContent = block ? `${SYSTEM_PROMPT}\n\n${block}` : SYSTEM_PROMPT;  // 2. augment prompt
const result = await askLLM([{ role: "system", content: systemContent }, …]);  // 3. generate
res.json({ reply: result.text, citations: sources });      // 4. return answer + its sources
```
`getFeedContext` pulls keywords from the question, `ILIKE`-matches recent high-score items,
and formats them as a numbered list the model is told to cite as `[1]`, `[2]`.

### 4.3 LLM-generated content (the multilingual brief)
`backend/src/routes/brief.ts` groups today's top items by topic and asks the LLM to write a
short intro + one-line summaries. We made it multilingual by passing a language directive into
the prompt and caching per `date:lang`:

```ts
const langDirective = lang === "en" ? "" : ` Write the entire response in ${langName}.`;
// …prompt content ends with `${langDirective}`
```

---

## 5. Run / build / test

```bash
# Backend (watch mode, port 3000)
cd backend && bun run dev

# Frontend (dev server, port 5173, proxies /api → 3000)
cd frontend && bun run dev

# Production build of the frontend
cd frontend && bun run build      # outputs frontend/dist

# Type-check the backend without running it
cd backend && bunx tsc --noEmit
```
Quick API smoke tests (PowerShell):
```powershell
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod 'http://localhost:3000/api/events?country=India'
```

---

## 6. Concepts to study next (in priority order)

1. **React hooks** — `useState`, `useEffect` (deps + cleanup), `useMemo`, `useCallback`, and
   custom hooks (`useAuth`, `useRole`). This is 80% of day-to-day React.
2. **Lifting state up & Context** — when to pass props vs. use a provider.
3. **REST + async/await** — request/response, status codes, `fetch`, error handling.
4. **SQL basics** — `SELECT/WHERE/ORDER BY/LIMIT`, joins, indexes, and parameterized queries.
5. **Prompt design & RAG** — system vs user messages, grounding, citations, failover.
6. **Caching & rate limits** — why and where (external APIs, expensive computes).

Open these files in this order to reinforce it:
`frontend/src/pages/EventsPage.tsx` → `frontend/src/lib/api.ts` →
`backend/src/routes/events.ts` → `backend/src/routes/chat.ts` → `backend/src/llm/client.ts`.
