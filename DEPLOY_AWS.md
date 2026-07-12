# Deploying DevPulse on AWS

DevPulse runs as a **single Docker container** (the Bun backend serves the built
frontend from `frontend/dist`) against a **Neon Postgres** database. This guide
consolidates deployment onto **one** platform: a single **EC2** instance.

## Why EC2 (and not Lambda)

The backend runs an in-process scheduler (`node-cron`), in-memory rate limiters,
and a daily brief cache. These require a **long-running, single process** — which
is a poor fit for stateless Lambda (cron would need EventBridge, and the in-memory
state would not survive across invocations). A single small EC2 instance mirrors
the current setup, keeps cron correct, and is the most hands-on for learning.

Keep **Neon** as the database initially (it is reachable from anywhere and needs
no setup). You can migrate to RDS later if desired — only `DATABASE_URL` changes.

---

## 1. Launch the instance

- **AMI:** Ubuntu Server 24.04 LTS
- **Type:** `t3.small` (x86) or `t4g.small` (ARM, cheaper) — 2 GB RAM is plenty
- **Storage:** 20 GB gp3
- **Elastic IP:** allocate one and associate it (so the IP is stable for DNS)
- **Security group:**
  - `22/tcp` — SSH, from **your IP only**
  - `80/tcp` and `443/tcp` — from anywhere (`0.0.0.0/0`)

## 2. Install Docker

```bash
ssh ubuntu@<elastic-ip>
sudo apt-get update && sudo apt-get install -y docker.io git
sudo usermod -aG docker ubuntu   # then log out/in so the group applies
```

## 3. Get the code and configure env

```bash
git clone https://github.com/tatsat3mutee/devpulse.git
cd devpulse
nano backend/.env
```

`backend/.env` — required and optional variables:

```env
# Database (Neon)
DATABASE_URL=postgresql://user:pass@ep-xxx.aws.neon.tech/ai_pulse?sslmode=require

# Server
PORT=3000
JWT_SECRET=<long-random-string>
ADMIN_EMAIL=you@example.com
CRON_SECRET=<random-string>

# LLM — OpenRouter is the primary chat model; Groq is the fast fallback
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini   # optional; any OpenRouter model id
GROQ_API_KEY=
GEMINI_API_KEY=      # optional fallback
OPENAI_API_KEY=      # optional fallback

# OAuth login (optional — omit to disable Google/GitHub sign-in)
# IMPORTANT: update the authorized redirect URIs in both provider consoles to:
#   https://devpulse.tatsatpandey.com/api/auth/google/callback
#   https://devpulse.tatsatpandey.com/api/auth/github-oauth/callback
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Data retention (days). Items older than this are pruned nightly; saved items are kept.
RETENTION_DAYS=30

# Optional integrations / fetchers (fetchers without keys are skipped gracefully)
GITHUB_TOKEN=          # higher GitHub API rate limits
YOUTUBE_API_KEY=       # required for the Watch/videos fetcher
GNEWS_API_KEY=         # optional news fetcher
TWITTER_BEARER_TOKEN=  # optional X/Twitter fetcher
RESEND_API_KEY=        # email digests
RESEND_FROM=DevPulse <digest@yourdomain.com>   # optional sender override
APP_URL=https://devpulse.tatsatpandey.com
```

> `NODE_ENV=production` is set automatically by the Dockerfile — it enables
> secure cookies and the HSTS header. Do not unset it.

## 4. Build and run

```bash
docker build -t devpulse .
docker run -d --name devpulse \
  --env-file backend/.env \
  -p 3000:3000 \
  --restart unless-stopped \
  devpulse
```

Verify: `curl http://localhost:3000/api/health`

## 5. HTTPS with Caddy (auto TLS)

Run Caddy as a reverse proxy on 80/443 → 3000. It provisions and renews Let's
Encrypt certificates automatically.

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

`/etc/caddy/Caddyfile`:

```
devpulse.tatsatpandey.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl restart caddy
```

## 6. DNS

Point an **A record** for `devpulse.tatsatpandey.com` to the instance's Elastic IP.
Once DNS propagates, Caddy will issue the certificate and the site is live over HTTPS.

## 7. Database migrations

SQL migrations live in `sql/` and are applied manually in order. Install the
Postgres client first, then run them against Neon:

```bash
sudo apt-get install -y postgresql-client
export DATABASE_URL='postgresql://user:pass@ep-xxx.aws.neon.tech/ai_pulse?sslmode=require'
for f in sql/0*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

(Most table/column changes are also created idempotently on startup by the route
modules, but running the numbered files ensures seed data is present.)

## 8. Updating the app

```bash
cd devpulse && git pull
docker build -t devpulse .
docker rm -f devpulse
docker run -d --name devpulse --env-file backend/.env -p 3000:3000 --restart unless-stopped devpulse
```

---

## Notes

- **Single instance only.** The in-process cron assumes one running container.
  Do not scale horizontally without moving the scheduler to a dedicated worker.
- **Backups:** Neon provides point-in-time restore. If you migrate to RDS, enable
  automated snapshots.
- **Alternative:** AWS App Runner can run the same Docker image with less server
  management, but a single EC2 instance is recommended here for correct cron
  behaviour and hands-on learning.
