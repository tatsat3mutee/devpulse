# AI Pulse — Project Plan

> "Find the one thing worth reading today — and ignore everything else."

---

## What We're Building

A **mobile-first AI news aggregator** that pulls from 15+ sources (arXiv, GitHub Trending, Hacker News, Reddit, Hugging Face, etc.) into one clean feed. No noise — just signal.

**Reference**: The AI Pulse screenshots show exactly the UX we're targeting:
- Topics page (grouped cards with counts)
- Feed page (filterable, searchable, type/platform filters)
- Topic detail (drilldown into papers, repos, social posts)
- Sources page (status dashboard, historical backfill)

---

## Tech Stack

```
┌──────────────────────────┐     ┌──────────────────────────┐
│      FRONTEND            │     │      BACKEND             │
│  React 19 + Vite         │     │  Express + Bun           │
│  localhost:5173           │────▶│  localhost:3000           │
│                          │     │                          │
│  • Topics page           │     │  • GET /api/items        │
│  • Feed page             │     │  • GET /api/topics       │
│  • Topic detail          │     │  • POST /api/fetch       │
│  • Sources dashboard     │     │  • GET /api/sources      │
│  • Settings              │     │                          │
│                          │     │  pg (node-postgres)      │
│  Tailwind CSS            │     │  node-cron (scheduler)   │
│  shadcn/ui components    │     │  fetchers/ (one per src) │
│  react-router-dom        │     │                          │
└──────────────────────────┘     └──────────────────────────┘
                                         │
                                 ┌───────┴───────┐
                                 │  PostgreSQL   │
                                 │  (local or    │
                                 │  Neon.tech)   │
                                 │  pg_vector    │
                                 │  ready        │
                                 └───────────────┘
```

### Why This Stack?

| Choice | Why |
|--------|-----|
| **React + Vite** (not Next.js) | Clean separation — frontend is frontend, backend is backend. No "use client"/"use server" confusion. Vite gives instant hot reload. |
| **Express + Bun** | Express = most popular Node.js server (you already know it or will learn it once). Bun = 4x faster runtime, runs TypeScript directly, built-in .env support. |
| **PostgreSQL** (no ORM) | Industry-standard database. Raw SQL — you see exactly what runs. Free hosting on Neon.tech. pg_vector ready for semantic search later. |
| **pg (node-postgres)** | Direct SQL: `SELECT * FROM items WHERE topic_id = $1`. No abstraction layer, no generated code, no migration tool. |
| **Tailwind + shadcn/ui** | shadcn gives you copy-paste components (Cards, Tables, Badges, Dropdowns). Actual code in your project you own. |
| **react-router-dom** | Client-side routing. Simple: define routes, navigate between pages. |
| **node-cron** | Scheduled fetch jobs inside the Express server. Every 30 min: fetch → parse → dedupe → store. |

---

## Database Schema (4 Tables)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   sources    │     │    items     │     │   topics     │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │     │ id           │
│ name         │────▶│ sourceId     │     │ name         │
│ platform     │     │ topicId      │◀────│ category     │
│ category     │     │ title        │     │ description  │
│ url          │     │ description  │     │ itemCount    │
│ fetcherKey   │     │ url          │     │ firstSeen    │
│ isActive     │     │ type         │     │ lastUpdated  │
│ lastFetched  │     │ platform     │     └──────────────┘
│ rating       │     │ tags[]       │
│ fetchInterval│     │ score        │     ┌──────────────┐
└──────────────┘     │ publishedAt  │     │  settings    │
                     │ fetchedAt    │     ├──────────────┤
                     │ isBookmarked │     │ key          │
                     └──────────────┘     │ value        │
                                          └──────────────┘
