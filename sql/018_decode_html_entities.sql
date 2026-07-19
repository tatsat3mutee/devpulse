-- ============================================
-- 018: Decode HTML entities in existing item titles/descriptions
-- Run: psql -U postgres -d ai_pulse -f sql/018_decode_html_entities.sql
--
-- Fetchers now decode numeric + named HTML entities at ingest
-- (decodeEntities in fetchers/http.ts). This backfills rows stored
-- before the fix (e.g. "Moonshot&#8217;s" -> "Moonshot's").
-- ============================================

CREATE OR REPLACE FUNCTION pg_temp.decode_entities(t TEXT) RETURNS TEXT AS $$
  SELECT replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
    t,
    '&#8217;', ''''), '&#8216;', ''''), '&#x27;', ''''), '&#39;', ''''),
    '&#8220;', '"'), '&#8221;', '"'), '&quot;', '"'), '&#34;', '"'),
    '&#8211;', '–'), '&#8212;', '—'), '&#8230;', '…'),
    '&nbsp;', ' '), '&#38;', '&'), '&amp;', '&');
$$ LANGUAGE SQL IMMUTABLE;

UPDATE items
SET title = pg_temp.decode_entities(title)
WHERE title ~ '&(#\d+|#x[0-9a-fA-F]+|amp|quot|nbsp);';

UPDATE items
SET description = pg_temp.decode_entities(description)
WHERE description IS NOT NULL
  AND description ~ '&(#\d+|#x[0-9a-fA-F]+|amp|quot|nbsp);';
