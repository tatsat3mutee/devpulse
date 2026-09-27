# DevPulse

Static Astro site: a daily engineering digest of the ~50 stories worth a senior engineer's time.

## Commands

```bash
bun install
bun run dev
bun test ./tests
bun run build
bun run test:e2e
bun run digest            # needs OPENROUTER_API_KEY; --dry-run collects only; --reselect reuses saved judgements
```

## Architecture

- `scripts/lib/collect.ts`: sources (HN top+best and keyword search, Lobsters, GitHub new repos, AI framework release feeds, HF papers and trending models, blog RSS), dedupe, excerpt and preview-image fetching
- `scripts/lib/score.ts`: batched model judging (score, relevance, topic, headline, whyRead), mission-weighted selection (desk floors and caps in `SELECT_DEFAULTS`), then a write pass (brief, diagram) for picked stories and the day's lede ("Today in one minute", referring to picked stories by id only)
- `scripts/build-search.ts`: story search index (one Pagefind document per story, headline as h1, topic/kind/desk/month filters, date/score sorts); runs after `astro build`
- `src/lib/radar.ts`, `src/lib/weekly.ts`, `src/lib/editorial.ts`: AI Radar movement, the weekly roll-up, tool of the day and reading-time buckets (pure, unit-tested)
- `scripts/lib/media.ts`: source preview-image extraction and re-encoding into `public/covers/<date>/`
- `scripts/lib/net.ts`: SSRF-safe fetch, bounded reads, text helpers
- `src/lib/digest.ts`: Zod schema, topics and desks; digests live in `data/digests/`
- Colour: one brand accent (`--signal`) reserved for brand and urgency; desk colours only mark topic groups (dots, rules, charts). Validate any desk palette change with the dataviz validator in both themes, all pairs.
- `src/lib/visual.ts`, `src/lib/og.ts`: generated cover art, diagram layout, pulse line and social cards (all deterministic, no network)
- Installable app: `public/manifest.webmanifest`, `public/sw.js` (saves the latest edition, Pulse and the offline page on install and on each new edition; separate page, asset and image caches) and `src/components/AppBar.astro` (new-edition notice and install prompt). Regenerate icons with `bun run icons`; bump `VERSION` in `sw.js` when its caching changes.
- Reader library (`src/lib/library.ts` pure logic, `src/lib/library-client.ts` browser runtime, `src/components/Library.astro`, `src/pages/saved.astro`): save, private notes, follow topics, mute sites, For you, export/import. Local-first in `localStorage`; syncs when signed in.
- `api/`: optional account API (Bun, Neon Postgres via `postgres`, Google/GitHub OAuth, DB-backed sessions, last-write-wins `/sync`). Tested against real Postgres with PGlite in `tests/api.test.ts`. The site only talks to it when built with `PUBLIC_API_URL`.
- `src/pages/story/[slug].astro`: one page per story with brief, diagram, notes and a click-to-load Giscus thread (enabled by `PUBLIC_GISCUS_*`).
- Daily GitHub Action commits the digest and pushes the built site to the `site` branch; `publish.yml` does the same on every push to main. `render.yaml` serves `site` as a Render static site and runs the API; `deploy/ec2/` is the older EC2 path.

The site itself is static; accounts and sync are the only server-side part, and every reader feature works without them.

## Invariants

- Links, titles, images, bylines, code links and every AI Radar number come from sources, never from the model. The model only writes headline, whyRead, brief, diagram, lede, score, relevance, kind and topic, and model text containing URLs is dropped.
- Notes and library data are the reader's own: never sent anywhere except the reader's account API, never indexed, exportable and deletable. The API accepts state changes only from `SITE_ORIGIN`, stores only hashed session tokens, and links accounts only through verified emails.
- Cover images are downloaded through `safeFetch`, size-checked and re-encoded; pages never hotlink third-party media.
- Source text is untrusted input to the model.
- `release.sh` only ever edits the DevPulse Caddy block; other sites on the host must be preserved byte-for-byte.
