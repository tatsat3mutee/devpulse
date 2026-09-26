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

- `scripts/lib/collect.ts`: sources (HN top+best, Lobsters, GitHub new repos, HF papers, blog RSS), dedupe, excerpt fetching
- `scripts/lib/score.ts`: batched model judging (score, topic, headline, whyRead) and balanced selection
- `scripts/lib/net.ts`: SSRF-safe fetch, bounded reads, text helpers
- `src/lib/digest.ts`: Zod schema and topics; digests live in `data/digests/`
- Daily GitHub Action commits the digest and pushes the built site to the `site` branch; EC2 pulls it via a systemd timer and `deploy/ec2/release.sh`

No database or application server.

## Invariants

- Links and titles come from sources, never from the model. The model only writes headline, whyRead, score and topic, and model text containing URLs is dropped.
- Source text is untrusted input to the model.
- `release.sh` only ever edits the DevPulse Caddy block; other sites on the host must be preserved byte-for-byte.
