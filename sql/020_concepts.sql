-- ============================================
-- 020: Concepts — the Idea Engine
-- Run: psql -U postgres -d ai_pulse -f sql/020_concepts.sql
--
-- Shifts the product's primary entity from `items` (links ranked by popularity)
-- to `concepts` (transferable technical mechanisms, ranked by durability).
--
-- Items become raw material. A concept is one idea an experienced engineer can
-- learn and re-explain — extracted by LLM, deduped, and served against a
-- per-user ledger so "new" can finally mean "new to you" rather than "recent".
-- ============================================

-- ============================================
-- 1. CONCEPTS — the new primary entity
-- ============================================
CREATE TABLE IF NOT EXISTS concepts (
  id             SERIAL PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,          -- "Prefix caching cuts cost 85-95% on hits"
  hook           TEXT NOT NULL,          -- the counterintuitive one-liner
  claim_number   TEXT,                   -- "85-95%", "2.6x", "$0.03/1M tok"
  mechanism      TEXT NOT NULL,          -- markdown, first-principles — the payload
  -- Import AI's per-item interpretive block. NOT NULL on purpose: if the model
  -- cannot say why it matters, there is no concept.
  why_it_matters TEXT NOT NULL,
  transfer       TEXT,                   -- where else this pattern applies
  post_draft     TEXT,                   -- LinkedIn-shaped draft
  area           TEXT NOT NULL DEFAULT 'agent-context',
                 -- inference-serving | open-weights | agent-context
                 -- | evals-reliability | credentials
  difficulty     TEXT NOT NULL DEFAULT 'deep',   -- working | deep | frontier
  durability     NUMERIC(6,3) NOT NULL DEFAULT 0, -- NOT engagement. See durability.ts
  status         TEXT NOT NULL DEFAULT 'draft',   -- draft | published | rejected
  origin         TEXT NOT NULL DEFAULT 'extracted', -- extracted | seed
  first_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concepts_area       ON concepts(area);
CREATE INDEX IF NOT EXISTS idx_concepts_status     ON concepts(status);
CREATE INDEX IF NOT EXISTS idx_concepts_durability ON concepts(durability DESC);
CREATE INDEX IF NOT EXISTS idx_concepts_published  ON concepts(published_at DESC);

-- ============================================
-- 2. CONCEPT SOURCES — the receipts
-- ============================================
-- A duplicate extraction does NOT create a concept; it appends a corroborating
-- row here and raises the parent concept's durability.
CREATE TABLE IF NOT EXISTS concept_sources (
  concept_id  INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'origin',  -- origin | corroborating
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (concept_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_concept_sources_item ON concept_sources(item_id);

-- External references that are not `items` rows (primary papers, lab blog posts
-- the fetchers never saw). Seeded concepts rely on these.
CREATE TABLE IF NOT EXISTS concept_links (
  id          SERIAL PRIMARY KEY,
  concept_id  INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  url         TEXT NOT NULL,
  UNIQUE (concept_id, url)
);

-- ============================================
-- 3. PREREQUISITES — ordering only, not a visual graph
-- ============================================
-- Deliberately NOT rendered as a force-directed graph. This exists so a
-- 'frontier' concept is never served before its 'working'-level prerequisite.
CREATE TABLE IF NOT EXISTS concept_prereqs (
  concept_id  INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  requires_id INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  PRIMARY KEY (concept_id, requires_id),
  CHECK (concept_id <> requires_id)
);

-- ============================================
-- 4. USER LEDGER — makes "new" mean "new to you"
-- ============================================
-- An edition is simply every row sharing a (user_id, served_on) pair:
-- one `lead` concept plus 3-4 `mention` one-liners.
CREATE TABLE IF NOT EXISTS user_concept_state (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id  INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  state       TEXT NOT NULL DEFAULT 'served',  -- served | got_it | not_for_me | want_to_post
  role        TEXT NOT NULL DEFAULT 'lead',    -- lead | mention
  served_on   DATE NOT NULL DEFAULT CURRENT_DATE,
  served_at   TIMESTAMPTZ DEFAULT NOW(),
  acted_at    TIMESTAMPTZ,
  PRIMARY KEY (user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_ucs_user_served ON user_concept_state(user_id, served_on DESC);
CREATE INDEX IF NOT EXISTS idx_ucs_user_state  ON user_concept_state(user_id, state);

-- Per-user delivery cadence. Postgres DOW: 0=Sun .. 6=Sat. Default Tue + Fri.
ALTER TABLE users ADD COLUMN IF NOT EXISTS serve_days   INTEGER[] DEFAULT '{2,5}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS serve_areas  TEXT[]
  DEFAULT '{inference-serving,open-weights,agent-context,evals-reliability,credentials}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_concepts BOOLEAN DEFAULT true;

-- ============================================
-- 5. SOURCE ROLES — demote the social firehose
-- ============================================
-- Extraction cost scales with candidate count, and the ~57 Reddit sources plus
-- the GNews / LinkedIn-via-Google-News sources almost never carry a mechanism.
-- They are demoted, not deleted: they can still raise durability through
-- corroboration, but they can never ORIGINATE a concept.
ALTER TABLE sources ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'origin';

UPDATE sources SET role = 'corroboration'
 WHERE platform IN ('Reddit', 'GNews', 'X', 'Twitter', 'LinkedIn')
   AND role <> 'corroboration';

CREATE INDEX IF NOT EXISTS idx_sources_role ON sources(role);

-- ============================================
-- 6. BENCHMARK SNAPSHOTS — persist what was a 6h in-memory cache
-- ============================================
-- /api/benchmarks proxied Artificial Analysis and kept results in-process, so
-- every deploy lost the history. Movement over time is the part that survives
-- the release-news churn, so it has to be durable.
CREATE TABLE IF NOT EXISTS benchmark_snapshots (
  captured_on   DATE NOT NULL,
  model_slug    TEXT NOT NULL,
  model_name    TEXT NOT NULL,
  creator       TEXT,
  intelligence_index          NUMERIC(6,2),
  coding_index                NUMERIC(6,2),
  output_tokens_per_second    NUMERIC(10,2),
  time_to_first_token_seconds NUMERIC(10,3),
  price_1m_input              NUMERIC(10,3),
  price_1m_output             NUMERIC(10,3),
  price_1m_blended            NUMERIC(10,3),
  PRIMARY KEY (captured_on, model_slug)
);

CREATE INDEX IF NOT EXISTS idx_benchmark_model ON benchmark_snapshots(model_slug, captured_on DESC);

-- ============================================
-- 7. FIX THE CLASSIFIER'S DEAD KEYS
-- ============================================
-- KEYWORD_MAP in llm/topic-classifier.ts has entries for these slugs, but they
-- were never inserted as `topics` rows — they existed only in the DEFERRED
-- sql/012_guides.sql. keywordClassify() checks each slug against real topics and
-- silently skips misses, so every one of these keywords was dead code, and bare
-- "agent" under agentic-ai swallowed the traffic instead.
INSERT INTO topics (name, slug, category, category_color, description)
VALUES
  ('Context Engineering', 'context-engineering', 'Technique', '#c2410c',
   'Context rot, attention budget, compaction, structured note-taking, just-in-time retrieval'),
  ('Agentic Patterns',    'agentic-patterns',    'Technique', '#7c3aed',
   'Agent harnesses, tool-call design, sub-agent orchestration, agent skills'),
  ('AI Evals',            'ai-evals',            'Technique', '#0f766e',
   'Eval harness design, LLM-as-judge calibration, regression tracking, agent benchmarks'),
  ('Vibe Coding',         'vibe-coding',         'Technique', '#be185d',
   'Building software primarily through natural-language conversation with AI tools')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 8. MIGRATE THE DEFERRED KNOWLEDGE GUIDES INTO CONCEPTS
-- ============================================
-- The only feature in the product that actually taught anything was switched
-- off. Its rows are preserved here so the prose isn't lost.
--
-- They land as 'draft', NOT 'published': the migration can carry over a guide's
-- body but it cannot invent a hook, a why_it_matters, or the right area, and a
-- served concept opening with placeholder text would undercut the whole premise.
-- Promote one by writing those fields and flipping status.
INSERT INTO concepts (slug, title, hook, mechanism, why_it_matters, area, difficulty, status, origin, published_at)
SELECT
  g.slug,
  g.title,
  'Migrated from the DevPulse knowledge guides.',
  g.content,
  'Foundational background for the areas this product now tracks.',
  CASE
    WHEN g.slug IN ('context-engineering', 'agentic-patterns') THEN 'agent-context'
    WHEN g.slug IN ('ai-evals-harness', 'ai-safety-guardrails') THEN 'evals-reliability'
    ELSE 'agent-context'
  END,
  'working',
  'draft',
  'seed',
  NULL
FROM knowledge_guides g
WHERE g.is_published = true
ON CONFLICT (slug) DO NOTHING;
