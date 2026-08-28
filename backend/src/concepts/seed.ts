import pool from "../db.js";
import { AREAS, type Area } from "./extract.js";

/**
 * Cold-start concepts.
 *
 * The extractor will not find two good concepts in its first week, and a
 * twice-weekly product with nothing to serve is dead on arrival. These are
 * hand-written from primary sources so the product is non-empty on day one.
 *
 * They also serve a second purpose: they are the quality bar. When tuning the
 * extraction prompt, compare its output against these — if extracted concepts
 * read noticeably worse, the prompt is wrong, not the UI.
 *
 * Run: bun run seed:concepts
 *
 * NOTE: figures below are taken from the linked primary sources. Re-verify
 * anything you intend to publish externally — vendor numbers move.
 */

interface SeedConcept {
  slug: string;
  title: string;
  hook: string;
  claim_number: string | null;
  mechanism: string;
  why_it_matters: string;
  transfer: string | null;
  area: Area;
  difficulty: "working" | "deep" | "frontier";
  durability: number;
  links: { label: string; url: string }[];
  requires?: string[];
}

const CONTEXT_ENGINEERING_URL =
  "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents";
const KV_SURVEY_URL = "https://github.com/jjiantong/Awesome-KV-Cache-Optimization";

const SEEDS: SeedConcept[] = [
  // ── inference-serving ──────────────────────────────────────────────
  {
    slug: "paged-attention",
    title: "Paged attention removes the KV cache's fragmentation tax",
    hook: "Serving systems used to waste most of their VRAM on empty space they had already reserved.",
    claim_number: "30–50% of VRAM reclaimed",
    mechanism: `A transformer's KV cache grows one token at a time, but nobody knows in advance how long a generation will run. The obvious implementation reserves a contiguous block sized for the *maximum* sequence length, then fills a fraction of it.

That produces two kinds of waste at once. **Internal fragmentation** is the unused tail of each reservation — a request that stops at 200 tokens still holds a 2,048-token block. **External fragmentation** is the unusable gaps between blocks, because a new contiguous reservation cannot fit into scattered free space.

Paged attention borrows the fix operating systems have used for decades: stop requiring contiguity. The cache is split into fixed-size blocks, and a per-sequence block table maps logical token positions to physical blocks wherever they happen to live. A sequence grows by claiming one more block, not by reserving for its worst case.

The payoff is not a faster kernel — it is that far more sequences fit in the same memory, so the batch gets bigger, and throughput follows batch size.`,
    why_it_matters: `This is the substrate every modern serving stack assumes, not an optimization you opt into. If you are sizing GPUs from a naive "context length × batch size × bytes per token" calculation, your number is wrong in both directions — the old way wasted far more than that, and paged attention uses far less. It also explains why throughput on a real server is so sensitive to the *distribution* of request lengths rather than the average.`,
    transfer: "Any system reserving variable-length buffers up front — connection pools, log segments, arena allocators — has the same fragmentation shape and the same fix.",
    area: "inference-serving",
    difficulty: "deep",
    durability: 88,
    links: [
      { label: "vLLM: Efficient Memory Management (PagedAttention)", url: "https://arxiv.org/abs/2309.06180" },
      { label: "System-aware KV cache optimization survey", url: KV_SURVEY_URL },
    ],
  },
  {
    slug: "prefix-caching",
    title: "Prefix caching is the highest-leverage change to your prompt layout",
    hook: "Your system prompt is recomputed from scratch on every single request unless you arrange for it not to be.",
    claim_number: "85–95% cost saving on a cache hit",
    mechanism: `Attention is causal: a token's key and value vectors depend only on the tokens *before* it. So if two requests share an identical opening span, the KV entries for that span are bit-identical — and computing them twice is pure waste.

Prefix caching stores those entries keyed by the hash of the token sequence that produced them. A later request with the same opening reads them instead of running prefill over them.

The catch is what "identical" means: it is a **prefix match on exact tokens**. One changed byte anywhere invalidates everything after it. A timestamp at the top of the system prompt, a user ID interpolated into the preamble, a tool list serialized in non-deterministic order — each one silently reduces a 95% saving to zero, with no error and no warning.

This is why the ordering rule is *stable content first, volatile content last*. It is not stylistic; it is the entire mechanism.`,
    why_it_matters: `It inverts the usual instinct about prompt design. The expensive thing is not a long prompt — it is a prompt whose beginning changes. An architect reviewing an LLM feature should be reading the prompt *assembly code*, looking for anything dynamic interpolated above the static bulk, because that single line can be the difference between a viable unit economic and an unviable one.`,
    transfer: "The same prefix-invalidation logic governs HTTP caching, CDN keys, Docker layer caching, and incremental build systems.",
    area: "inference-serving",
    difficulty: "working",
    durability: 92,
    links: [{ label: "System-aware KV cache optimization survey", url: KV_SURVEY_URL }],
  },
  {
    slug: "speculative-decoding",
    title: "A small draft model makes a large model faster without changing its output",
    hook: "You can get a speedup that is mathematically guaranteed not to change a single token of the result.",
    claim_number: "2–3× typical wall-clock speedup",
    mechanism: `Autoregressive generation is memory-bandwidth bound, not compute bound. Producing one token requires streaming the entire weight matrix through the memory hierarchy — and the GPU is mostly idle while that happens. Producing *five* tokens costs nearly the same bandwidth as producing one, if you could do them in a single pass.

Speculative decoding exploits that. A small, cheap draft model proposes the next k tokens. The large model then evaluates all k **in parallel**, in one forward pass, because verifying a known sequence is a batched operation rather than a sequential one.

The acceptance step is the elegant part. Each drafted token is accepted or rejected by comparing the two models' probability distributions with a rejection-sampling rule chosen so that the accepted output has *exactly* the distribution the large model would have produced alone. On rejection, the large model's own distribution supplies the corrected token and drafting restarts.

So the speedup is free in the strictest sense — it is not an approximation, and there is no quality knob to trade off.`,
    why_it_matters: `It reframes "the model is too slow" as a systems problem rather than a model-choice problem. Before accepting the latency of a large model, or downgrading to a weaker one to hit a latency target, the question to ask is whether the serving stack is doing speculative decoding at all — because the answer changes the tradeoff entirely.`,
    transfer: "Branch prediction, prefetching, and optimistic concurrency control are all the same pattern: guess ahead, verify cheaply, roll back on a miss.",
    area: "inference-serving",
    difficulty: "deep",
    durability: 84,
    links: [{ label: "System-aware KV cache optimization survey", url: KV_SURVEY_URL }],
    requires: ["paged-attention"],
  },
  {
    slug: "attention-sinks",
    title: "Language models need their first few tokens, even when the content is irrelevant",
    hook: "Drop the opening tokens from a sliding context window and quality collapses — not because they carried meaning.",
    claim_number: "4 tokens are usually enough",
    mechanism: `The obvious way to generate indefinitely under a fixed memory budget is a sliding window: keep the most recent N tokens of KV cache, evict the rest. In practice this fails badly and abruptly — perplexity explodes the moment the *earliest* tokens are evicted, even though the model can still see plenty of recent context.

The cause is softmax. Attention scores must sum to one, so every head is forced to distribute its weight somewhere on every step, even when nothing in the context is relevant. Models learn to dump this surplus attention onto the first few positions, which are visible from every later position. Those tokens function as a bias sink, not as content.

Evict them and the surplus attention has nowhere to go. It gets redistributed onto genuinely relevant tokens, distorting the very scores the model relies on.

The fix is almost trivially small: pin the first handful of tokens permanently, and slide the window over everything after them. That restores stable generation over inputs far longer than the training context.`,
    why_it_matters: `It is the clearest available reminder that these systems have load-bearing behaviour that nobody designed and that is invisible in the architecture diagram. It also has a direct operational reading: any context-management scheme you build — truncation, compaction, windowing — must preserve the head of the sequence, and "just keep the most recent N tokens" is a bug.`,
    transfer: "A general lesson about normalized systems: when a constraint forces mass to sum to a constant, something absorbs the remainder, and that absorber becomes structural.",
    area: "inference-serving",
    difficulty: "frontier",
    durability: 86,
    links: [{ label: "System-aware KV cache optimization survey", url: KV_SURVEY_URL }],
  },

  // ── agent-context ──────────────────────────────────────────────────
  {
    slug: "context-rot",
    title: "Context rot: recall degrades as the window fills, on every model",
    hook: "A million-token context window is not a million tokens of usable attention.",
    claim_number: null,
    mechanism: `Attention is pairwise. n tokens in context means n² relationships the model must resolve, against a set of attention parameters trained on far shorter sequences. The capacity to discriminate is finite and gets spread thinner as n grows.

The consequence is that retrieval accuracy declines with context length even when the target information is present and even well inside the advertised window. This is not a hard cutoff you can design around — it is a gradient, and it applies across models rather than being one vendor's weakness.

The practical framing is an **attention budget**: every token admitted to the context spends from a finite pool. A token that does not earn its place is not free, because it dilutes the ones that do.

That turns context assembly from a capacity question ("does it fit?") into an economic one ("is this the highest-value use of the budget?").`,
    why_it_matters: `It kills the most common architectural instinct in LLM systems — that a bigger context window means you can stop curating and just put everything in. The opposite discipline is required, and it becomes *more* important as windows grow, not less. Any design review of a RAG or agent system should ask what is being excluded, not just what is retrieved.`,
    transfer: "The same curve governs any attention-limited system: dashboards, alerting, code review scope, meeting agendas.",
    area: "agent-context",
    difficulty: "working",
    durability: 94,
    links: [{ label: "Effective context engineering for AI agents", url: CONTEXT_ENGINEERING_URL }],
  },
  {
    slug: "compaction",
    title: "Compaction trades fidelity for runway, and you choose what to lose",
    hook: "Every long-running agent eventually hits the window; the only question is what it forgets.",
    claim_number: null,
    mechanism: `An agent that runs long enough will exhaust its context. Compaction handles that by summarizing the conversation so far and reinitializing a fresh window from the summary plus the most recent turns.

The subtlety is that this is lossy by construction, and *what* it loses is a design decision rather than an implementation detail. Summarize aggressively and you keep runway but discard the specific detail — exact file paths, precise error strings, the reason a particular approach was already ruled out. Summarize conservatively and you buy less runway per compaction and hit the wall again sooner.

The failure mode this creates is distinctive and worth recognizing: an agent that re-attempts an approach it already tried and rejected, because the rejection was in the discarded detail while the goal survived in the summary.

The usual mitigation is to compact *selectively* — clear old tool results, which are bulky and rarely needed again, while preserving decisions and constraints verbatim.`,
    why_it_matters: `If you are building anything long-running on top of an LLM, compaction policy is a real architectural surface with real failure modes, not a library default to accept unexamined. "The agent went in circles" is very often a compaction bug.`,
    transfer: "Log compaction in Kafka, snapshotting in event-sourced systems, and generational GC all make the same keep-what-matters tradeoff.",
    area: "agent-context",
    difficulty: "deep",
    durability: 87,
    links: [{ label: "Effective context engineering for AI agents", url: CONTEXT_ENGINEERING_URL }],
    requires: ["context-rot"],
  },
  {
    slug: "structured-note-taking",
    title: "Writing notes outside the context window beats holding them inside it",
    hook: "The cheapest memory upgrade for an agent is a file.",
    claim_number: null,
    mechanism: `Context is the scarce resource; disk is not. An agent that persists its findings to a file — and re-reads that file when relevant — carries state across compaction boundaries and across sessions without paying for it in attention budget on every turn.

The mechanism matters more than it sounds. Information held in context is re-processed on *every* subsequent turn, competing with everything else for attention, and disappears the moment it is compacted away. Information written to a file costs tokens once at write time and once at read time, and survives indefinitely.

This inverts the naive design. The instinct is to keep important things in context so the model "remembers" them. The better pattern is to keep a lightweight pointer in context and the substance on disk, retrieving it when the task calls for it.

It also composes with compaction: notes written before a compaction survive it, so the summary does not have to carry everything.`,
    why_it_matters: `It is the smallest change with the largest effect on long-horizon agent reliability, and it requires no framework — a markdown file and an instruction to use it is the whole implementation. Any agent expected to work for more than a handful of turns should have one.`,
    transfer: "Same shape as swapping to disk, memoization to a cache, or writing down a decision instead of trying to hold a meeting's worth of context in your head.",
    area: "agent-context",
    difficulty: "working",
    durability: 90,
    links: [{ label: "Effective context engineering for AI agents", url: CONTEXT_ENGINEERING_URL }],
    requires: ["context-rot"],
  },
  {
    slug: "subagent-token-economics",
    title: "Sub-agents are a context-isolation technique, not a parallelism technique",
    hook: "The reason to delegate is not speed — it is that the delegate's reading never enters your window.",
    claim_number: "~1,000–2,000 token summaries returned",
    mechanism: `The usual justification for sub-agents is parallelism. The more important property is isolation.

A sub-agent explores with its own clean context window. It may read twenty files, run a dozen searches, and burn a large amount of context doing so — and none of that enters the coordinator's window. What comes back is a condensed report, typically a couple of thousand tokens.

So the coordinator's attention budget is spent on *conclusions* rather than on the search that produced them. A coordinator that did the same work inline would be carrying every intermediate tool result for the rest of the session.

This also explains when delegation is a bad trade. Each sub-agent must be briefed from scratch, because it shares no history, and it reports back through a lossy summary. For work you could finish in a few tool calls, the briefing and summarizing overhead exceeds the context you save. The technique pays off precisely when the sub-task is *reading-heavy* and its intermediate detail is disposable.`,
    why_it_matters: `It gives a concrete decision rule for a choice most agent architectures currently make on vibes. Delegate when the sub-task will generate a lot of context you will not need again; do it yourself when it won't. That rule also predicts the common failure — over-delegation of small tasks — better than "use sub-agents for parallel work" does.`,
    transfer: "Identical to why you'd shell out to a subprocess rather than link a library: isolation of state, at the cost of a serialization boundary.",
    area: "agent-context",
    difficulty: "deep",
    durability: 89,
    links: [{ label: "Effective context engineering for AI agents", url: CONTEXT_ENGINEERING_URL }],
    requires: ["context-rot"],
  },
  {
    slug: "just-in-time-retrieval",
    title: "Hold identifiers, not contents, and resolve them at the moment of use",
    hook: "Pre-loading everything the agent might need is the expensive way to be wrong.",
    claim_number: null,
    mechanism: `The pre-fetch model of RAG retrieves everything potentially relevant up front and stuffs it into the context. Under a finite attention budget, that spends the budget on a *guess* about relevance made before the model has begun reasoning.

Just-in-time retrieval keeps lightweight references in context instead — file paths, IDs, query handles — and loads the full content only when the agent actually reaches for it. The model's own reasoning becomes the relevance filter, which is a far better filter than a similarity score computed before the task was understood.

There is a second effect that is easy to miss: the identifiers themselves carry information. A file path encodes a hierarchy; a naming convention encodes intent. An agent can often decide what it needs from the names alone, without loading anything.

The tradeoff is round trips. Just-in-time costs an extra tool call at the moment of need, so it suits agentic loops where a tool call is cheap and mispriced context is expensive — and suits single-shot completions much less.`,
    why_it_matters: `It is the strongest available argument that classic pre-fetch RAG is the wrong default for agents specifically. If you are designing retrieval for an agentic system, the question is not "what should we embed" but "what identifiers can we put in context so the agent can fetch precisely what it needs."`,
    transfer: "Lazy loading, database cursors, and pointer-chasing versus eager joins — the same latency-for-precision trade.",
    area: "agent-context",
    difficulty: "deep",
    durability: 85,
    links: [{ label: "Effective context engineering for AI agents", url: CONTEXT_ENGINEERING_URL }],
    requires: ["context-rot"],
  },

  // ── evals-reliability ──────────────────────────────────────────────
  {
    slug: "llm-judge-drift",
    title: "An LLM judge scores position and length as much as it scores quality",
    hook: "Swap the order of two answers and the same judge often picks the other one.",
    claim_number: null,
    mechanism: `LLM-as-judge is the only practical way to evaluate open-ended output at volume, and it carries measurable biases that are easy to mistake for signal.

**Position bias**: given two candidates, judges systematically favour one slot. The diagnostic is cheap — run every comparison twice with the order swapped. Agreement between the two runs is your consistency rate; disagreement is noise you were previously reading as a result.

**Length bias**: longer answers score higher at equal quality. A change that only made outputs more verbose will look like a quality win.

**Self-preference**: judges favour text distributionally similar to their own output, which quietly corrupts comparisons between models.

The mitigations are unglamorous and effective: randomize order and average both directions, score against an explicit rubric with independent criteria rather than a holistic 1–10, and calibrate the judge against a few dozen human-labelled examples before trusting it — so you know its agreement rate rather than assuming it.`,
    why_it_matters: `Most teams building on LLMs have an eval suite, and a large fraction of those are reporting movement that is partly artifact. Before optimizing against a judge, you need to know its consistency rate — otherwise you are tuning against its biases, and the model that wins is the one that games them.`,
    transfer: "Every human-rating system has the same problem: anchoring, ordering effects, and rubric-free holistic scores.",
    area: "evals-reliability",
    difficulty: "working",
    durability: 88,
    links: [],
  },
  {
    slug: "indirect-prompt-injection",
    title: "The dangerous prompt injection is the one the user never typed",
    hook: "Your input validation is on the wrong channel.",
    claim_number: null,
    mechanism: `Direct prompt injection — a user typing "ignore your instructions" — is the version everyone defends against, and it is the less serious one.

Indirect injection arrives through content the system *retrieved*: a web page the agent fetched, a document in the vector store, a code comment in a repository, an issue title. The model has no channel-level way to distinguish instructions authored by the operator from instructions embedded in data it was asked to read. To a transformer it is all tokens in one sequence.

That means the trust boundary is not the user input field. It is every point where external content enters the context — and in an agentic system with search and fetch tools, that is a large and dynamic surface.

The mitigations are architectural rather than textual. Delimit untrusted content explicitly and instruct the model never to follow instructions found inside it. Then, critically, assume that instruction will sometimes fail and constrain what a compromised turn can *do*: least-privilege tools, allowlists on outbound calls, and human confirmation on anything irreversible.`,
    why_it_matters: `It reframes LLM security from a prompt-wording problem into an authorization problem, which is the framing an architect can actually act on. The right question in a design review is not "how do we phrase the guardrail" but "what is the blast radius if this agent reads a hostile document."`,
    transfer: "Directly analogous to stored XSS: the payload arrives via data, executes in a privileged context, and the fix is capability containment rather than filtering.",
    area: "evals-reliability",
    difficulty: "deep",
    durability: 91,
    links: [],
  },

  // ── open-weights ───────────────────────────────────────────────────
  {
    slug: "open-weight-licensing",
    title: "\"Open weights\" is a distribution model, not a licence — check before you build on it",
    hook: "Downloadable and usable-in-your-product are different questions with different answers.",
    claim_number: null,
    mechanism: `"Open source" applied to models conflates several independent things: whether weights are downloadable, whether the licence permits commercial use, whether it restricts use above some scale, whether outputs may train other models, and whether training data or code was released at all.

Real releases vary on each axis independently. Some ship under standard permissive terms — MIT or Apache 2.0 — where the analysis is the familiar one. Others use bespoke community licences with acceptable-use policies, scale thresholds that flip obligations once you pass a user count, or clauses restricting the use of outputs. A model can be freely downloadable and still unusable for your specific product.

The operational consequence is that the licence, not the benchmark score, is the first gate. A model that wins on capability and fails on terms costs you the evaluation time and teaches you nothing.

The corollary matters too: because these are per-release terms rather than per-vendor, a lab's next model can ship under different conditions than its last.`,
    why_it_matters: `Architects get asked "can we use this one?" and the honest answer usually depends on a licence nobody has read. Making licence review the first step rather than the last is a cheap process change that prevents a specific and recurring waste — and it is the kind of unglamorous diligence that distinguishes an architecture review from a demo.`,
    transfer: "The same discipline as dependency licence auditing: capability first, terms first-er.",
    area: "open-weights",
    difficulty: "working",
    durability: 82,
    links: [],
  },

  // ── credentials ────────────────────────────────────────────────────
  {
    slug: "ai-certification-landscape",
    title: "AI certifications are splitting into role-based tracks, and enrolment is gated",
    hook: "The interesting part is not the exam — it is who is allowed to sit it.",
    claim_number: null,
    mechanism: `Vendor AI certification has moved quickly from a single generalist credential toward **role-differentiated tracks**: separate paths for practitioners, developers, and architects, at foundation and professional levels, with proctored delivery through commercial testing networks and time-limited validity.

The structural detail worth knowing is that several programmes are **access-gated rather than open-enrolment**. Registration can require an organizational affiliation — a company domain tied to a partner-network membership — rather than being purchasable by any individual. Others are invited-only through enterprise or education agreements.

That gate is the part almost nobody covers, and it changes the planning question entirely. For an open exam, the question is "am I ready?" For a gated one, the question is "does my employer hold the right partnership, and who internally owns it?" — a procurement conversation that has to start well before any study plan.

Because these programmes are being restructured on a scale of months, the specific tier names, prices, and gates are the fastest-moving facts here.`,
    why_it_matters: `Certification structure is a genuinely under-covered area — the major AI newsletters do not track it — while being directly actionable and visible on a professional profile. For anyone planning a credential, the enrolment gate is the constraint that determines the timeline, and it is the one most people discover last.`,
    transfer: "Mirrors how cloud certification tracks matured: one generalist exam, then role-splitting, then partner-tiered access.",
    area: "credentials",
    difficulty: "working",
    durability: 78,
    links: [],
  },
];

