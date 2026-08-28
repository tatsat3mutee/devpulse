-- ============================================
-- 021: Demote migrated knowledge guides to draft
-- Run: psql -U postgres -d ai_pulse -f sql/021_demote_migrated_guides.sql
--
-- Fixes a defect in 020 step 8. That step migrated every published
-- `knowledge_guides` row into `concepts` with status='published', giving 19
-- rows a placeholder hook ("Migrated from the DevPulse knowledge guides."), a
-- generic why_it_matters, durability 0, and — for anything outside the four
-- slugs its CASE handled — the wrong area.
--
-- They were therefore servable. A product whose entire premise is that a served
-- concept is worth ten minutes cannot open with boilerplate, so they are
-- demoted rather than deleted: the guide prose is still good raw material, and
-- promoting one back is a status flip plus a real hook and why_it_matters.
--
-- 020 has been corrected to insert as 'draft' for fresh installs; this migration
-- repairs databases where 020 already ran.
-- ============================================

UPDATE concepts
   SET status = 'draft',
       updated_at = NOW()
 WHERE origin = 'seed'
   AND durability = 0
   AND hook = 'Migrated from the DevPulse knowledge guides.'
   AND status = 'published';

-- Only hand-written seeds and extracted concepts should be servable.
-- Expected after this runs: 13 published (the cold-start seeds), 19 draft.
