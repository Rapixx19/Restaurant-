-- ============================================================
-- GLI STIRATI - QA TEST SEED DATA
-- ============================================================
-- Run this in Supabase SQL Editor to populate test data
-- for a new test user with 'pending' status restaurant.
--
-- USAGE:
-- 1. Create a test user via signup flow (or use existing)
-- 2. Run this script in Supabase SQL Editor
-- 3. Replace 'YOUR_TEST_USER_ID' with actual user UUID
-- ============================================================

-- ============================================================
-- STEP 1: CREATE TEST RESTAURANT (Gli Stirati)
-- ============================================================
-- Replace 'YOUR_TEST_USER_ID' with the actual test user's UUID

DO $$
DECLARE
  v_user_id UUID := 'YOUR_TEST_USER_ID'; -- REPLACE THIS!
  v_restaurant_id UUID;
  v_org_id UUID;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User ID % not found. Please replace YOUR_TEST_USER_ID with a valid user UUID.', v_user_id;
  END IF;

  -- Check if restaurant already exists for this user
  SELECT id INTO v_restaurant_id FROM restaurants WHERE owner_id = v_user_id LIMIT 1;

  IF v_restaurant_id IS NOT NULL THEN
    RAISE NOTICE 'Restaurant already exists for user %. Using existing restaurant: %', v_user_id, v_restaurant_id;
  ELSE
    -- Create organization first
    INSERT INTO organizations (name, owner_id, plan_id, voice_minutes_used)
    SELECT
      'Gli Stirati Organization',
      v_user_id,
      (SELECT id FROM plan_configs WHERE name = 'professional' LIMIT 1),
      125  -- Some usage for testing usage banner
    RETURNING id INTO v_org_id;

    -- Create restaurant with 'pending' status
    INSERT INTO restaurants (
      owner_id,
      organization_id,
      name,
      slug,
      phone,
      email,
      address,
      timezone,
      status,
      description,
      settings
    ) VALUES (
      v_user_id,
      v_org_id,
      'Gli Stirati',
      'gli-stirati',
      '+39 02 1234 5678',
      'info@glistirati.it',
      jsonb_build_object(
        'street', 'Via Roma 42',
        'city', 'Milano',
        'state', 'Lombardia',
        'zip', '20121',
        'country', 'Italy'
      ),
      'Europe/Rome',
      'pending',  -- Test pending status
      'Authentic Milanese cuisine since 1952. Known for ossobuco, risotto alla milanese, and cotoletta.',
      jsonb_build_object(
        'voice', jsonb_build_object(
          'primaryLanguage', 'it',
          'enabled', true
        )
      )
    )
    RETURNING id INTO v_restaurant_id;

    -- Add user to organization
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (v_org_id, v_user_id, 'owner');

    RAISE NOTICE 'Created restaurant "Gli Stirati" with ID: %', v_restaurant_id;
  END IF;

  -- ============================================================
  -- STEP 2: INSERT 4 MULTILINGUAL MOCK CALLS
  -- ============================================================

  -- Delete existing test calls for this restaurant
  DELETE FROM call_logs WHERE restaurant_id = v_restaurant_id AND call_id LIKE 'gli-stirati-test-%';

  -- Call 1: Italian (Native) - Reservation Request
  INSERT INTO call_logs (
    restaurant_id,
    call_id,
    phone_number,
    caller_phone,
    direction,
    status,
    duration_seconds,
    language_detected,
    sentiment,
    intent,
    summary,
    transcript,
    started_at,
    ended_at
  ) VALUES (
    v_restaurant_id,
    'gli-stirati-test-001-it',
    '+39 02 1234 5678',
    '+39 335 123 4567',
    'inbound',
    'completed',
    185,
    'it',
    'positive',
    'reservation',
    'Cliente ha prenotato un tavolo per 4 persone per venerdì sera alle 20:30.',
    '[
      {"role": "assistant", "content": "Buonasera, benvenuto a Gli Stirati. Come posso aiutarla?"},
      {"role": "user", "content": "Buonasera, vorrei prenotare un tavolo per quattro persone per venerdì sera."},
      {"role": "assistant", "content": "Certamente! A che ora preferisce?"},
      {"role": "user", "content": "Alle venti e trenta, se possibile."},
      {"role": "assistant", "content": "Perfetto, ho un tavolo disponibile alle 20:30. A che nome registro la prenotazione?"},
      {"role": "user", "content": "Rossi, Marco Rossi."},
      {"role": "assistant", "content": "Eccellente, Signor Rossi. Tavolo per 4, venerdì alle 20:30. La aspettiamo!"}
    ]'::jsonb,
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '3 hours' + INTERVAL '185 seconds'
  );

  -- Call 2: English - Menu Inquiry (Tourist)
  INSERT INTO call_logs (
    restaurant_id,
    call_id,
    phone_number,
    caller_phone,
    direction,
    status,
    duration_seconds,
    language_detected,
    sentiment,
    intent,
    summary,
    transcript,
    started_at,
    ended_at
  ) VALUES (
    v_restaurant_id,
    'gli-stirati-test-002-en',
    '+39 02 1234 5678',
    '+1 415 555 0123',
    'inbound',
    'completed',
    145,
    'en',
    'positive',
    'menu_inquiry',
    'American tourist asked about vegetarian options and gluten-free pasta availability.',
    '[
      {"role": "assistant", "content": "Good evening, welcome to Gli Stirati. How may I help you?"},
      {"role": "user", "content": "Hi! Do you have any vegetarian options?"},
      {"role": "assistant", "content": "Yes, absolutely! We have risotto ai funghi porcini, melanzane alla parmigiana, and several pasta dishes that can be made vegetarian."},
      {"role": "user", "content": "Great! Do you have gluten-free pasta?"},
      {"role": "assistant", "content": "Yes, we offer gluten-free pasta for all our pasta dishes. Just let your server know when ordering."},
      {"role": "user", "content": "Perfect, thank you so much!"},
      {"role": "assistant", "content": "You are welcome! We hope to see you soon at Gli Stirati."}
    ]'::jsonb,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours' + INTERVAL '145 seconds'
  );

  -- Call 3: German - Hours and Location
  INSERT INTO call_logs (
    restaurant_id,
    call_id,
    phone_number,
    caller_phone,
    direction,
    status,
    duration_seconds,
    language_detected,
    sentiment,
    intent,
    summary,
    transcript,
    started_at,
    ended_at
  ) VALUES (
    v_restaurant_id,
    'gli-stirati-test-003-de',
    '+39 02 1234 5678',
    '+49 89 1234 5678',
    'inbound',
    'completed',
    95,
    'de',
    'neutral',
    'hours',
    'German speaker asked about opening hours and location. AI responded in German.',
    '[
      {"role": "assistant", "content": "Guten Abend, willkommen bei Gli Stirati. Wie kann ich Ihnen helfen?"},
      {"role": "user", "content": "Guten Abend! Wann haben Sie heute geöffnet?"},
      {"role": "assistant", "content": "Wir haben heute von 12:00 bis 15:00 Uhr zum Mittagessen geöffnet und von 19:00 bis 23:00 Uhr zum Abendessen."},
      {"role": "user", "content": "Und wo genau sind Sie?"},
      {"role": "assistant", "content": "Wir befinden uns in der Via Roma 42, im Zentrum von Milano, in der Nähe des Duomo."},
      {"role": "user", "content": "Danke schön!"},
      {"role": "assistant", "content": "Gern geschehen! Wir freuen uns auf Ihren Besuch."}
    ]'::jsonb,
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour' + INTERVAL '95 seconds'
  );

  -- Call 4: French - Complaint (Negative Sentiment)
  INSERT INTO call_logs (
    restaurant_id,
    call_id,
    phone_number,
    caller_phone,
    direction,
    status,
    duration_seconds,
    language_detected,
    sentiment,
    intent,
    summary,
    transcript,
    started_at,
    ended_at
  ) VALUES (
    v_restaurant_id,
    'gli-stirati-test-004-fr',
    '+39 02 1234 5678',
    '+33 1 42 12 34 56',
    'inbound',
    'completed',
    210,
    'fr',
    'negative',
    'complaint',
    'Client français mécontent du temps d''attente lors de sa dernière visite. AI a présenté des excuses et proposé une réduction.',
    '[
      {"role": "assistant", "content": "Bonsoir, bienvenue chez Gli Stirati. Comment puis-je vous aider?"},
      {"role": "user", "content": "Bonsoir. Je voudrais me plaindre de ma dernière visite. Nous avons attendu 45 minutes pour notre plat principal!"},
      {"role": "assistant", "content": "Je suis vraiment désolé pour cette expérience. Ce n''est pas du tout acceptable et je comprends votre frustration."},
      {"role": "user", "content": "C''était très décevant car la nourriture était excellente, mais le service était trop lent."},
      {"role": "assistant", "content": "Merci pour ce retour. Puis-je vous offrir une réduction de 20% sur votre prochaine visite pour nous excuser?"},
      {"role": "user", "content": "D''accord, c''est gentil. J''espère que ce sera mieux la prochaine fois."},
      {"role": "assistant", "content": "Je vous assure que nous ferons tout notre possible. Je note votre numéro pour la réduction. À bientôt!"}
    ]'::jsonb,
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '30 minutes' + INTERVAL '210 seconds'
  );

  RAISE NOTICE 'Successfully inserted 4 multilingual test calls for Gli Stirati';

END $$;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================
-- Run this to verify the test data was inserted correctly:

SELECT
  cl.call_id,
  cl.language_detected AS lang,
  cl.sentiment,
  cl.intent,
  cl.duration_seconds AS duration,
  cl.started_at,
  r.name AS restaurant
FROM call_logs cl
JOIN restaurants r ON r.id = cl.restaurant_id
WHERE cl.call_id LIKE 'gli-stirati-test-%'
ORDER BY cl.started_at DESC;

-- ============================================================
-- CLEANUP SCRIPT (run separately to remove test data)
-- ============================================================
-- DELETE FROM call_logs WHERE call_id LIKE 'gli-stirati-test-%';
-- DELETE FROM restaurants WHERE slug = 'gli-stirati';
