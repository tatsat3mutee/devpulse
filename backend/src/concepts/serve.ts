import pool from "../db.js";

/**
 * Serving — turning the concept corpus into a finishable edition.
 *
 * One deep concept plus a few one-liners, twice a week. The cap is enforced
 * here in code rather than left to editorial intent, because that is the only
 * place it survives contact with a growing corpus. Slow-news outlets converge
 * on the same number from the other direction: an issue the reader has a
 * realistic chance of finishing.
 */

/** One lead + MENTIONS = the 5-item "finishable" ceiling. Do not raise casually. */
export const MENTIONS_PER_EDITION = 4;

export interface ServedConcept {
  id: number;
  slug: string;
  title: string;
  hook: string;
  claim_number: string | null;
  mechanism: string;
  why_it_matters: string;
  transfer: string | null;
  post_draft: string | null;
  area: string;
  difficulty: string;
  durability: number;
  /** Present only when loaded for a specific user — drives the terminal-state UI. */
  state?: string | null;
}

export interface Edition {
  served_on: string;
  lead: ServedConcept | null;
  mentions: ServedConcept[];
}

const CONCEPT_COLUMNS = `
  c.id, c.slug, c.title, c.hook, c.claim_number, c.mechanism,
  c.why_it_matters, c.transfer, c.post_draft, c.area, c.difficulty,
  c.durability::float AS durability
`;

/**
 * Concepts this user has never been served, in their chosen areas, whose
 * prerequisites they have already seen.
 *
 * Ordering is `durability DESC, first_seen_at DESC` — durability decides, and
 * recency only breaks ties. That is the deliberate inversion of the old feed,
 * where recency was 30% of the score outright.
 */
async function eligibleFor(userId: number, limit: number): Promise<ServedConcept[]> {
  const { rows } = await pool.query<ServedConcept>(
    `SELECT ${CONCEPT_COLUMNS}
       FROM concepts c
       JOIN users u ON u.id = $1
      WHERE c.status = 'published'
        AND (u.serve_areas IS NULL OR c.area = ANY(u.serve_areas))
        AND NOT EXISTS (
          SELECT 1 FROM user_concept_state s
           WHERE s.user_id = $1 AND s.concept_id = c.id
        )
        -- Never serve a concept before its prerequisites.
        AND NOT EXISTS (
          SELECT 1 FROM concept_prereqs p
           WHERE p.concept_id = c.id
             AND NOT EXISTS (
               SELECT 1 FROM user_concept_state s2
                WHERE s2.user_id = $1 AND s2.concept_id = p.requires_id
             )
        )
      ORDER BY c.durability DESC, c.first_seen_at DESC
      LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

/** Today's already-served edition, if there is one. */
export async function loadEdition(userId: number, servedOn?: string): Promise<Edition | null> {
  // `s.state` must come back with the edition: without it the card re-renders
  // as undisposed after a reload even though the ledger recorded the action.
  const { rows } = await pool.query<ServedConcept & { role: string; served_on: string }>(
    `SELECT ${CONCEPT_COLUMNS}, s.state, s.role, s.served_on::text AS served_on
       FROM user_concept_state s
       JOIN concepts c ON c.id = s.concept_id
      WHERE s.user_id = $1
        AND s.served_on = ${servedOn ? "$2::date" : "(SELECT MAX(served_on) FROM user_concept_state WHERE user_id = $1)"}
      ORDER BY s.role DESC, c.durability DESC`,
    servedOn ? [userId, servedOn] : [userId]
  );

  if (rows.length === 0) return null;

  const lead = rows.find((r) => r.role === "lead") ?? null;
  return {
    served_on: rows[0].served_on,
    lead,
    mentions: rows.filter((r) => r.role === "mention"),
  };
}

/**
 * Build and record today's edition for one user. Idempotent per day: calling it
 * twice returns the same edition rather than burning through the backlog.
 */
export async function serveEdition(userId: number): Promise<Edition | null> {
  const existing = await loadEdition(userId);
  const today = new Date().toISOString().slice(0, 10);
  if (existing && existing.served_on === today) return existing;

  const candidates = await eligibleFor(userId, MENTIONS_PER_EDITION + 1);
  if (candidates.length === 0) return null;

  const [lead, ...mentions] = candidates;

  const ids = [lead.id, ...mentions.map((m) => m.id)];
  const roles = ["lead", ...mentions.map(() => "mention")];

  await pool.query(
    `INSERT INTO user_concept_state (user_id, concept_id, state, role, served_on)
     SELECT $1, v.id, 'served', v.role, CURRENT_DATE
       FROM (SELECT unnest($2::int[]) AS id, unnest($3::text[]) AS role) v
     ON CONFLICT (user_id, concept_id) DO NOTHING`,
    [userId, ids, roles]
  );

  return { served_on: today, lead, mentions };
}

/**
 * Cron entry point. Serves every user whose chosen delivery days include today.
 * Postgres DOW: 0 = Sunday .. 6 = Saturday; the column defaults to {2,5} (Tue/Fri).
 */
export async function runServeJob(): Promise<{ served: number; skipped: number }> {
  const dow = new Date().getDay();

  const { rows: users } = await pool.query<{ id: number }>(
    `SELECT id FROM users
      WHERE $1 = ANY(COALESCE(serve_days, '{2,5}'::int[]))`,
    [dow]
  );

  let served = 0;
  let skipped = 0;
  for (const user of users) {
    try {
      const edition = await serveEdition(user.id);
      if (edition) served++;
      else skipped++;
    } catch (err) {
      console.error(`📮 Serve failed for user ${user.id}:`, err);
      skipped++;
    }
  }

  console.log(`📮 Editions: ${served} served, ${skipped} skipped (${users.length} users due today)`);
  return { served, skipped };
}

/** Record a disposition. Every served concept must reach a terminal state. */
export async function setConceptState(
  userId: number,
  conceptId: number,
  state: "got_it" | "not_for_me" | "want_to_post"
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE user_concept_state
        SET state = $3, acted_at = NOW()
      WHERE user_id = $1 AND concept_id = $2`,
    [userId, conceptId, state]
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Coverage: the five areas against this user's ledger. A checklist, not a graph
 * — the deliberate choice to keep the interaction model familiar.
 */
export async function loadCoverage(userId: number) {
  const { rows } = await pool.query(
    `SELECT c.area,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE s.state = 'got_it')::int AS mastered,
            COUNT(*) FILTER (WHERE s.state IS NOT NULL AND s.state <> 'got_it')::int AS seen,
            COUNT(*) FILTER (WHERE s.state IS NULL)::int AS unexplored
       FROM concepts c
       LEFT JOIN user_concept_state s
         ON s.concept_id = c.id AND s.user_id = $1
      WHERE c.status = 'published'
      GROUP BY c.area
      ORDER BY c.area`,
    [userId]
  );
  return rows;
}
