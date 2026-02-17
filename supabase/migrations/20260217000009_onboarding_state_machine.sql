-- ============================================================
-- ONBOARDING STATE MACHINE & ADMIN CONTROLS
-- ============================================================
-- Expands restaurant status to full state machine:
-- pending → reviewing → info_requested → active
-- Adds super_admin role and RLS for vapiPhoneNumberId protection

-- ============================================================
-- 1. EXPAND STATUS ENUM
-- ============================================================
-- Drop and recreate check constraint with new values

ALTER TABLE restaurants
  DROP CONSTRAINT IF EXISTS restaurants_status_check;

ALTER TABLE restaurants
  ADD CONSTRAINT restaurants_status_check
  CHECK (status IN ('pending', 'reviewing', 'info_requested', 'active', 'suspended'));

-- Update existing 'pending' records stay as 'pending' (no change needed)

COMMENT ON COLUMN restaurants.status IS
  'Onboarding state machine: pending → reviewing → info_requested → active. suspended = temporarily disabled.';

-- ============================================================
-- 2. SUPER_ADMIN ROLE TABLE
-- ============================================================
-- Tracks users with administrative privileges

CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Only super_admins can see other super_admins (bootstrap via service_role)
CREATE POLICY "Super admins can view admin list"
  ON super_admins FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Only service_role can modify admin list
CREATE POLICY "Service role manages super admins"
  ON super_admins FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

CREATE INDEX IF NOT EXISTS idx_super_admins_user ON super_admins(user_id);

-- ============================================================
-- 3. HELPER FUNCTION: Check if user is super_admin
-- ============================================================

CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admins WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_super_admin IS
  'Returns true if the user has super_admin privileges.';

-- ============================================================
-- 4. VAPI PHONE NUMBER ID PROTECTION
-- ============================================================
-- Create a function to validate vapiPhoneNumberId updates

CREATE OR REPLACE FUNCTION protect_vapi_phone_number_id()
RETURNS TRIGGER AS $$
DECLARE
  is_service_role BOOLEAN;
  is_admin BOOLEAN;
  old_phone_id TEXT;
  new_phone_id TEXT;
BEGIN
  -- Extract the vapiPhoneNumberId from old and new settings
  old_phone_id := OLD.settings->'voice'->>'vapiPhoneNumberId';
  new_phone_id := NEW.settings->'voice'->>'vapiPhoneNumberId';

  -- If vapiPhoneNumberId hasn't changed, allow the update
  IF old_phone_id IS NOT DISTINCT FROM new_phone_id THEN
    RETURN NEW;
  END IF;

  -- Check if this is service_role
  is_service_role := (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role';

  -- Check if user is super_admin
  is_admin := is_super_admin(auth.uid());

  -- Allow if service_role OR super_admin
  IF is_service_role OR is_admin THEN
    RETURN NEW;
  END IF;

  -- Deny the update - restore the old vapiPhoneNumberId
  NEW.settings := jsonb_set(
    NEW.settings,
    '{voice,vapiPhoneNumberId}',
    COALESCE(to_jsonb(old_phone_id), 'null'::jsonb)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to protect vapiPhoneNumberId
DROP TRIGGER IF EXISTS protect_vapi_phone_number_trigger ON restaurants;

CREATE TRIGGER protect_vapi_phone_number_trigger
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION protect_vapi_phone_number_id();

COMMENT ON FUNCTION protect_vapi_phone_number_id IS
  'Prevents vapiPhoneNumberId modification except by super_admin or service_role.';

-- ============================================================
-- 5. STATUS UPDATE FUNCTION (for support workflow)
-- ============================================================

CREATE OR REPLACE FUNCTION support_update_restaurant_status(
  p_restaurant_id UUID,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Validate status
  IF p_new_status NOT IN ('pending', 'reviewing', 'info_requested', 'active', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  UPDATE restaurants
  SET
    status = p_new_status,
    updated_at = now()
  WHERE id = p_restaurant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Restaurant not found: %', p_restaurant_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION support_update_restaurant_status TO service_role;

COMMENT ON FUNCTION support_update_restaurant_status IS
  'Support updates restaurant status through the onboarding state machine.';

-- ============================================================
-- 6. GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;
GRANT SELECT ON super_admins TO authenticated;
