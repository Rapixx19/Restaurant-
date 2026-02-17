-- ============================================================
-- BILLING ALERTS & ENTERPRISE PRICING
-- ============================================================
-- Track billing events and allow nullable pricing for Enterprise

-- ============================================================
-- MAKE price_eur NULLABLE FOR ENTERPRISE "CONTACT US" PRICING
-- ============================================================
ALTER TABLE plan_configs
  ALTER COLUMN price_eur DROP NOT NULL;

-- Update Enterprise plan to have NULL price (Contact Us)
UPDATE plan_configs
SET price_eur = NULL
WHERE name = 'enterprise';

-- ============================================================
-- BILLING ALERTS TABLE
-- ============================================================
-- Tracks billing events like failed payments, subscription changes, etc.
CREATE TABLE IF NOT EXISTS billing_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'payment_failed',
    'subscription_canceled',
    'subscription_past_due',
    'approaching_limit',
    'limit_reached',
    'subscription_renewed'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')) DEFAULT 'warning',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  stripe_event_id TEXT,
  stripe_invoice_id TEXT,
  amount_due DECIMAL(10, 2),
  currency TEXT DEFAULT 'eur',
  metadata JSONB DEFAULT '{}'::jsonb,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_billing_alerts_org ON billing_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_type ON billing_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_unacknowledged ON billing_alerts(organization_id, acknowledged_at)
  WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_billing_alerts_stripe_event ON billing_alerts(stripe_event_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE billing_alerts ENABLE ROW LEVEL SECURITY;

-- Organization owners and admins can view billing alerts
CREATE POLICY "Org owners can view billing alerts"
  ON billing_alerts FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Only owners can acknowledge alerts
CREATE POLICY "Org owners can acknowledge billing alerts"
  ON billing_alerts FOR UPDATE
  USING (
    organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- System can insert alerts (via service role)
CREATE POLICY "Service role can insert billing alerts"
  ON billing_alerts FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- HELPER FUNCTION: Create billing alert
-- ============================================================
CREATE OR REPLACE FUNCTION create_billing_alert(
  p_organization_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_message TEXT,
  p_stripe_event_id TEXT DEFAULT NULL,
  p_stripe_invoice_id TEXT DEFAULT NULL,
  p_amount_due DECIMAL DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO billing_alerts (
    organization_id,
    alert_type,
    severity,
    title,
    message,
    stripe_event_id,
    stripe_invoice_id,
    amount_due,
    metadata
  )
  VALUES (
    p_organization_id,
    p_alert_type,
    p_severity,
    p_title,
    p_message,
    p_stripe_event_id,
    p_stripe_invoice_id,
    p_amount_due,
    p_metadata
  )
  RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
GRANT ALL ON billing_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION create_billing_alert TO authenticated;
