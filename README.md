# DevPulse

> One ranked feed of what actually matters in AI dev — no account needed.

**Live:** [devpulse-q71w.onrender.com](https://devpulse-q71w.onrender.com)

DevPulse pulls from arXiv, GitHub Trending, Hacker News, HuggingFace, Reddit, and more into a single ranked feed, clustered by topic. No newsletter. No algorithm. Just signal.

---

## What it covers

- **Papers** — arXiv cs.AI, cs.CL, cs.LG — daily
- **Repos** — GitHub Trending (AI category) — daily
- **Discussions** — Hacker News AI threads — every 2 hours
- **Models** — HuggingFace trending models and spaces — daily
- **Communities** — Reddit r/MachineLearning, r/LocalLLaMA — every 2 hours

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Express + Bun |
| Database | PostgreSQL |
| AI Briefing | Groq (llama-3.1-8b-instant) |
| Deploy | Docker on Render |

## Local development

```bash
# 1. Clone
git clone https://github.com/tatsat3mutee/devpulse.git
cd devpulse

# 2. Backend
cd backend
bun install
cp .env.example .env          # fill in DATABASE_URL, GROQ_API_KEY
bun run src/server.ts         # starts on :3000

# 3. Frontend (new terminal)
cd frontend
bun install
bun run dev                   # starts on :5173

# 4. Seed database (run in order)
psql $DATABASE_URL -f sql/001_schema.sql
psql $DATABASE_URL -f sql/002_seed.sql

# 5. Trigger first fetch
curl -X POST http://localhost:3000/api/fetch
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GROQ_API_KEY` | Yes | [Get free at console.groq.com](https://console.groq.com) |
| `GITHUB_TOKEN` | No | Raises GitHub API rate limits |
| `PORT` | No | Default 3000 |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT © 2026 Tatsat Pandey
