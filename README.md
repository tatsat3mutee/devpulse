# DevPulse

**The engineering stories worth your time, every day.** https://devpulse.tatsatpandey.com

Every morning DevPulse collects about 250 fresh candidates. Sources: the Hacker News front page and best list, Lobsters, fast-rising new GitHub repositories, Hugging Face daily papers, and about 18 engineering blogs. A model scores each candidate on whether a senior engineer would want to read it. For each story it writes a plain headline and one reason to read it, using only that source's own text. The best 50 are published, grouped by topic, with limits so no single topic dominates.

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

`/` (today), `/topic/<slug>`, `/edition/YYYY-MM-DD`, `/archive`, `/rss.xml`, `/json`, `/latest.json`, `/digest/YYYY-MM-DD.md`, `/llms.txt`.
