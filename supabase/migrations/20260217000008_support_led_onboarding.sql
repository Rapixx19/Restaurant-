-- ============================================================
-- SUPPORT-LED ONBOARDING INFRASTRUCTURE
-- ============================================================
-- Enables a manual verification flow where support assigns
-- Twilio numbers and activates AI hosts for new clients.

-- ============================================================
-- 1. RESTAURANT STATUS COLUMN
-- ============================================================
-- Status flow: pending → active → suspended (if needed)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'status'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN status TEXT DEFAULT 'active'
      CHECK (status IN ('pending', 'active', 'suspended'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);

COMMENT ON COLUMN restaurants.status IS
  'pending = awaiting support verification, active = fully operational, suspended = temporarily disabled';

-- ============================================================
-- 2. VOICE CONFIGURATION PRESETS
-- ============================================================
-- ElevenLabs voice IDs matched to restaurant brands

CREATE TABLE IF NOT EXISTS voice_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  eleven_labs_voice_id TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  style TEXT CHECK (style IN ('warm', 'professional', 'energetic')) DEFAULT 'professional',
  recommended_for TEXT[], -- e.g., ARRAY['italian', 'fine-dining']
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed voice presets
INSERT INTO voice_presets (name, description, eleven_labs_voice_id, voice_name, language, style, recommended_for)
VALUES
  ('italian-warm', 'Warm Italian host, perfect for trattorias', 'pNInz6obpgDQGcFmaJgB', 'Adam', 'it', 'warm', ARRAY['italian', 'casual']),
  ('italian-elegant', 'Elegant Italian host for fine dining', 'EXAVITQu4vr4xnSDxMaL', 'Bella', 'it', 'professional', ARRAY['italian', 'fine-dining']),
  ('german-professional', 'Professional German host', 'ErXwobaYiN019PkySvjV', 'Antoni', 'de', 'professional', ARRAY['german', 'fine-dining']),
  ('english-friendly', 'Friendly English host', 'pNInz6obpgDQGcFmaJgB', 'Adam', 'en', 'warm', ARRAY['english', 'casual']),
  ('english-upscale', 'Upscale English host', 'EXAVITQu4vr4xnSDxMaL', 'Bella', 'en', 'professional', ARRAY['english', 'fine-dining']),
  ('multilingual-pro', 'Multilingual professional host', 'EXAVITQu4vr4xnSDxMaL', 'Bella', 'en', 'professional', ARRAY['multilingual', 'international'])
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 3. MENU TEMPLATES FOR HIGH-END ITALIAN
-- ============================================================
-- Reusable template data for quick restaurant setup

CREATE TABLE IF NOT EXISTS menu_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  cuisine_type TEXT NOT NULL,
  description TEXT,
  categories JSONB NOT NULL DEFAULT '[]',
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- High-end Italian menu template
INSERT INTO menu_templates (name, cuisine_type, description, categories, items)
VALUES (
  'italian-fine-dining',
  'Italian',
  'Sophisticated Italian fine dining menu with seasonal ingredients',
  '[
    {"name": "Antipasti", "sort_order": 1},
    {"name": "Primi Piatti", "sort_order": 2},
    {"name": "Secondi Piatti", "sort_order": 3},
    {"name": "Contorni", "sort_order": 4},
    {"name": "Dolci", "sort_order": 5},
    {"name": "Vini", "sort_order": 6}
  ]'::jsonb,
  '[
    {"category": "Antipasti", "name": "Carpaccio di Manzo", "description": "Thinly sliced beef tenderloin with arugula, Parmigiano-Reggiano shavings, and truffle oil", "price": 18.50, "dietary_tags": ["gluten-free"]},
    {"category": "Antipasti", "name": "Burrata con Pomodorini", "description": "Creamy burrata cheese with roasted cherry tomatoes, basil pesto, and aged balsamic", "price": 16.00, "dietary_tags": ["vegetarian", "gluten-free"]},
    {"category": "Antipasti", "name": "Polpo alla Griglia", "description": "Grilled octopus with fingerling potatoes, olives, and lemon caper vinaigrette", "price": 22.00, "dietary_tags": ["gluten-free"]},
    {"category": "Primi Piatti", "name": "Risotto ai Funghi Porcini", "description": "Arborio rice with wild porcini mushrooms, white wine, and aged Parmigiano", "price": 24.00, "dietary_tags": ["vegetarian", "gluten-free"]},
    {"category": "Primi Piatti", "name": "Tagliatelle al Tartufo", "description": "House-made tagliatelle with black truffle cream sauce", "price": 32.00, "dietary_tags": ["vegetarian"]},
    {"category": "Primi Piatti", "name": "Spaghetti alle Vongole", "description": "Spaghetti with fresh clams, garlic, white wine, and chili flakes", "price": 26.00, "dietary_tags": []},
    {"category": "Secondi Piatti", "name": "Branzino al Forno", "description": "Oven-roasted Mediterranean sea bass with herbs, capers, and lemon", "price": 38.00, "dietary_tags": ["gluten-free"]},
    {"category": "Secondi Piatti", "name": "Filetto di Manzo", "description": "Grilled beef tenderloin with rosemary potatoes and truffle jus", "price": 45.00, "dietary_tags": ["gluten-free"]},
    {"category": "Secondi Piatti", "name": "Ossobuco alla Milanese", "description": "Braised veal shank with saffron risotto and gremolata", "price": 42.00, "dietary_tags": ["gluten-free"]},
    {"category": "Contorni", "name": "Verdure alla Griglia", "description": "Seasonal grilled vegetables with extra virgin olive oil", "price": 12.00, "dietary_tags": ["vegan", "gluten-free"]},
    {"category": "Contorni", "name": "Spinaci Saltati", "description": "Sautéed spinach with garlic and chili", "price": 10.00, "dietary_tags": ["vegan", "gluten-free"]},
    {"category": "Dolci", "name": "Tiramisù", "description": "Classic mascarpone and espresso-soaked ladyfingers", "price": 12.00, "dietary_tags": ["vegetarian"]},
    {"category": "Dolci", "name": "Panna Cotta", "description": "Vanilla bean panna cotta with berry compote", "price": 10.00, "dietary_tags": ["vegetarian", "gluten-free"]},
    {"category": "Dolci", "name": "Affogato", "description": "Vanilla gelato drowned in hot espresso", "price": 8.00, "dietary_tags": ["vegetarian", "gluten-free"]}
  ]'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 4. SUPPORT-LED ONBOARDING FUNCTION
