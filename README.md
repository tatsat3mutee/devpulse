# DevPulse

**The engineering stories worth your time, every day.** https://devpulse.tatsatpandey.com

Every morning DevPulse collects a few hundred fresh candidates for engineers who build AI and large-scale systems. Sources: the Hacker News front page, best list and keyword searches, Lobsters, fast-rising new GitHub repositories, release notes from inference and agent frameworks, Hugging Face daily papers and trending models, and about 70 engineering and AI blogs. A model scores each candidate for quality (1–10) and for fit with the beat (0–3), and writes a plain headline and a reason to read it from that source's own text; picked stories also get a short What / How / Why-it-matters brief and, where the article describes one, an architecture diagram. Up to 50 are published, with most of the edition reserved for AI and systems, caps on general security and launches, and nothing already published in the last week.

## Run locally

```bash
bun install
bun run dev                    # http://localhost:4321
bun run digest --dry-run       # collect only, no model calls
bun run digest                 # collect, score, write data/digests/YYYY-MM-DD.json (needs OPENROUTER_API_KEY)
bun run digest --reselect      # re-run selection from saved judgements, no model calls
```

Copy [.env.example](.env.example) to `.env` for local keys. Never commit it.

## Validate

```bash
bun test ./tests
bun run build
bun run test:e2e
```

## How it ships

1. **[Daily digest](.github/workflows/daily-digest.yml)** runs at 07:00 IST. It builds the digest and commits it to `main`. Then it builds and verifies the site and force-pushes the static files to the `site` branch. Required: secret `OPENROUTER_API_KEY`. Optional: variable `EDITORIAL_MODEL` (default `openai/gpt-6-luna`).
2. **The existing EC2 instance pulls.** A systemd timer runs [deploy/ec2/pull-release.sh](deploy/ec2/pull-release.sh) every 15 minutes. When the `site` branch changes, it hands the build to [deploy/ec2/release.sh](deploy/ec2/release.sh). That script switches only the DevPulse Caddy site block, checks the live pages, and rolls back automatically on failure. No inbound SSH is needed.
3. **[CI](.github/workflows/ci.yml)** runs unit, build and browser tests on pull requests.

Install or update the puller on the server:

```bash
sudo install -d /opt/devpulse
sudo install -m 755 deploy/ec2/release.sh deploy/ec2/pull-release.sh /opt/devpulse/
sudo install -m 644 deploy/ec2/devpulse-pull.service deploy/ec2/devpulse-pull.timer /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now devpulse-pull.timer
```

## Outputs

`/` (today), `/topic/<slug>`, `/edition/YYYY-MM-DD`, `/week/` and `/week/YYYY-Www` (weekly editions, RSS at `/week/rss.xml`), `/radar` (trending models and repositories), `/papers` (papers explained), `/search` (every story, with topic and kind filters), `/pulse` (trends and source health), `/og/YYYY-MM-DD.png` (share card), `/archive`, `/rss.xml`, `/json`, `/latest.json`, `/digest/YYYY-MM-DD.md`, `/llms.txt`.

## Accounts, sync and discussion (optional)

Every reader feature (save, notes, follow topics, For you, export) works without an account and stays in the browser. Sign-in adds sync across devices; Giscus adds a discussion thread to each story page.

**1. Database.** Create a Neon Postgres database and copy its connection string. The API creates its own `dp_*` tables on start.

**2. OAuth apps.**
- Google Cloud Console → Credentials → OAuth client (Web). Authorized redirect URI: `https://api.devpulse.tatsatpandey.com/auth/google/callback`.
- GitHub → Settings → Developer settings → OAuth Apps. Callback URL: `https://api.devpulse.tatsatpandey.com/auth/github/callback`.

**3. Render.** New → Blueprint → this repository (`render.yaml`). It creates `devpulse-api` (Docker, `api/`) and `devpulse-site` (static, `site` branch). Fill in `DATABASE_URL`, `GOOGLE_CLIENT_ID/SECRET` and `GITHUB_CLIENT_ID/SECRET` on the API service.

**4. DNS.** Point `devpulse.tatsatpandey.com` and `api.devpulse.tatsatpandey.com` at the CNAMEs Render shows for each service.

**5. Site settings.** In GitHub → Settings → Secrets and variables → Actions → Variables, add `PUBLIC_API_URL=https://api.devpulse.tatsatpandey.com`. For discussion, enable Discussions on the repository, install the Giscus app, and add `PUBLIC_GISCUS_REPO`, `PUBLIC_GISCUS_REPO_ID`, `PUBLIC_GISCUS_CATEGORY` and `PUBLIC_GISCUS_CATEGORY_ID` from giscus.app. The next publish picks them up.

Run the API locally with `DATABASE_URL=… SITE_ORIGIN=http://localhost:4321 API_ORIGIN=http://localhost:3000 bun run api/src/main.ts`.

