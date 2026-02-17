-- ============================================================
-- SECURITY FIX: Update call_logs RLS to include organization members
-- ============================================================
-- The original policy only checked owner_id, missing organization membership

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view own restaurant call logs" ON call_logs;

-- Create updated policy that includes organization membership
CREATE POLICY "Users can view own restaurant call logs"
  ON call_logs FOR SELECT
  USING (
    restaurant_id IN (
      -- Direct ownership
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
    OR
    restaurant_id IN (
      -- Organization ownership: user owns the organization
      SELECT r.id FROM restaurants r
      JOIN organizations o ON r.organization_id = o.id
      WHERE o.owner_id = auth.uid()
    )
    OR
    restaurant_id IN (
      -- Organization membership: user is a member of the organization
      SELECT r.id FROM restaurants r
      JOIN organization_members om ON r.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- ============================================================
-- SECURITY FIX: Update usage_alerts RLS for organization members
-- ============================================================
-- Allow organization members (not just owners) to view alerts

DROP POLICY IF EXISTS "Users can view own org alerts" ON usage_alerts;

CREATE POLICY "Users can view own org alerts"
  ON usage_alerts FOR SELECT
  USING (
    -- Organization owner
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR
    -- Organization member
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Note: Only owners can acknowledge alerts (existing policy is correct)
