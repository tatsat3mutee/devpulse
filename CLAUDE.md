# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DevPulse (repo name: `ai-pulse`) is an **idea engine**, not an aggregator. It pulls from 10+ sources
(arXiv, GitHub Trending, Hacker News, Reddit, Hugging Face, RSS, etc.) as *raw material*, then
extracts **concepts** — single transferable technical mechanisms an experienced engineer could learn
and re-explain — and serves one deep concept plus a few one-liners, twice a week, per user.

The filter that kills the noise is not popularity: *"does this item contain a mechanism?"* Most items
fail it, and the high reject rate is the feature. Items still exist and are still scored, but the
`score` column no longer drives anything user-facing.

**Runtime:** Bun (runs TypeScript directly — no build step for backend dev)  
**Stack:** Bun + Express backend, React 19 + Vite frontend, PostgreSQL

## Commands

### Backend
```bash
cd backend
bun run dev          # Watch mode (uses --watch flag)
bun run start        # Production start
```

### Frontend
```bash
cd frontend
bun run dev          # Vite dev server on port 5173 (proxies /api → localhost:3000)
bun run build        # Production build to dist/
bun run preview      # Preview production build
```

### Full Stack (Docker)
```bash
docker build -t ai-pulse .
docker run -p 3000:3000 --env-file backend/.env ai-pulse
```

### Database Migrations
Migrations are plain SQL files in `sql/`, applied in order (001 → 021). `bun run migrate` runs
`backend/scripts/migrate.ts`; you can also apply them manually via `psql`.

⚠️ Some tables are still created lazily at module load inside route files (`user_seen_items` in
`routes/items.ts`, `user_topic_follows` / `user_source_mutes` in `routes/prefs.ts`). New tables
should go in a numbered migration instead.

### Seeding concepts
```bash
cd backend && bun run seed:concepts   # ~13 hand-written cold-start concepts
```
Required before the product has anything to serve — the extractor won't produce enough in week one.
These also act as the extractor's quality bar: if extracted concepts read noticeably worse than the
seeds, the prompt is wrong.

## Environment Setup

Backend requires `backend/.env`:
```
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/ai_pulse?sslmode=require  # Neon (or local: postgresql://postgres:postgres@localhost:5432/ai_pulse)
PORT=3000
OPENROUTER_API_KEY=   # LLM (tried first)
GROQ_API_KEY=         # LLM fallback
GEMINI_API_KEY=       # LLM fallback
OPENAI_API_KEY=       # LLM fallback
GITHUB_TOKEN=         # Optional, raises GitHub API rate limits
TWITTER_BEARER_TOKEN= # Optional
ARTIFICIAL_ANALYSIS_API_KEY= # Optional, powers /models benchmark leaderboard (free key from artificialanalysis.ai)
```

LLM keys are optional — the fetcher pipeline degrades gracefully (skips LLM classification/summarization, uses keyword fallback).

## Architecture

### Data Flow
1. **Fetch** — `cron.ts` runs on schedule (configurable via `settings` table). Each `source` row has a `fetcher_key` that maps to a fetcher function in `backend/src/fetchers/`.
2. **Score** — `scorer.ts` computes a hotness score from recency + platform engagement metrics.
3. **Classify** — `llm/topic-classifier.ts` assigns a `topic_id`: tries LLM batch classification (15 items), falls back to `KEYWORD_MAP` matching.
4. **Summarize** — `llm/summarizer.ts` generates short summaries if LLM available.
5. **Persist** — Items inserted with `ON CONFLICT (url) DO NOTHING` — URL is the dedup key.
6. **Extract** (nightly, 02:00 UTC) — `concepts/extract.ts` gates the last 48h of items, asks an LLM
   whether each contains a transferable mechanism, dedupes against the existing corpus, and scores
   survivors by **durability**.
7. **Serve** (07:00 UTC) — `concepts/serve.ts` builds each due user's edition; `llm/digest.ts` emails it.

### The concept pipeline (`backend/src/concepts/`)

| File | Role |
|---|---|
| `extract.ts` | Candidate gate (`rejectReason`), LLM extraction, Zod validation, dedupe, insert |
| `durability.ts` | The ranking function that **replaces** `scorer.ts` for this surface |
| `similarity.ts` | Jaccard title overlap, ported from `frontend/src/lib/cluster.ts` |
| `serve.ts` | Edition assembly, per-user ledger, coverage |
| `render.ts` | Email HTML from the same `Edition` object the web view consumes |
| `seed.ts` | Cold-start concepts (`bun run seed:concepts`) |

**Durability is not engagement.** `scorer.ts` computes `engagement*0.7 + recency*0.3`, and
`engagementScore` returns a flat `20` for every RSS/blog/YouTube item — so authoritative sources
can't differentiate and Reddit vote counts decide the order. `durability.ts` inverts this: mechanism
density, source authority, corroboration and novelty are the terms; recency is a **tiebreaker only**;
and an unanchored social spike is actively *penalised* (`spikeAndDiePenalty`). If you touch it, keep
the test asserting a spiked Reddit thread ranks below an anchored lab blog post — that inversion is
the reason the module exists.