-- ============================================================
-- Atomically creates org + restaurant + menu in one transaction

CREATE OR REPLACE FUNCTION support_onboard_client(
  p_owner_id UUID,
  p_plan_name TEXT,
  p_restaurant_name TEXT,
  p_restaurant_slug TEXT,
  p_restaurant_phone TEXT DEFAULT NULL,
  p_restaurant_email TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_primary_language TEXT DEFAULT 'en',
  p_voice_preset TEXT DEFAULT 'english-friendly',
  p_opening_hours TEXT DEFAULT 'Tuesday-Sunday 18:00-23:00, Closed Monday',
  p_grace_period_minutes INTEGER DEFAULT 15,
  p_delivery_minimum_eur DECIMAL DEFAULT 50.00,
  p_menu_template TEXT DEFAULT NULL
)
RETURNS TABLE (
  organization_id UUID,
  restaurant_id UUID,
  categories_created INTEGER,
  items_created INTEGER
) AS $$
DECLARE
  v_org_id UUID;
  v_restaurant_id UUID;
  v_plan_id UUID;
  v_voice_preset RECORD;
  v_description TEXT;
  v_settings JSONB;
  v_category_id UUID;
  v_category JSONB;
  v_item JSONB;
  v_template RECORD;
  v_categories_count INTEGER := 0;
  v_items_count INTEGER := 0;