```

### In Plain English:
- **sources** = "Where do we fetch from?" (arXiv, GitHub Trending, r/MachineLearning, etc.)
- **items** = "What did we find?" (a paper, a repo, a post, a news article)
- **topics** = "What group does it belong to?" (RAG, Claude Code, Agentic AI, etc.)
- **settings** = "User preferences" (digest name, theme, fetch frequency)

---

## Folder Structure

```
ai-pulse/
├── backend/                     ← Express + Bun
│   ├── src/
│   │   ├── server.ts            ← Express app entry point
│   │   ├── db.ts                ← pg connection pool
│   │   ├── cron.ts              ← Scheduled fetch jobs
│   │   ├── routes/
│   │   │   ├── items.ts         ← GET /api/items, GET /api/items/:id
│   │   │   ├── topics.ts        ← GET /api/topics, GET /api/topics/:slug
│   │   │   ├── sources.ts       ← GET /api/sources, PATCH, POST /api/sources/:id/fetch
│   │   │   └── fetch.ts         ← POST /api/fetch (trigger all fetchers)
│   │   ├── fetchers/
│   │   │   ├── arxiv.ts         ← Fetch arXiv papers via API
│   │   │   ├── github-trending.ts
│   │   │   ├── hacker-news.ts
│   │   │   ├── huggingface.ts
│   │   │   ├── reddit.ts
│   │   │   └── index.ts         ← Registry: maps fetcherKey → function
│   │   ├── scorer.ts            ← Compute hotness/relevance scores
│   │   └── topic-classifier.ts  ← Auto-assign topics to items
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                    ← React + Vite
│   ├── src/
│   │   ├── main.tsx             ← Entry point + React Router
│   │   ├── App.tsx              ← Layout (sidebar + content area)
│   │   ├── pages/
│   │   │   ├── TopicsPage.tsx   ← Topics grid (screenshot 1)
│   │   │   ├── TopicDetailPage.tsx ← Topic drilldown (screenshot 2)
│   │   │   ├── FeedPage.tsx     ← Feed list (screenshot 3)
│   │   │   ├── SourcesPage.tsx  ← Sources dashboard (screenshot 4)
│   │   │   └── SettingsPage.tsx ← Settings
│   │   ├── components/
│   │   │   ├── ui/              ← shadcn components (Button, Card, Badge, etc.)
│   │   │   ├── Sidebar.tsx      ← Left nav (Topics, Feed, Sources, Settings)
│   │   │   ├── TopicCard.tsx    ← Card for topics grid
│   │   │   ├── FeedItem.tsx     ← Row for feed list
│   │   │   ├── SourceRow.tsx    ← Row for sources table
│   │   │   ├── FilterBar.tsx    ← Type/Platform/Sort filters
│   │   │   └── SearchBar.tsx    ← Search input
│   │   ├── lib/
│   │   │   └── api.ts           ← fetch() wrapper for backend calls
│   │   └── index.css            ← Tailwind imports + custom tokens
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── sql/
│   ├── 001_schema.sql           ← CREATE TABLE statements
│   └── 002_seed.sql             ← Initial sources + topics data
│
├── CLAUDE.md                    ← AI coding instructions
└── PLAN.md                      ← This file
```

---

## The 4 Pages (Matching Screenshots)

### Page 1: Topics (`/topics`)
**What it shows**: Grid of topic cards — each card = a topic cluster
**Data**: `SELECT topics.*, COUNT(items.id) FROM topics LEFT JOIN items...`

```
┌─────────────────────────────────────────────┐
│  AI Digest (dropdown)          [Today|Week] │
│                                [Top|Recent] │
├─────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ │Technique│ │Model Rel│ │ Company │       │
│ │  RAG    │ │  Grok   │ │Mistral  │       │
│ │ 35 items│ │ 6 items │ │ 6 items │       │
│ └─────────┘ └─────────┘ └─────────┘       │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ │ Company │ │  Tool   │ │ General │       │
│ │ Alibaba │ │Cl. Code │ │Ag Skills│       │
│ │ 5 items │ │ 17 items│ │ 3 items │       │
│ └─────────┘ └─────────┘ └─────────┘       │
└─────────────────────────────────────────────┘
```

### Page 2: Topic Detail (`/topics/[slug]`)
**What it shows**: All items in one topic, grouped by type (Papers, Repos, Social, News)
**Data**: `SELECT * FROM items WHERE topicId = ? ORDER BY publishedAt DESC`

### Page 3: Feed (`/feed`)
**What it shows**: Chronological feed of all items, with filters
**Filters**: Type (Paper/Repo/Social/News), Platform, Search, Sort (Top/Recent/Oldest)
**Data**: `SELECT * FROM items WHERE type = ? AND platform = ? ORDER BY ...`

### Page 4: Sources (`/sources`)
**What it shows**: Admin table of all configured sources + status
**Columns**: Name, Platform, Category, Status, Last Fetched, Rating
**Actions**: Enable/disable, manual fetch, historical backfill

---

## Data Fetchers — How Each Source Works

Each fetcher is a simple async function that returns the same shape:

```typescript
// Every fetcher returns this:
interface FetchResult {
  title: string;
  description: string;
  url: string;           // Direct link to original content
  type: 'paper' | 'repo' | 'social' | 'news';
  platform: string;      // "arXiv", "GitHub", "Reddit", etc.
  tags: string[];        // ["cs.AI", "cs.CL"] or ["python", "llm"]
  publishedAt: Date;
  metadata?: Record<string, any>;  // Extra data (stars, citations, etc.)
}
```

### Phase 1 Fetchers (Free APIs, No Auth Required)

| Source | API | Rate Limit | Notes |
|--------|-----|-----------|-------|
| **arXiv** | `export.arxiv.org/api/query` | 3 req/sec | Search by category (cs.AI, cs.CL, etc.) |
| **GitHub Trending** | Scrape `github.com/trending` | Reasonable | No official API; use `github-trending-api` npm package |
| **Hacker News** | `hn.algolia.com/api/v1` | Generous | Search "AI", "LLM", "machine learning" |
| **Reddit** | `reddit.com/.json` | 60 req/min | Append `.json` to any subreddit URL. No auth needed for read. |
| **Hugging Face** | `huggingface.co/api` | Generous | Models, papers, trending spaces |
| **Papers with Code** | `paperswithcode.com/api/v1` | Generous | SOTA results, papers with repos |

### Phase 2 Fetchers (Need API Keys)

| Source | Auth | Notes |
|--------|------|-------|
| **GitHub Releases** | GitHub token (free) | Track specific repos for new releases |
| **Semantic Scholar** | API key (free) | Citation counts, related papers |
| **LinkedIn** | Complex (OAuth) | Defer to Phase 3 |
| **X/Twitter** | API paid | Defer or use RSS bridges |

---

## Scoring & Ranking

Simple hotness score (no ML needed):

```typescript
function computeScore(item: Item): number {
  const recencyScore = daysSince(item.publishedAt) < 1 ? 10 :
                       daysSince(item.publishedAt) < 3 ? 7 :
                       daysSince(item.publishedAt) < 7 ? 4 : 1;

  const engagementScore =
    (item.metadata?.stars ?? 0) * 0.5 +
    (item.metadata?.citations ?? 0) * 2 +
    (item.metadata?.comments ?? 0) * 0.3 +
    (item.metadata?.upvotes ?? 0) * 0.2;

  return recencyScore + Math.log2(engagementScore + 1);
}
```

---

## Topic Classification (Auto)

Simple keyword matching first (no AI needed):

```typescript
const TOPIC_RULES = {
  'RAG':          ['retrieval-augmented', 'rag', 'retrieval augmented', 'vector search'],
  'Claude Code':  ['claude code', 'anthropic cli', 'claude-code'],
  'Agentic AI':   ['agent', 'agentic', 'tool use', 'function calling'],
  'Mistral AI':   ['mistral', 'mixtral', 'pixtral'],
  'GPT':          ['gpt-5', 'gpt-4', 'openai', 'chatgpt'],
  // ... etc
};

