import { Router, Request, Response } from "express";
import pool from "../db.js";
import { hasLLMKey } from "../llm/client.js";
import { draftPost, runExtraction, AREAS } from "../concepts/extract.js";
import {
  loadCoverage,
  loadEdition,
  runServeJob,
  serveEdition,
  setConceptState,
} from "../concepts/serve.js";
import { optionalAuth, requireAuth, requireAdmin, AuthRequest } from "../middleware/auth.js";

const router = Router();

const STATES = ["got_it", "not_for_me", "want_to_post"] as const;

/**
 * A concept's post draft is generated lazily rather than at extraction time for
 * seeded concepts, which have no draft. Generating on first read keeps the seed
 * script free of an LLM dependency.
 */
async function ensurePostDraft(concept: {
  id: number;
  post_draft: string | null;
  title: string;
  hook: string;
  claim_number: string | null;
  mechanism: string;
  why_it_matters: string;
}): Promise<string | null> {
  if (concept.post_draft || !hasLLMKey()) return concept.post_draft;

  const draft = await draftPost({
    is_concept: true,
    title: concept.title,
    hook: concept.hook,
    claim_number: concept.claim_number,
    mechanism: concept.mechanism,
    why_it_matters: concept.why_it_matters,
    transfer: null,
    area: "agent-context",
    difficulty: "deep",
    mechanism_density: 1,
    novelty: 1,
  });

  if (draft) {
    await pool.query(`UPDATE concepts SET post_draft = $2, updated_at = NOW() WHERE id = $1`, [
      concept.id,
      draft,
    ]);
  }
  return draft;
}

async function attachSources(conceptId: number) {
  const [items, links] = await Promise.all([
    pool.query(
      `SELECT i.id, i.title, i.url, i.platform, cs.role
         FROM concept_sources cs
         JOIN items i ON i.id = cs.item_id
        WHERE cs.concept_id = $1
        ORDER BY cs.role, cs.added_at`,
      [conceptId]
    ),
    pool.query(`SELECT label, url FROM concept_links WHERE concept_id = $1 ORDER BY id`, [
      conceptId,
    ]),
  ]);
  return { items: items.rows, links: links.rows };
}

// GET /api/concepts/today — the served edition, creating it if one is due
router.get("/today", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const today = new Date().toISOString().slice(0, 10);

    let edition = await loadEdition(userId);
    if (!edition || edition.served_on !== today) {
      // Serve on read as well as on cron, so a first-time user isn't shown an
      // empty page until the next scheduled delivery day.
      edition = (await serveEdition(userId)) ?? edition;
    }

    if (!edition?.lead) {
      return res.json({ edition: null, message: "No concepts available yet." });
    }

    edition.lead.post_draft = await ensurePostDraft(edition.lead);
    const sources = await attachSources(edition.lead.id);

    res.json({ edition, sources });
  } catch (err) {
    console.error("GET /concepts/today error:", err);
    res.status(500).json({ error: "Failed to load today's concept" });
  }
});

// GET /api/concepts/coverage — five areas against this user's ledger
router.get("/coverage", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [areas, recent] = await Promise.all([
      loadCoverage(req.userId!),
      pool.query(
        `SELECT c.id, c.slug, c.title, c.area, c.difficulty, s.state, s.served_on::text
           FROM user_concept_state s
           JOIN concepts c ON c.id = s.concept_id
          WHERE s.user_id = $1
          ORDER BY s.served_on DESC, c.durability DESC
          LIMIT 60`,
        [req.userId!]
      ),
    ]);
    res.json({ areas, known_areas: AREAS, recent: recent.rows });
  } catch (err) {
    console.error("GET /concepts/coverage error:", err);
    res.status(500).json({ error: "Failed to load coverage" });
  }
});

// GET /api/concepts/archive — every published concept, newest first
router.get("/archive", optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const area = String(req.query.area || "");
    const search = String(req.query.search || "").trim();
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const offset = Math.max(0, Number(req.query.offset) || 0);

    // Filter predicates are built once but bound twice, and the two queries
    // don't share a parameter list: the page query needs `user_id` for the
    // ledger join, the count query doesn't. Passing an unreferenced parameter
    // makes Postgres unable to infer its type (42P18), so each query numbers
    // its own placeholders from a common set of filter *values*.
    const filters: { sql: (n: number) => string; value: unknown }[] = [];

    if (AREAS.includes(area as never)) {
      filters.push({ sql: (n) => `c.area = $${n}`, value: area });
    }
    if (search) {
      filters.push({
        sql: (n) => `(c.title ILIKE $${n} OR c.hook ILIKE $${n})`,
        value: `%${search}%`,
      });
    }

    const buildWhere = (startAt: number) =>
      ["c.status = 'published'", ...filters.map((f, i) => f.sql(startAt + i))].join(" AND ");
    const filterValues = filters.map((f) => f.value);

    // Page query: $1 = user_id, then filters, then limit/offset.
    const pageParams = [req.userId ?? null, ...filterValues, limit, offset];
    const { rows } = await pool.query(
      `SELECT c.id, c.slug, c.title, c.hook, c.claim_number, c.area, c.difficulty,
              c.durability::float AS durability, c.published_at, s.state
         FROM concepts c
         LEFT JOIN user_concept_state s
           ON s.concept_id = c.id AND s.user_id = $1
        WHERE ${buildWhere(2)}
        ORDER BY c.durability DESC, c.published_at DESC
        LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      pageParams
    );

    // Count query: filters only, numbered from $1.
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM concepts c WHERE ${buildWhere(1)}`,
      filterValues
    );

    res.json({ concepts: rows, total: countRows[0]?.total ?? 0, limit, offset });
  } catch (err) {
    console.error("GET /concepts/archive error:", err);
    res.status(500).json({ error: "Failed to load archive" });
  }
});