BEGIN
  -- Get plan ID
  SELECT id INTO v_plan_id FROM plan_configs WHERE name = p_plan_name;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_name;
  END IF;

  -- Get voice preset
  SELECT * INTO v_voice_preset FROM voice_presets WHERE name = p_voice_preset;
  IF v_voice_preset IS NULL THEN
    SELECT * INTO v_voice_preset FROM voice_presets WHERE name = 'english-friendly';
  END IF;

  -- Build description with policies
  v_description := format(
    E'%s\n\n📍 Opening Hours: %s\n⏰ Grace Period: %s minutes for reservations\n🛵 Delivery Minimum: €%.2f',
    'Welcome to ' || p_restaurant_name,
    p_opening_hours,
    p_grace_period_minutes,
    p_delivery_minimum_eur
  );

  -- Build voice settings (vapiPhoneNumberId null for support assignment)
  v_settings := jsonb_build_object(
    'ai', jsonb_build_object(
      'allowReservations', true,
      'allowOrders', true,
      'customInstructions', '',
      'greeting', 'Welcome! How can I help you today?',
      'personality', 'friendly'
    ),
    'voice', jsonb_build_object(
      'enabled', false,
      'primaryLanguage', p_primary_language,
      'elevenLabsVoiceId', v_voice_preset.eleven_labs_voice_id,
      'voiceStyle', v_voice_preset.style,
      'vapiAssistantId', NULL,
      'vapiPhoneNumberId', NULL
    ),
    'capacity', jsonb_build_object(
      'maxPartySize', 12,
      'operatingHours', jsonb_build_object()
    ),
    'policies', jsonb_build_object(
      'gracePeriodMinutes', p_grace_period_minutes,
      'deliveryMinimumEur', p_delivery_minimum_eur,
      'openingHours', p_opening_hours
    )
  );

  -- Create organization (triggers auto-add to organization_members)
  INSERT INTO organizations (owner_id, name, plan_id)
  VALUES (p_owner_id, p_restaurant_name || ' Organization', v_plan_id)
  RETURNING id INTO v_org_id;

  -- Add owner to organization_members
  INSERT INTO organization_members (organization_id, user_id, role, joined_at)
  VALUES (v_org_id, p_owner_id, 'owner', now())
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  -- Create restaurant with pending status
  INSERT INTO restaurants (
    owner_id,
    organization_id,
    name,
    slug,
    description,
    phone,
    email,
    address,
    settings,
    status
  )
  VALUES (
    p_owner_id,
    v_org_id,
    p_restaurant_name,
    p_restaurant_slug,
    v_description,
    p_restaurant_phone,
    p_restaurant_email,
    CASE WHEN p_city IS NOT NULL THEN jsonb_build_object('city', p_city) ELSE '{}'::jsonb END,
    v_settings,
    'pending'
  )
  RETURNING id INTO v_restaurant_id;

  -- Populate menu from template if provided
  IF p_menu_template IS NOT NULL THEN
    SELECT * INTO v_template FROM menu_templates WHERE name = p_menu_template;

    IF v_template IS NOT NULL THEN
      -- Create categories
      FOR v_category IN SELECT * FROM jsonb_array_elements(v_template.categories)
      LOOP
        INSERT INTO menu_categories (restaurant_id, name, sort_order)
        VALUES (
          v_restaurant_id,
          v_category->>'name',
          (v_category->>'sort_order')::integer
        )
        RETURNING id INTO v_category_id;

        v_categories_count := v_categories_count + 1;

        -- Create items for this category
        FOR v_item IN
          SELECT * FROM jsonb_array_elements(v_template.items)
          WHERE v_item->>'category' = v_category->>'name'
        LOOP
          INSERT INTO menu_items (
            restaurant_id,
            category_id,
            name,
            description,
            price,
            dietary_tags,
            is_available
          )
          VALUES (
            v_restaurant_id,
            v_category_id,
            v_item->>'name',
            v_item->>'description',
            (v_item->>'price')::decimal,
            ARRAY(SELECT jsonb_array_elements_text(v_item->'dietary_tags')),
            true
          );

          v_items_count := v_items_count + 1;
        END LOOP;
      END LOOP;
    END IF;
  END IF;

  RETURN QUERY SELECT v_org_id, v_restaurant_id, v_categories_count, v_items_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION support_onboard_client IS
  'Support-led onboarding: Creates org + restaurant + menu atomically. Status=pending until support assigns phone.';

-- ============================================================
-- 5. SUPPORT ACTIVATION FUNCTION
-- ============================================================
-- Called by support to activate a pending restaurant

CREATE OR REPLACE FUNCTION support_activate_restaurant(
  p_restaurant_id UUID,
  p_vapi_phone_number_id TEXT,
  p_vapi_assistant_id TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE restaurants
  SET
    status = 'active',
    settings = settings || jsonb_build_object(
      'voice', (settings->'voice') || jsonb_build_object(
        'enabled', true,
        'vapiPhoneNumberId', p_vapi_phone_number_id,
        'vapiAssistantId', p_vapi_assistant_id
      )
    ),
    updated_at = now()
  WHERE id = p_restaurant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Restaurant not found: %', p_restaurant_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION support_activate_restaurant IS
  'Support activates a pending restaurant by assigning Vapi phone number and setting status=active.';

-- ============================================================
-- 6. GRANT PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION support_onboard_client TO service_role;
GRANT EXECUTE ON FUNCTION support_activate_restaurant TO service_role;
GRANT SELECT ON voice_presets TO authenticated;
GRANT SELECT ON menu_templates TO authenticated;
