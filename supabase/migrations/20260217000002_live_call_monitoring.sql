-- ============================================================
-- LIVE CALL MONITORING ENHANCEMENT
-- ============================================================
-- Updates status constraint to include 'active' for live call monitoring

-- Drop and recreate the status check constraint to include 'active'
ALTER TABLE call_logs DROP CONSTRAINT IF EXISTS call_logs_status_check;

ALTER TABLE call_logs ADD CONSTRAINT call_logs_status_check
  CHECK (status IN ('active', 'ringing', 'in-progress', 'completed', 'failed', 'no-answer'));

-- Add index for active calls (optimized for realtime queries)
CREATE INDEX IF NOT EXISTS idx_call_logs_active ON call_logs(restaurant_id, status)
  WHERE status = 'active';

-- Ensure realtime is enabled (idempotent - may already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'call_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;
  END IF;
END $$;

-- Comment for documentation
COMMENT ON COLUMN call_logs.status IS 'Call status: active (live), ringing, in-progress, completed, failed, no-answer';
