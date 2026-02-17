-- ============================================================
-- SUPPORT-LED ONBOARDING SCRIPT
-- ============================================================
-- Use this script to onboard new multi-tenant clients.
-- Replace the placeholder values with actual client data.

-- ============================================================
-- STEP 1: ONBOARD NEW CLIENT
-- ============================================================
-- This creates: Organization + Restaurant + Menu (if template used)
-- Status will be 'pending' until support activates.

SELECT * FROM support_onboard_client(
  -- REQUIRED: Owner UUID from auth.users
  p_owner_id := '00000000-0000-0000-0000-000000000000'::uuid,

  -- REQUIRED: Plan tier (starter, professional, enterprise)
  p_plan_name := 'starter',

  -- REQUIRED: Restaurant details
  p_restaurant_name := 'Ristorante Example',
  p_restaurant_slug := 'ristorante-example',

  -- OPTIONAL: Contact info
  p_restaurant_phone := '+39 06 1234567',
  p_restaurant_email := 'info@example.com',
  p_city := 'Rome',

  -- OPTIONAL: Voice configuration
  p_primary_language := 'it',
  p_voice_preset := 'italian-elegant',

  -- OPTIONAL: Policies
  p_opening_hours := 'Tuesday-Sunday 18:00-23:00, Closed Monday',
  p_grace_period_minutes := 15,
  p_delivery_minimum_eur := 50.00,

  -- OPTIONAL: Menu template (null for empty menu)
  p_menu_template := 'italian-fine-dining'
);

-- ============================================================
-- STEP 2: VERIFY ONBOARDING
-- ============================================================
-- Check that all data was created correctly

-- View the new restaurant
SELECT
  r.id,
  r.name,
  r.status,
  r.settings->'voice'->>'primaryLanguage' as language,
  r.settings->'voice'->>'elevenLabsVoiceId' as voice_id,
  o.name as org_name,
  p.name as plan_name
FROM restaurants r
JOIN organizations o ON r.organization_id = o.id
LEFT JOIN plan_configs p ON o.plan_id = p.id
WHERE r.slug = 'ristorante-example';

-- View menu categories
SELECT id, name, sort_order
FROM menu_categories
WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'ristorante-example')
ORDER BY sort_order;

-- View menu items count
SELECT COUNT(*) as total_items
FROM menu_items
WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'ristorante-example');

-- ============================================================
-- STEP 3: ACTIVATE RESTAURANT (After assigning Twilio number)
-- ============================================================
-- Call this AFTER you've created the Vapi assistant and phone number

SELECT support_activate_restaurant(
  -- Restaurant ID from step 1 output
  p_restaurant_id := '00000000-0000-0000-0000-000000000000'::uuid,

  -- REQUIRED: Vapi phone number ID (from Vapi dashboard)
  p_vapi_phone_number_id := 'pn_xxxxxxxxxxxxxxxx',

  -- OPTIONAL: Vapi assistant ID (if pre-created)
  p_vapi_assistant_id := NULL
);

-- Verify activation
SELECT
  id,
  name,
  status,
  settings->'voice'->>'enabled' as voice_enabled,
  settings->'voice'->>'vapiPhoneNumberId' as phone_number_id
FROM restaurants
WHERE slug = 'ristorante-example';

-- ============================================================
-- VOICE PRESETS REFERENCE
-- ============================================================
-- Available voice presets for p_voice_preset parameter:

SELECT name, description, language, style, recommended_for
FROM voice_presets
ORDER BY language, name;

-- ============================================================
-- MENU TEMPLATES REFERENCE
-- ============================================================
-- Available menu templates for p_menu_template parameter:

SELECT name, cuisine_type, description
FROM menu_templates;

-- ============================================================
-- PLAN TIERS REFERENCE
-- ============================================================
-- Available plans for p_plan_name parameter:

SELECT
  name,
  display_name,
  price_eur,
  location_limit,
  minute_limit
FROM plan_configs
WHERE is_active = true
ORDER BY sort_order;
