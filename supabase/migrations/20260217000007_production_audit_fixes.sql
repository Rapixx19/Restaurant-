-- ============================================================
-- PRODUCTION AUDIT FIXES
-- ============================================================
-- Addresses findings from Senior DBA audit:
-- 1. JSONB index for vapi_phone_number_id telephony bridge lookup
-- 2. RLS policy hardening for billing_alerts
-- 3. Missing indexes on organization_id and created_at
-- 4. caller_phone column for call_logs (realtime monitoring)
-- 5. recording_url column for call_logs

-- ============================================================
-- 1. TELEPHONY BRIDGE: INDEX FOR vapi_phone_number_id LOOKUP
-- ============================================================
-- The telephony bridge queries: settings->'voice'->>'vapiPhoneNumberId'
-- Without an index, this is a full table scan on every incoming call

-- Create a functional index on the JSONB path for fast lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_vapi_phone_number_id
  ON restaurants ((settings->'voice'->>'vapiPhoneNumberId'))
  WHERE settings->'voice'->>'vapiPhoneNumberId' IS NOT NULL;

COMMENT ON INDEX idx_restaurants_vapi_phone_number_id IS
  'Enables fast lookup of restaurant by Vapi phone number ID for telephony bridge';

-- ============================================================
-- 2. RLS POLICY HARDENING: billing_alerts INSERT
-- ============================================================
-- Current policy: WITH CHECK (true) - allows anyone to insert
-- Fix: Only service_role can insert billing alerts

DROP POLICY IF EXISTS "Service role can insert billing alerts" ON billing_alerts;

CREATE POLICY "Service role can insert billing alerts"
  ON billing_alerts FOR INSERT
  WITH CHECK (
    -- Only service_role can insert billing alerts (webhooks use service_role key)
    (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

-- ============================================================
-- 3. MISSING INDEXES: organization_id and created_at
-- ============================================================
-- Dashboard sorting and filtering requires efficient queries on these columns

-- call_logs: add organization-level index via restaurant join is already efficient
-- but add created_at index for better sorting performance
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);

-- reservations: ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_reservations_restaurant ON reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON reservations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);

-- orders: ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- menu_items: ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);

-- menu_categories: ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON menu_categories(restaurant_id);

-- ============================================================
-- 4. CALL_LOGS SCHEMA COMPLETION
-- ============================================================
-- Add missing columns for complete call tracking

-- caller_phone: Distinct from phone_number (the restaurant's number)
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS caller_phone TEXT;

-- recording_url: Store the Vapi recording URL
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- Create index for phone lookup (useful for customer history)
CREATE INDEX IF NOT EXISTS idx_call_logs_caller_phone ON call_logs(caller_phone)
  WHERE caller_phone IS NOT NULL;

-- ============================================================
-- 5. PLAN CONFIGURATION UPDATES
-- ============================================================
-- Ensure plan names and pricing match business requirements
-- Note: Using friendly display names, internal names remain lowercase

-- Update display names to match UI requirements
UPDATE plan_configs SET display_name = 'Bistro' WHERE name = 'starter';
UPDATE plan_configs SET display_name = 'Culinary' WHERE name = 'professional';
UPDATE plan_configs SET display_name = 'Franchise' WHERE name = 'enterprise';

-- Verify pricing (idempotent updates)
UPDATE plan_configs SET price_eur = 0, location_limit = 1, minute_limit = 50 WHERE name = 'free';
UPDATE plan_configs SET price_eur = 29, location_limit = 1, minute_limit = 200 WHERE name = 'starter';
UPDATE plan_configs SET price_eur = 79, location_limit = 3, minute_limit = 500 WHERE name = 'professional';
UPDATE plan_configs SET price_eur = NULL, location_limit = 10, minute_limit = 2000 WHERE name = 'enterprise';

-- ============================================================
-- 6. ATOMIC VOICE MINUTES INCREMENT (VALIDATION)
-- ============================================================
-- Ensure the increment_voice_minutes function uses atomic update
-- This prevents race conditions during simultaneous calls

CREATE OR REPLACE FUNCTION increment_voice_minutes(
  p_organization_id UUID,
  p_minutes INTEGER
)
RETURNS void AS $$
BEGIN
  -- ATOMIC: Increment in single statement to prevent race conditions
  -- This ensures correct billing even with simultaneous call completions
  UPDATE organizations
  SET
    voice_minutes_used = voice_minutes_used + p_minutes,
    updated_at = now()
  WHERE id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_voice_minutes IS
  'Atomically increment voice minutes used. SECURITY DEFINER allows webhook to update.';

-- ============================================================
-- 7. SERVICE ROLE VALIDATION
-- ============================================================
-- Ensure service_role policies are correctly configured for webhooks

-- call_logs: service role needs full access for Vapi webhooks
DROP POLICY IF EXISTS "Service role can manage call logs" ON call_logs;
CREATE POLICY "Service role can manage call logs"
  ON call_logs FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

-- usage_alerts: service role needs full access
DROP POLICY IF EXISTS "Service role can manage alerts" ON usage_alerts;
CREATE POLICY "Service role can manage alerts"
  ON usage_alerts FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

-- ============================================================
-- 8. GRANT PERMISSIONS
-- ============================================================
-- Ensure functions are callable by authenticated users (for billing display)
GRANT EXECUTE ON FUNCTION increment_voice_minutes TO service_role;

-- ============================================================
-- AUDIT COMPLETE
-- ============================================================
-- Summary of fixes:
-- [x] JSONB index for telephony bridge (vapi_phone_number_id lookup)
-- [x] RLS hardening for billing_alerts (service_role only insert)
-- [x] Missing indexes on created_at, restaurant_id columns
-- [x] caller_phone and recording_url columns for call_logs
-- [x] Plan display names updated to Bistro/Culinary/Franchise
-- [x] Atomic voice minutes increment function
-- [x] Service role policy validation
