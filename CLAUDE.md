# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Pulse is a developer-focused content aggregator that pulls from 10+ sources (arXiv, GitHub Trending, Hacker News, Reddit, Hugging Face, YouTube, RSS, etc.), classifies items using LLM + keyword fallback, scores them by recency/engagement, and surfaces them through a React UI with a chat assistant.

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
Migrations are plain SQL files in `sql/`. Run them in order (001 → 008) against your PostgreSQL instance. No migration runner — apply manually via `psql` or a DB client.

## Environment Setup

Backend requires `backend/.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_pulse
PORT=3000
PERPLEXITY_API_KEY=   # Chat with web search + citations (sonar model, recommended)
GROQ_API_KEY=         # LLM fallback (primary)
GEMINI_API_KEY=       # LLM fallback
OPENAI_API_KEY=       # LLM fallback
GITHUB_TOKEN=         # Optional, raises GitHub API rate limits
TWITTER_BEARER_TOKEN= # Optional
```

LLM keys are optional — the fetcher pipeline degrades gracefully (skips LLM classification/summarization, uses keyword fallback).

## Architecture

### Data Flow
1. **Fetch** — `cron.ts` runs on schedule (configurable via `settings` table). Each `source` row has a `fetcher_key` that maps to a fetcher function in `backend/src/fetchers/`.
2. **Score** — `scorer.ts` computes a hotness score from recency + platform engagement metrics.
3. **Classify** — `llm/topic-classifier.ts` assigns a `topic_id`: tries LLM batch classification (15 items), falls back to `KEYWORD_MAP` matching.
4. **Summarize** — `llm/summarizer.ts` generates short summaries if LLM available.
5. **Persist** — Items inserted with `ON CONFLICT (url) DO NOTHING` — URL is the dedup key.

### LLM Client (`backend/src/llm/client.ts`)
Single unified client with automatic failover: **Groq → Gemini → OpenAI**. Each provider has its own rate limiter (token bucket) and daily quota tracker. Always use this client — don't instantiate provider SDKs directly.

### API Routing
All backend routes are mounted under `/api` in `server.ts`. In production, Express also serves the frontend `dist/` as static files, so the single server handles everything.

### Frontend API Layer
`frontend/src/lib/api.ts` contains all typed fetch calls. All new API calls should be added here. The Vite dev proxy (`/api` → `localhost:3000`) means no CORS issues during development.

### Adding a New Fetcher
1. Create `backend/src/fetchers/<name>.ts` exporting a `FetcherFn` (see `fetchers/types.ts`)
2. Register it in `fetchers/index.ts`
3. Add a row to the `sources` table with the matching `fetcher_key`

### Adding a New Topic
Topics are auto-created by the classifier. To add keyword-based matching, extend `KEYWORD_MAP` in `llm/topic-classifier.ts`. To pre-seed a topic, insert into the `topics` table via a new SQL migration.

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
