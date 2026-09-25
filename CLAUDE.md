# DevPulse Daily Verdict

DevPulse is a static, evidence-backed engineering newspaper. It is not an aggregator, dashboard, chat product or personalized feed.

## Commands

```bash
bun install
bun run dev
bun test ./tests
bun run build
bun run test:e2e
bun run edition:prepare
bun run edition:publish YYYY-MM-DD
```

## Architecture

- Astro static output from root `src/`
- Zod edition/story contract in `src/lib/schema.ts`
- Published editions in `data/editions/`
- Generated review drafts in `data/review/`
- Deterministic fetch, normalization, clustering, ranking and verification in `scripts/`
- GitHub Actions opens a draft-edition pull request; a human merge publishes it
- The existing EC2 instance serves `dist/` through Caddy after a reviewed manual release

No database or application server exists. Add neither without evidence that subscriptions or search require one.

## Editorial invariants

- One lead plus two to six supporting stories; never more than seven total
- Every story must have a primary source and at least one verbatim source quote
- Community posts are signals/counterpoints, not evidence unless the post itself is the event
- Model output is untrusted and cannot introduce URLs, facts, numbers or ranking decisions
- `verifyStory()` must pass before generated content reaches `data/review/`
- Published stories have `provenance.humanReviewed: true`
- Corrections are explicit fields, never silent rewrites

## Development guidance

Preserve the print-like editorial layout and semantic HTML. Avoid cards for every section, infinite feeds, account features and decorative dashboards. New code must keep the static build, RSS, JSON, Markdown and HTML surfaces derived from the same edition data.