async function seed(): Promise<void> {
  let inserted = 0;
  const idBySlug = new Map<string, number>();

  for (const c of SEEDS) {
    if (!AREAS.includes(c.area)) {
      console.warn(`  ⚠️ ${c.slug}: unknown area "${c.area}", skipping`);
      continue;
    }

    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO concepts
         (slug, title, hook, claim_number, mechanism, why_it_matters, transfer,
          area, difficulty, durability, status, origin, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'published','seed',NOW())
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         hook = EXCLUDED.hook,
         claim_number = EXCLUDED.claim_number,
         mechanism = EXCLUDED.mechanism,
         why_it_matters = EXCLUDED.why_it_matters,
         transfer = EXCLUDED.transfer,
         area = EXCLUDED.area,
         difficulty = EXCLUDED.difficulty,
         durability = EXCLUDED.durability,
         updated_at = NOW()
       RETURNING id`,
      [
        c.slug, c.title, c.hook, c.claim_number, c.mechanism, c.why_it_matters,
        c.transfer, c.area, c.difficulty, c.durability,
      ]
    );

    const id = rows[0]?.id;
    if (!id) continue;
    idBySlug.set(c.slug, id);
    inserted++;

    for (const link of c.links) {
      await pool.query(
        `INSERT INTO concept_links (concept_id, label, url) VALUES ($1, $2, $3)
         ON CONFLICT (concept_id, url) DO NOTHING`,
        [id, link.label, link.url]
      );
    }
  }

  // Prerequisites resolve in a second pass — a concept may depend on one
  // defined later in the list.
  for (const c of SEEDS) {
    const id = idBySlug.get(c.slug);
    if (!id || !c.requires) continue;
    for (const slug of c.requires) {
      const requiresId = idBySlug.get(slug);
      if (!requiresId) {
        console.warn(`  ⚠️ ${c.slug} requires unknown concept "${slug}"`);
        continue;
      }
      await pool.query(
        `INSERT INTO concept_prereqs (concept_id, requires_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [id, requiresId]
      );
    }
  }

  console.log(`🌱 Seeded ${inserted}/${SEEDS.length} concepts`);
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
