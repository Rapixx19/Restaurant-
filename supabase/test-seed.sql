-- ============================================================
-- GALMARINI FRIEDWHITE - TEST SEED DATA
-- ============================================================
-- Run this in Supabase SQL Editor to populate test data
-- for dashboard, analytics, and voice AI testing.

-- 1. Update Restaurant "Brain" (description + voice settings)
-- Note: Menu items should go in menu_items table, but description
-- serves as owner_notes for the voice AI context
UPDATE restaurants
SET
  description = '
HOURS: Mon-Fri 12:00-15:00 & 18:30-23:30. Sat-Sun 12:00-00:00.
DELIVERY: 5km radius from restaurant. Minimum order €50.
POLICIES: 15-minute grace period for tables. 4-hour cancellation notice required.
SPECIALTIES: Black truffle tagliatelle, Bistecca Fiorentina (800g T-bone), house-made tiramisu.
PERSONA: Professional, warm, knowledgeable Italian host.
  ',
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{voice,primaryLanguage}',
    '"it"'::jsonb
  )
WHERE name = 'Galmarini FriedWhite';

-- 2. Insert Menu Categories
INSERT INTO menu_categories (restaurant_id, name, sort_order)
SELECT r.id, cat.name, cat.sort_order
FROM restaurants r
CROSS JOIN (VALUES
  ('Antipasti', 1),
  ('Primi', 2),
  ('Secondi', 3),
  ('Dolci', 4)
) AS cat(name, sort_order)
WHERE r.name = 'Galmarini FriedWhite'
ON CONFLICT DO NOTHING;

-- 3. Insert Menu Items
INSERT INTO menu_items (restaurant_id, category_id, name, description, price)
SELECT
  r.id,
  mc.id,
  items.name,
  items.description,
  items.price
FROM restaurants r
JOIN menu_categories mc ON mc.restaurant_id = r.id
CROSS JOIN (VALUES
  ('Antipasti', 'Calamari Fritti', 'Fresh Atlantic squid, lemon, spicy marinara.', 22.00),
  ('Antipasti', 'Burrata Pugliese', 'Heirloom tomatoes, basil pesto, aged balsamic.', 24.00),
  ('Primi', 'Tagliatelle al Tartufo', 'Black truffle, parmigiano reggiano, butter sauce.', 48.00),
  ('Primi', 'Osso Buco alla Milanese', 'Braised veal shank, saffron risotto, gremolata.', 52.00),
  ('Secondi', 'Bistecca alla Fiorentina', '800g T-bone, rosemary, garlic, Tuscan oil.', 120.00),
  ('Secondi', 'Orata al Forno', 'Whole roasted Sea Bream, cherry tomatoes, olives.', 75.00),
  ('Dolci', 'Tiramisu Classico', 'Espresso, mascarpone, cocoa.', 18.00)
) AS items(category, name, description, price)
WHERE r.name = 'Galmarini FriedWhite'
  AND mc.name = items.category
ON CONFLICT DO NOTHING;

-- 4. Mock Call Logs (with required call_id)
INSERT INTO call_logs (
  restaurant_id,
  call_id,
  caller_phone,
  phone_number,
  status,
  duration_seconds,
  language_detected,
  sentiment,
  recording_url,
  language_segments,
  transcript,
  intent,
  started_at,
  ended_at
) VALUES
-- Call 1: English reservation inquiry
(
  (SELECT id FROM restaurants WHERE name = 'Galmarini FriedWhite'),
  'test-call-001-en-reservation',
  '+33123456789',
  '+33145678900',
  'completed',
  145,
  'en',
  'positive',
  NULL,
  '[{"language": "en", "text": "I would like to book a table for four tonight at 8 PM.", "start": 0, "end": 10}]'::jsonb,
  '[{"role": "user", "content": "I would like to book a table for four tonight at 8 PM."}, {"role": "assistant", "content": "Benvenuti! I have a lovely table available at 20:00. Shall I reserve it for you?"}]'::jsonb,
  'reservation',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours' + INTERVAL '145 seconds'
),
-- Call 2: Multilingual (French/Italian)
(
  (SELECT id FROM restaurants WHERE name = 'Galmarini FriedWhite'),
  'test-call-002-fr-menu-inquiry',
  '+33987654321',
  '+33145678900',
  'completed',
  210,
  'fr',
  'neutral',
  NULL,
  '[{"language": "it", "text": "Pronto!", "start": 0, "end": 2}, {"language": "fr", "text": "Est-ce que vous avez du sans gluten?", "start": 3, "end": 15}]'::jsonb,
  '[{"role": "user", "content": "Est-ce que vous avez du sans gluten?"}, {"role": "assistant", "content": "Oui, notre Orata al Forno est naturellement sans gluten."}]'::jsonb,
  'menu_inquiry',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour' + INTERVAL '210 seconds'
),
-- Call 3: German hours inquiry
(
  (SELECT id FROM restaurants WHERE name = 'Galmarini FriedWhite'),
  'test-call-003-de-hours',
  '+491234567890',
  '+33145678900',
  'completed',
  95,
  'de',
  'positive',
  NULL,
  '[{"language": "de", "text": "Guten Tag, wann haben Sie heute geöffnet?", "start": 0, "end": 8}]'::jsonb,
  '[{"role": "user", "content": "Guten Tag, wann haben Sie heute geöffnet?"}, {"role": "assistant", "content": "Buongiorno! We are open today from 12:00 to 15:00 for lunch, and 18:30 to 23:30 for dinner."}]'::jsonb,
  'hours',
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '30 minutes' + INTERVAL '95 seconds'
),
-- Call 4: Italian reservation (native language)
(
  (SELECT id FROM restaurants WHERE name = 'Galmarini FriedWhite'),
  'test-call-004-it-reservation',
  '+393401234567',
  '+33145678900',
  'completed',
  180,
  'it',
  'positive',
  NULL,
  '[{"language": "it", "text": "Buonasera, vorrei prenotare un tavolo per due persone per domani sera alle 20:30.", "start": 0, "end": 12}]'::jsonb,
  '[{"role": "user", "content": "Buonasera, vorrei prenotare un tavolo per due persone per domani sera alle 20:30."}, {"role": "assistant", "content": "Buonasera! Certamente, abbiamo un tavolo perfetto per due disponibile alle 20:30. A che nome devo registrare la prenotazione?"}]'::jsonb,
  'reservation',
  NOW() - INTERVAL '45 minutes',
  NOW() - INTERVAL '45 minutes' + INTERVAL '180 seconds'
)
ON CONFLICT (call_id) DO NOTHING;

-- 5. Update Usage Tracking (71% of Culinary plan = warning state)
-- Culinary plan has 500 minute limit, 355 used = 71%
UPDATE organizations
SET voice_minutes_used = 355
WHERE id = (SELECT organization_id FROM restaurants WHERE name = 'Galmarini FriedWhite');

-- ============================================================
-- CLEANUP SCRIPT (run separately to remove test data)
-- ============================================================
-- DELETE FROM call_logs WHERE call_id LIKE 'test-call-%';
-- DELETE FROM menu_items WHERE restaurant_id = (SELECT id FROM restaurants WHERE name = 'Galmarini FriedWhite');
-- DELETE FROM menu_categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE name = 'Galmarini FriedWhite');
