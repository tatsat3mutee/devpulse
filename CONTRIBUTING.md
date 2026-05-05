# Contributing to DevPulse

Thanks for your interest. DevPulse is open source under MIT.

## Getting started locally

```bash
git clone https://github.com/tatsat3mutee/devpulse.git
cd devpulse

# Backend
cd backend && bun install
cp .env.example .env   # add DATABASE_URL and GROQ_API_KEY

# Frontend (new terminal)
cd frontend && bun install && bun run dev

# Seed DB
psql $DATABASE_URL -f sql/001_schema.sql
psql $DATABASE_URL -f sql/002_seed.sql
```

## Ways to contribute

- **New fetcher** — add a file in `backend/src/fetchers/` following the existing pattern, then register it in `fetchers/index.ts` and add a `sources` row
- **UI improvements** — frontend is React + Tailwind, components in `frontend/src/components/`
- **Bug reports** — open an issue with steps to reproduce
- **New AI topic** — extend `KEYWORD_MAP` in `backend/src/llm/topic-classifier.ts`

## Pull request checklist

- [ ] `bun run build` passes in `frontend/`
- [ ] No new `console.log` in production code
- [ ] New fetchers return the standard `FetcherFn` interface from `fetchers/types.ts`
- [ ] Tested locally with `bun run dev`

## Branch naming

- `feat/your-feature` for new features
- `fix/bug-name` for bug fixes
- `chore/task-name` for tooling / config

## Commit style

Use conventional commits:
- `feat:` new feature
- `fix:` bug fix
- `chore:` tooling, dependencies
- `docs:` documentation only