function classifyTopic(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPIC_RULES)) {
    if (keywords.some(kw => text.includes(kw))) return topic;
  }
  return 'General';
}
```

---

## Build Phases

### Phase 1 — Core (Week 1-2) ✅ MVP
- [ ] Project setup (React+Vite frontend, Express+Bun backend)
- [ ] PostgreSQL schema + seed data (sources, initial topics)
- [ ] Backend API routes (items, topics, sources)
- [ ] 3 fetchers: arXiv, GitHub Trending, Hacker News
- [ ] Frontend: Sidebar + Topics page (grid of topic cards)
- [ ] Frontend: Feed page (filterable list)
- [ ] Frontend: Topic detail page (drilldown)
- [ ] Basic scoring + topic classification
- [ ] Mobile responsive

### Phase 2 — More Sources (Week 3)
- [ ] Reddit fetcher (5 subreddits)
- [ ] Hugging Face fetcher (models, papers, spaces)
- [ ] Papers with Code fetcher
- [ ] Sources dashboard page (status table)
- [ ] Manual fetch trigger button
- [ ] Search across all items

### Phase 3 — Polish (Week 4)
- [ ] Historical backfill feature
- [ ] Recompute scores button
- [ ] Bookmarking (save items)
- [ ] Settings page (digest name, theme, fetch frequency)
- [ ] Time filters (Today, This week, This month, All time)
- [ ] GitHub Actions for automated scheduled fetching
- [ ] Deploy (frontend: Vercel/Netlify, backend: Railway/Render, DB: Neon.tech)

### Phase 4 — Advanced (Later)
- [ ] pg_vector for semantic search
- [ ] Semantic Scholar + GitHub Releases fetchers
- [ ] Email/Slack digest
- [ ] AI summarization (optional)
- [ ] Personalized feed based on reading history

---

## Commands

```bash
# --- BACKEND ---
cd backend
bun install                      # Install dependencies (instant)
bun run src/server.ts            # Start Express server on :3000

