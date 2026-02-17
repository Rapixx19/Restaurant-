-- ============================================================
-- PHASE 10: CALL LOGS FOR VOICE INTEGRATION
-- ============================================================
-- Stores Vapi call transcripts and metadata for the Activity Feed

-- Call logs table
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Vapi identifiers
  call_id TEXT UNIQUE NOT NULL,
  assistant_id TEXT,

  -- Call metadata
  phone_number TEXT,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')) DEFAULT 'inbound',
  status TEXT CHECK (status IN ('ringing', 'in-progress', 'completed', 'failed', 'no-answer')) DEFAULT 'in-progress',

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Transcript
  transcript JSONB DEFAULT '[]'::jsonb,
  summary TEXT,

  -- Outcomes
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Customer info extracted from call
  customer_name TEXT,
  customer_phone TEXT,

  -- AI analysis
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  intent TEXT, -- e.g., 'reservation', 'menu_inquiry', 'hours', 'complaint'

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_call_logs_restaurant ON call_logs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_id ON call_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON call_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_phone ON call_logs(phone_number);

-- Enable RLS
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own restaurant call logs"
  ON call_logs FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage call logs"
  ON call_logs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated_at trigger
CREATE TRIGGER call_logs_updated_at
  BEFORE UPDATE ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for call logs (for live dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;

-- ============================================================
-- ADD VOICE SETTINGS TO RESTAURANTS
-- ============================================================
-- Note: Voice settings are stored in the existing settings JSONB column
-- Structure:
-- {
--   "voice": {
--     "vapiAssistantId": "string",
--     "voiceStyle": "warm" | "professional" | "energetic",
--     "smsOnCompletion": boolean,
--     "enabled": boolean
--   }
-- }
