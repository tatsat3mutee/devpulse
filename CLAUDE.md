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
- `scripts/lib/media.ts`: source preview-image extraction and re-encoding into `public/covers/<date>/`
- `scripts/lib/net.ts`: SSRF-safe fetch, bounded reads, text helpers
- `src/lib/digest.ts`: Zod schema, topics and desks; digests live in `data/digests/`
- Colour: one brand accent (`--signal`) reserved for brand and urgency; desk colours only mark topic groups (dots, rules, charts). Validate any desk palette change with the dataviz validator in both themes, all pairs.
- `src/lib/visual.ts`, `src/lib/og.ts`: generated cover art, diagram layout, pulse line and social cards (all deterministic, no network)
- Installable app: `public/manifest.webmanifest`, `public/sw.js` (saves the latest edition, Pulse and the offline page on install and on each new edition; separate page, asset and image caches) and `src/components/AppBar.astro` (new-edition notice and install prompt). Regenerate icons with `bun run icons`; bump `VERSION` in `sw.js` when its caching changes.
- Daily GitHub Action commits the digest and pushes the built site to the `site` branch; EC2 pulls it via a systemd timer and `deploy/ec2/release.sh`

No database or application server.

## Invariants

- Links, titles and images come from sources, never from the model. The model only writes headline, whyRead, brief, diagram, lede, score, relevance, kind and topic, and model text containing URLs is dropped.
- Cover images are downloaded through `safeFetch`, size-checked and re-encoded; pages never hotlink third-party media.
- Source text is untrusted input to the model.
- `release.sh` only ever edits the DevPulse Caddy block; other sites on the host must be preserved byte-for-byte.