# --- FRONTEND ---
cd frontend
bun install                      # Install dependencies
bun run dev                      # Start Vite dev server on :5173

# --- DATABASE ---
psql -U postgres -c "CREATE DATABASE ai_pulse;"   # Create database
psql -U postgres -d ai_pulse -f sql/001_schema.sql # Create tables
psql -U postgres -d ai_pulse -f sql/002_seed.sql   # Seed initial data

# --- FETCH DATA ---
curl -X POST http://localhost:3000/api/fetch       # Trigger all fetchers

# --- BOTH (dev mode) ---
# Terminal 1: cd backend && bun run src/server.ts
# Terminal 2: cd frontend && bun run dev
# Open http://localhost:5173
```

---

## Key Decisions Log

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Frontend | React + Vite (not Next.js) | Clear separation, no SSR complexity, instant HMR, deploy anywhere. |
| Backend | Express + Bun | Express = industry standard. Bun = fast runtime, runs TS directly, no compile step. |
| Database | PostgreSQL (not Supabase, not SQLite) | Industry standard, real SQL, pg_vector for later. Free on Neon.tech. |
| ORM | None (raw pg) | Direct SQL queries. No abstraction, no magic, full control. |
| Fetching | node-cron in Express | Scheduled jobs live in the same server process. Simple. |
| Auth | None (Phase 1) | Single-user tool. Add auth later if sharing. |
| Deployment | Frontend: any static host. Backend: any Node host | No vendor lock-in. Railway, Render, Fly.io, or VPS all work. |

---

## What Makes This "Best in Class"

1. **Clean architecture** — Frontend and backend are separate. You always know where code lives.
2. **No magic** — Raw SQL, plain React, simple Express routes. Every line is readable.
3. **Fast dev loop** — Vite instant HMR + Bun instant server restart = zero waiting.
4. **Real skills** — React, Express, PostgreSQL, SQL — these are industry fundamentals you'll use everywhere.
5. **Deploy anywhere** — No Vercel lock-in. Any static host + any Node host + any Postgres.
6. **Explainable** — You can explain every file in the project in one sentence.

---

*Ready to build. Start with `Phase 1` tasks.*
