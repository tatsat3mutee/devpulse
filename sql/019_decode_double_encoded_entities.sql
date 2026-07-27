-- ============================================
-- 019: Decode double-encoded HTML entities in item titles/descriptions
-- Run: bun run migrate (or psql -f sql/019_decode_double_encoded_entities.sql)
--
-- Some feeds double-encode entities (&amp;#8217;). The old single-pass
-- decodeEntities left "&#8217;" behind (e.g. "Travis Kalanick&#8217;s").
-- The fetcher now loops until stable; this backfills stored rows.
-- Idempotent: WHERE clause only matches rows still containing entities.
-- ============================================

CREATE OR REPLACE FUNCTION pg_temp.decode_entities(t TEXT) RETURNS TEXT AS $$
  SELECT replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
    t,
    '&amp;#', '&#'),
    '&#8217;', ''''), '&#8216;', ''''), '&#x27;', ''''), '&#39;', ''''),
    '&#8220;', '"'), '&#8221;', '"'), '&quot;', '"'), '&#34;', '"'),
    '&#8211;', '–'), '&#8212;', '—'), '&#8230;', '…'),
    '&nbsp;', ' '), '&#38;', '&'), '&amp;amp;', '&'), '&amp;', '&');
$$ LANGUAGE SQL IMMUTABLE;

UPDATE items
SET title = pg_temp.decode_entities(title)
WHERE title ~ '&(#\d+|#x[0-9a-fA-F]+|amp|quot|nbsp);';

UPDATE items
SET description = pg_temp.decode_entities(description)
WHERE description IS NOT NULL
  AND description ~ '&(#\d+|#x[0-9a-fA-F]+|amp|quot|nbsp);';
