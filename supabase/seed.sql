-- OpenSeat Seed Data
-- Run this AFTER schema.sql in the Supabase SQL Editor.

-- ── Libraries ──
INSERT INTO libraries (slug, name) VALUES
  ('hsse',    'Humanities, Social Science & Education Library (HSSE)'),
  ('walc',    'Wilmeth Active Learning Center (WALC)'),
  ('hicks',   'Hicks Undergraduate Library'),
  ('math',    'Mathematical Sciences Library'),
  ('kran',    'Krannert Library of Management & Economics (Parrish)'),
  ('vetmed',  'Veterinary Medical Library')
ON CONFLICT (slug) DO NOTHING;

-- ── Rooms ──
-- WALC rooms
INSERT INTO rooms (library_id, display_name, floor, capacity, is_reservable) VALUES
  ((SELECT id FROM libraries WHERE slug = 'walc'), 'Interview Room WALC 2141',      '2nd Floor', 1,  true),
  ((SELECT id FROM libraries WHERE slug = 'walc'), 'Group Study Room WALC 2020',     '2nd Floor', 6,  true),
  ((SELECT id FROM libraries WHERE slug = 'walc'), 'Group Study Room WALC 3060',     '3rd Floor', 8,  true),
  ((SELECT id FROM libraries WHERE slug = 'walc'), 'Group Study Room WALC 3068',     '3rd Floor', 8,  true),
  ((SELECT id FROM libraries WHERE slug = 'walc'), 'Group Study Room WALC 3076',     '3rd Floor', 8,  true),
  ((SELECT id FROM libraries WHERE slug = 'walc'), 'Sensory Room WALC 1134',         '1st Floor', 6,  true),
  ((SELECT id FROM libraries WHERE slug = 'walc'), 'Podcast Studio WALC 3007',       '3rd Floor', 3,  true);

-- HSSE rooms
INSERT INTO rooms (library_id, display_name, floor, capacity, is_reservable) VALUES
  ((SELECT id FROM libraries WHERE slug = 'hsse'), 'Collaborative Study Center HSSE 142', '1st Floor', 28, true),
  ((SELECT id FROM libraries WHERE slug = 'hsse'), 'Group Study Room HSSE 145',           '1st Floor', 8,  true),
  ((SELECT id FROM libraries WHERE slug = 'hsse'), 'Interview Room HSSE 147',             '1st Floor', 1,  true);

-- Krannert (KRAN) rooms
INSERT INTO rooms (library_id, display_name, floor, capacity, is_reservable) VALUES
  ((SELECT id FROM libraries WHERE slug = 'kran'), 'Hollister Conference Room KRAN 202',  '2nd Floor', 24, true),
  ((SELECT id FROM libraries WHERE slug = 'kran'), 'Financial Conference Room KRAN 230A', '2nd Floor', 21, true),
  ((SELECT id FROM libraries WHERE slug = 'kran'), 'Learn Lab KRAN 250',                  '2nd Floor', 40, true),
  ((SELECT id FROM libraries WHERE slug = 'kran'), 'Corporate Study Room KRAN 258/260',   '2nd Floor', 35, true);

-- VetMed rooms
INSERT INTO rooms (library_id, display_name, floor, capacity, is_reservable) VALUES
  ((SELECT id FROM libraries WHERE slug = 'vetmed'), 'Study Room 1133G', '1st Floor', 4, true),
  ((SELECT id FROM libraries WHERE slug = 'vetmed'), 'Study Room 1133H', '1st Floor', 4, true),
  ((SELECT id FROM libraries WHERE slug = 'vetmed'), 'Study Room 1133J', '1st Floor', 4, true),
  ((SELECT id FROM libraries WHERE slug = 'vetmed'), 'Study Room 1133K', '1st Floor', 4, true);

-- Math rooms
INSERT INTO rooms (library_id, display_name, floor, capacity, is_reservable) VALUES
  ((SELECT id FROM libraries WHERE slug = 'math'), 'Testing Room 352', '3rd Floor', 1, true);

-- Hicks rooms
INSERT INTO rooms (library_id, display_name, floor, capacity, is_reservable) VALUES
  ((SELECT id FROM libraries WHERE slug = 'hicks'), 'Group Study Room B14',  'Basement', 6, true),
  ((SELECT id FROM libraries WHERE slug = 'hicks'), 'Group Study Room B16',  'Basement', 6, true),
  ((SELECT id FROM libraries WHERE slug = 'hicks'), 'Group Study Room B18',  'Basement', 4, true);