**`concepts.why_it_matters` is `NOT NULL` on purpose.** If the model can't say why a mechanism
matters, there is no concept. The Zod schema in `extract.ts` enforces the same rule before insert.

**The candidate gate is tuned against measured data, not intuition.** `MIN_BODY = 250` exists
because the extractor only ever sees `title + description`: over a live 48h window GitHub
descriptions run a median of 83 chars (repo taglines) while arXiv/HuggingFace abstracts hit the
fetcher's 500-char cap. A durable anchor does **not** waive that floor — an authoritative URL
doesn't put a mechanism into text that hasn't got one. Together with the noise patterns and the
`MIN_UNANCHORED_AUTHORITY` rule this took the keep rate from 77% to ~30%. If you loosen it, re-run
the measurement rather than guessing.

### Delivery cadence
`users.serve_days` (Postgres DOW, default `{2,5}` = Tue/Fri), `serve_areas`, and `email_concepts`
drive `runServeJob()` and `sendEditionEmails()`. Exposed at `GET`/`PATCH
/api/concepts/prefs/delivery` and in the Settings page's Delivery card. Both endpoints reject an
empty day set or empty area set — that state would silently stop delivery forever.

### Benchmark history
`benchmark_snapshots` gets one row per model per day from `snapshotBenchmarks()`, which runs in the
02:00 cron slot alongside extraction. `/api/benchmarks/movement` diffs the earliest and latest
snapshot in a window and is surfaced on Coverage. It returns `has_history: false` until two distinct
days exist — "no history yet" and "nothing moved" are different answers and the UI says which.

### LLM Client (`backend/src/llm/client.ts`)
Single unified client with automatic failover: **OpenRouter → Groq → Gemini → OpenAI**. Each provider has its own rate limiter (token bucket) and daily quota tracker. Always use this client — don't instantiate provider SDKs directly.

### Chat retrieval
`routes/chat.ts` retrieves **concepts first** (by durability) and falls back to raw items only for
recency questions, labelling those explicitly as unvetted. It used to retrieve
`items ORDER BY score DESC`, which meant the assistant answered out of the same popularity ranking
the rest of the product abandoned.

### API Routing
All backend routes are mounted under `/api` in `server.ts`. In production, Express also serves the frontend `dist/` as static files, so the single server handles everything.

### Frontend API Layer
`frontend/src/lib/api.ts` contains all typed fetch calls. All new API calls should be added here. The Vite dev proxy (`/api` → `localhost:3000`) means no CORS issues during development.

### Adding a New Fetcher
1. Create `backend/src/fetchers/<name>.ts` exporting a `FetcherFn` (see `fetchers/types.ts`)
2. Register it in `fetchers/index.ts`
3. Add a row to the `sources` table with the matching `fetcher_key`

### Adding a New Topic
Topics are auto-created by the classifier. To add keyword-based matching, extend `KEYWORD_MAP` in `llm/topic-classifier.ts`.

⚠️ **A `KEYWORD_MAP` entry is dead unless a matching `topics` row exists** — `keywordClassify` checks
each slug against real topic rows and silently skips misses. Four entries were dead this way for
months (`context-engineering`, `agentic-patterns`, `ai-evals`, `vibe-coding`); `sql/020` seeds them.
Always pair a new keyword entry with a `topics` INSERT in the same migration.

Ordering in `KEYWORD_MAP` is priority — the *first* matching slug wins. The bare keyword `"agent"`
under `agentic-ai` sits above the enterprise block and swallows much of its traffic.

### Adding a Concept Area
Areas are a closed set, declared in `AREAS` in `backend/src/concepts/extract.ts` and mirrored in
`CONCEPT_AREAS` / `AREA_LABELS` in `frontend/src/lib/api.ts`. Adding one means editing both, plus
the `users.serve_areas` default. Keep the set small — narrow areas are how the noise stays dead.

## Design System

Tailwind is configured with custom semantic tokens in `tailwind.config.js`:
- **Colors:** `paper`, `surface`, `ink` (+ `.soft`, `.muted`, `.faint` variants), `line`, `accent`
- **Fonts:** Inter (sans), Instrument Serif (serif), JetBrains Mono (mono)
- **Dark mode:** class-based (`dark:` prefix). The `dark` class is toggled on `<html>` by `App.tsx`.

CSS variables are defined in `index.css` for both light and dark themes. Use the semantic tokens rather than raw Tailwind colors to stay consistent.

## Deployment

Deployed on Render via Docker (`render.yaml`). The Dockerfile is a multi-stage build:
1. Builds frontend (`bun run build`)
2. Installs backend production deps
3. Final image runs `bun run backend/src/server.ts` on port 3000

The backend serves the compiled frontend static files in production — no separate frontend service.
