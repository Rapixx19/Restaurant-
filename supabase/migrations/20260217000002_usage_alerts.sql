-- ============================================================
-- USAGE ALERTS TABLE
-- ============================================================
-- Tracks usage warnings and overages for billing/dashboard display

CREATE TABLE IF NOT EXISTS usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Alert details
  type TEXT NOT NULL CHECK (type IN ('warning', 'overage')),
  resource TEXT NOT NULL CHECK (resource IN ('voice_minutes', 'locations', 'chat_messages')),

  -- Usage at time of alert
  current_usage INTEGER NOT NULL,
  limit_amount INTEGER NOT NULL,
  percent_used DECIMAL(5,2) NOT NULL,

  -- Status
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_alerts_org ON usage_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_created ON usage_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_unacknowledged ON usage_alerts(organization_id, acknowledged) WHERE acknowledged = false;

-- Enable RLS
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own org alerts"
  ON usage_alerts FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can acknowledge own org alerts"
  ON usage_alerts FOR UPDATE
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Service role can manage all alerts
CREATE POLICY "Service role can manage alerts"
  ON usage_alerts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
