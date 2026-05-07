# Railway + Vercel + Neon Migration Plan

## DevPulse: Render → Railway (backend) + Vercel (frontend) + Neon (database)

### What changes

| Concern | Before | After |
|---|---|---|
| Backend host | Render Docker (Express serves frontend) | Railway — backend only |
| Frontend host | Bundled in Docker | Vercel CDN |
| Database | Render PostgreSQL | Neon (serverless PostgreSQL) |
| Dockerfile | `Dockerfile` (full stack) | `Dockerfile.railway` (backend only) |
| Frontend API URL | `/api` (same origin) | `VITE_API_URL=https://<railway-domain>` |
| CORS | Single `CORS_ORIGIN` | Comma-separated list (already updated) |

### 0. Neon — set up database

1. Go to https://neon.tech → New Project → create `ai-pulse` project
2. Copy the **pooled connection string** (port 5432 via pgBouncer) from the Neon dashboard
3. Run migrations in order against the Neon URL:
   ```bash
   psql "postgresql://...@...neon.tech/ai_pulse?sslmode=require" -f sql/001_schema.sql
   psql "postgresql://...@...neon.tech/ai_pulse?sslmode=require" -f sql/002_seed.sql
   psql "postgresql://...@...neon.tech/ai_pulse?sslmode=require" -f sql/003_new_topics_sources.sql
   psql "postgresql://...@...neon.tech/ai_pulse?sslmode=require" -f sql/004_interview_projects_github_fix.sql
   psql "postgresql://...@...neon.tech/ai_pulse?sslmode=require" -f sql/005_mistral_sources.sql
   psql "postgresql://...@...neon.tech/ai_pulse?sslmode=require" -f sql/006_portal_upgrade.sql
   psql "postgresql://...@...neon.tech/ai_pulse?sslmode=require" -f sql/007_empty_topics_sources.sql
   psql "postgresql://...@...neon.tech/ai_pulse?sslmode=require" -f sql/008_content_expansion.sql
   psql "postgresql://...@...neon.tech/ai_pulse?sslmode=require" -f sql/009_fix_broken_sources.sql
   psql "postgresql://...@...neon.tech/ai_pulse?sslmode=require" -f sql/010_users_library.sql
   psql "postgresql://...@...neon.tech/ai_pulse?sslmode=require" -f sql/011_email_subscribers.sql
   psql "postgresql://...@...neon.tech/ai_pulse?sslmode=require" -f sql/012_guides.sql
   ```
4. Verify: `psql "..." -c "SELECT count(*) FROM items;"`

### Code changes already applied
- `frontend/src/lib/api.ts` — BASE now reads `VITE_API_URL` env var (falls back to same-origin for local dev)
- `backend/src/server.ts` — CORS accepts comma-separated `CORS_ORIGIN`
- `Dockerfile.railway` — backend-only image (no frontend build)
- `railway.json` — Railway config pointing at `Dockerfile.railway`
- `vercel.json` — SPA rewrite rule, builds from `frontend/`

---

## Step-by-step: DevPulse

### 1. Railway — deploy backend

1. Go to https://railway.app → New Project → Deploy from GitHub repo
2. Select `ai-pulse` repo
3. Railway auto-detects `railway.json` → uses `Dockerfile.railway`
4. Set env vars in Railway dashboard:
   ```
   DATABASE_URL        = postgresql://...@...neon.tech/ai_pulse?sslmode=require
   JWT_SECRET          = <32-byte hex>
   ADMIN_EMAIL         = tatsat3mutee@gmail.com
   CRON_SECRET         = <32-byte hex>
   GROQ_API_KEY        = <key>
   CORS_ORIGIN         = https://devpulse.vercel.app,https://<your-custom-domain>
   PORT                = 3000
   ```
5. Note the Railway public domain: `https://devpulse-production.up.railway.app`

### 2. Vercel — deploy frontend

1. Go to https://vercel.com → New Project → Import `ai-pulse` repo
2. Vercel detects `vercel.json` → builds `frontend/` automatically
3. Set env var in Vercel dashboard:
   ```
   VITE_API_URL = https://devpulse-production.up.railway.app
   ```
4. Deploy. Note the Vercel domain: `https://devpulse.vercel.app`

### 3. Update Railway CORS_ORIGIN
After getting the Vercel domain, go back to Railway and update:
```
CORS_ORIGIN = https://devpulse.vercel.app
```

### 4. Update GitHub Actions secret
Change `DEVPULSE_API_URL` in GitHub repo secrets to the new Railway URL.

### 5. Custom domain (optional)
- Point `devpulse.tatsatpandey.dev` → Vercel (CNAME to `cname.vercel-dns.com`)
- Point `api.devpulse.tatsatpandey.dev` → Railway (under Settings → Networking)
- Update `VITE_API_URL` and `CORS_ORIGIN` accordingly

---

## Step-by-step: Fincura

Fincura has extra OAuth considerations.

### 1. Railway — deploy Python backend

1. New project → import Fincura repo
2. Create `railway.json` in Fincura repo:
   ```json
   {
     "build": { "builder": "NIXPACKS" },
     "deploy": {
       "startCommand": "gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app",
       "healthcheckPath": "/health"
     }
   }
   ```
3. Set env vars — same as Render, but update:
   ```
   ALLOWED_ORIGINS   = https://fincura.vercel.app
   GOOGLE_REDIRECT_URI = https://fincura-api.up.railway.app/auth/google/callback
   FRONTEND_URL      = https://fincura.vercel.app
   ```

### 2. Update Google OAuth
Go to https://console.cloud.google.com → APIs & Services → Credentials → your OAuth client:
- Add to **Authorized redirect URIs**: `https://fincura-api.up.railway.app/auth/google/callback`
- You can remove the old `fincura-api.onrender.com` URI after confirming the new one works

### 3. Vercel — deploy frontend
Fincura's `VITE_API_URL` is already in its render.yaml — just point it at the new Railway URL.

### 4. Remove old Render services
After smoke-testing both apps on Railway+Vercel, suspend/delete Render services to stop billing.

---

## Local dev (unchanged)

```bash
# backend
cd backend && bun run dev          # localhost:3000

# frontend
cd frontend && bun run dev         # localhost:5173, proxies /api → 3000
# VITE_API_URL is empty in dev — proxy handles it
```

The Vite dev proxy in `vite.config.ts` still works because `VITE_API_URL` defaults to `""`, making requests go to `/api` on the same origin, which Vite proxies to port 3000.

---

## Cost summary

| Service | Plan | Cost |
|---|---|---|
| Railway (DevPulse + Fincura + future) | Hobby | $5/mo shared credit |
| Vercel (all frontends) | Free | $0 |
| Neon Postgres | Free tier | $0 |
| **Total** | | **$5/mo** |

vs. current Render: ~$14/mo (two starter web services)