// GET /api/concepts/:slug — a single concept with its receipts
router.get("/:slug", optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, c.durability::float AS durability, s.state
         FROM concepts c
         LEFT JOIN user_concept_state s
           ON s.concept_id = c.id AND s.user_id = $2
        WHERE c.slug = $1 AND c.status = 'published'`,
      [req.params.slug, req.userId ?? null]
    );

    const concept = rows[0];
    if (!concept) return res.status(404).json({ error: "Concept not found" });

    concept.post_draft = await ensurePostDraft(concept);
    const sources = await attachSources(concept.id);

    res.json({ concept, sources });
  } catch (err) {
    console.error("GET /concepts/:slug error:", err);
    res.status(500).json({ error: "Failed to load concept" });
  }
});

// POST /api/concepts/:id/state — the terminal disposition
router.post("/:id/state", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const conceptId = Number(req.params.id);
    const state = String(req.body?.state || "");

    if (!Number.isInteger(conceptId)) {
      return res.status(400).json({ error: "Invalid concept id" });
    }
    if (!STATES.includes(state as never)) {
      return res.status(400).json({ error: `state must be one of: ${STATES.join(", ")}` });
    }

    const ok = await setConceptState(req.userId!, conceptId, state as (typeof STATES)[number]);
    if (!ok) return res.status(404).json({ error: "That concept has not been served to you" });

    res.json({ ok: true, state });
  } catch (err) {
    console.error("POST /concepts/:id/state error:", err);
    res.status(500).json({ error: "Failed to record state" });
  }
});

// POST /api/concepts/extract — admin: run the nightly extraction now
router.post("/extract", requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await runExtraction({
      windowHours: Number(req.query.hours) || 48,
      limit: Number(req.query.limit) || 400,
    });
    res.json(stats);
  } catch (err) {
    console.error("POST /concepts/extract error:", err);
    res.status(500).json({ error: "Extraction failed" });
  }
});

// POST /api/concepts/serve — admin: run the serve job now
router.post("/serve", requireAdmin, async (_req: Request, res: Response) => {
  try {
    res.json(await runServeJob());
  } catch (err) {
    console.error("POST /concepts/serve error:", err);
    res.status(500).json({ error: "Serve job failed" });
  }
});

// ── Delivery preferences ─────────────────────────────────────────────
// The `users.serve_days` / `serve_areas` / `email_concepts` columns shipped in
// sql/020 with sane defaults (Tue+Fri, all areas, email on) but nothing exposed
// them, so cadence was effectively hard-coded per user.

const DOW = [0, 1, 2, 3, 4, 5, 6];

// GET /api/concepts/prefs
router.get("/prefs/delivery", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(serve_days, '{2,5}'::int[]) AS serve_days,
              COALESCE(serve_areas, $2::text[])    AS serve_areas,
              COALESCE(email_concepts, true)       AS email_concepts
         FROM users WHERE id = $1`,
      [req.userId!, AREAS as unknown as string[]]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json({ ...rows[0], known_areas: AREAS });
  } catch (err) {
    console.error("GET /concepts/prefs/delivery error:", err);
    res.status(500).json({ error: "Failed to load delivery preferences" });
  }
});

// PATCH /api/concepts/prefs/delivery
router.patch("/prefs/delivery", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body ?? {};
    const updates: string[] = [];
    const params: unknown[] = [req.userId!];

    if (body.serve_days !== undefined) {
      const days = Array.isArray(body.serve_days)
        ? [...new Set((body.serve_days as unknown[]).map((d) => Number(d)))]
            .filter((d) => DOW.includes(d))
            .sort((a, b) => a - b)
        : null;
      // An empty schedule would silently stop delivery forever; make it an error
      // rather than a state the user can fall into by unchecking everything.
      if (!days || days.length === 0) {
        return res.status(400).json({ error: "Pick at least one delivery day." });
      }
      params.push(days);
      updates.push(`serve_days = $${params.length}::int[]`);
    }

    if (body.serve_areas !== undefined) {
      const areas = Array.isArray(body.serve_areas)
        ? [...new Set(body.serve_areas as unknown[])]
            .map((a) => String(a))
            .filter((a) => AREAS.includes(a as never))
        : null;
      if (!areas || areas.length === 0) {
        return res.status(400).json({ error: "Pick at least one area." });
      }
      params.push(areas);
      updates.push(`serve_areas = $${params.length}::text[]`);
    }

    if (body.email_concepts !== undefined) {
      params.push(Boolean(body.email_concepts));
      updates.push(`email_concepts = $${params.length}`);
    }

    if (updates.length === 0) return res.status(400).json({ error: "Nothing to update" });

    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(", ")}, updated_at = NOW()
        WHERE id = $1
        RETURNING serve_days, serve_areas, email_concepts`,
      params
    );
    res.json({ ok: true, ...rows[0] });
  } catch (err) {
    console.error("PATCH /concepts/prefs/delivery error:", err);
    res.status(500).json({ error: "Failed to save delivery preferences" });
  }
});

export default router;
