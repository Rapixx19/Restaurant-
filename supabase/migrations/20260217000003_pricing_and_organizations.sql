-- ============================================================
-- SAAS PRICING & ORGANIZATIONS
-- ============================================================
-- Flexible pricing with plan configurations and multi-location support

-- ============================================================
-- PLAN CONFIGURATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  price_eur DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_interval TEXT CHECK (price_interval IN ('month', 'year')) DEFAULT 'month',
  location_limit INTEGER NOT NULL DEFAULT 1,
  minute_limit INTEGER NOT NULL DEFAULT 100, -- Voice AI minutes per month
  features JSONB DEFAULT '[]'::jsonb,
  stripe_price_id TEXT UNIQUE,
  stripe_product_id TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default plans
INSERT INTO plan_configs (name, display_name, description, price_eur, location_limit, minute_limit, features, sort_order)
VALUES
  ('free', 'Free', 'Perfect for trying out VECTERAI', 0, 1, 50, '["Chat widget", "Basic reservations", "50 voice minutes/month"]', 0),
  ('starter', 'Starter', 'For small restaurants getting started', 29, 1, 200, '["Everything in Free", "200 voice minutes/month", "Email notifications", "Basic analytics"]', 1),
  ('professional', 'Professional', 'For growing restaurants', 79, 3, 500, '["Everything in Starter", "Up to 3 locations", "500 voice minutes/month", "SMS notifications", "Advanced analytics", "Priority support"]', 2),
  ('enterprise', 'Enterprise', 'For restaurant groups', 199, 10, 2000, '["Everything in Professional", "Up to 10 locations", "2000 voice minutes/month", "Custom integrations", "Dedicated support", "SLA guarantee"]', 3)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan_id UUID REFERENCES plan_configs(id),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')) DEFAULT 'active',
  voice_minutes_used INTEGER NOT NULL DEFAULT 0,
  voice_minutes_reset_at TIMESTAMPTZ DEFAULT now(),
  billing_email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create slug from name
CREATE OR REPLACE FUNCTION generate_org_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_slug_trigger
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION generate_org_slug();

-- ============================================================
-- UPDATE RESTAURANTS TABLE
-- ============================================================
-- Add organization_id to restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_restaurants_organization ON restaurants(organization_id);

-- ============================================================
-- ORGANIZATION MEMBERS (for future team features)
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'manager', 'viewer')) DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE plan_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Plan configs: Everyone can read active plans
CREATE POLICY "Anyone can view active plans"
  ON plan_configs FOR SELECT
  USING (is_active = true);

-- Organizations: Owners and members can view
CREATE POLICY "Users can view their own organizations"
  ON organizations FOR SELECT
  USING (
    owner_id = auth.uid() OR
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their organizations"
  ON organizations FOR DELETE
  USING (owner_id = auth.uid());

-- Organization members: Visible to org members
CREATE POLICY "Org members can view membership"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org owners can manage members"
  ON organization_members FOR ALL
  USING (
    organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- Update restaurants RLS to include organization membership
DROP POLICY IF EXISTS "Users can view own restaurants" ON restaurants;
CREATE POLICY "Users can view own restaurants"
  ON restaurants FOR SELECT
  USING (
    owner_id = auth.uid() OR
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Updated_at triggers
CREATE TRIGGER plan_configs_updated_at
  BEFORE UPDATE ON plan_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VOICE MINUTES TRACKING FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION increment_voice_minutes(
  p_organization_id UUID,
  p_minutes INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE organizations
  SET voice_minutes_used = voice_minutes_used + p_minutes
  WHERE id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset voice minutes monthly (to be called by a cron job)
CREATE OR REPLACE FUNCTION reset_monthly_voice_minutes()
RETURNS void AS $$
BEGIN
  UPDATE organizations
  SET
    voice_minutes_used = 0,
    voice_minutes_reset_at = now()
  WHERE voice_minutes_reset_at < now() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- HELPER FUNCTION: Auto-create organization on first restaurant
-- ============================================================
CREATE OR REPLACE FUNCTION auto_create_organization()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_free_plan_id UUID;
BEGIN
  -- Only proceed if no organization_id is set
  IF NEW.organization_id IS NULL THEN
    -- Check if user already has an organization
    SELECT id INTO v_org_id FROM organizations WHERE owner_id = NEW.owner_id LIMIT 1;

    IF v_org_id IS NULL THEN
      -- Get the free plan
      SELECT id INTO v_free_plan_id FROM plan_configs WHERE name = 'free' LIMIT 1;

      -- Create a new organization
      INSERT INTO organizations (owner_id, name, plan_id)
      VALUES (NEW.owner_id, NEW.name || ' Organization', v_free_plan_id)
      RETURNING id INTO v_org_id;

      -- Add owner as member
      INSERT INTO organization_members (organization_id, user_id, role, joined_at)
      VALUES (v_org_id, NEW.owner_id, 'owner', now());
    END IF;

    -- Set the organization_id
    NEW.organization_id := v_org_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER restaurants_auto_org_trigger
  BEFORE INSERT ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_organization();

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON plan_configs TO authenticated;
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organization_members TO authenticated;
