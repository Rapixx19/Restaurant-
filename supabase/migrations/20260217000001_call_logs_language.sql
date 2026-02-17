-- ============================================================
-- MULTILINGUAL CALL LOGS ENHANCEMENT
-- ============================================================
-- Adds language detection and segmentation fields for multilingual insights

-- Add language detection fields
ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS language_detected TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS language_segments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recording_url TEXT,
  ADD COLUMN IF NOT EXISTS caller_phone TEXT;

-- language_segments structure:
-- [
--   { "start": 0, "end": 5.2, "text": "Hello, I'd like to make a reservation", "language": "en", "confidence": 0.95 },
--   { "start": 5.2, "end": 12.1, "text": "Bonjour, je voudrais réserver une table", "language": "fr", "confidence": 0.92 },
--   ...
-- ]

-- Add index for language analytics
CREATE INDEX IF NOT EXISTS idx_call_logs_language ON call_logs(language_detected);

-- Comment for documentation
COMMENT ON COLUMN call_logs.language_detected IS 'Primary language detected in the call (ISO 639-1 code)';
COMMENT ON COLUMN call_logs.language_segments IS 'Array of transcript segments with language detection per segment';
COMMENT ON COLUMN call_logs.recording_url IS 'URL to the call recording audio file';
COMMENT ON COLUMN call_logs.caller_phone IS 'Phone number of the caller';
