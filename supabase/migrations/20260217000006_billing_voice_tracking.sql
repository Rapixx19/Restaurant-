-- ============================================================
-- ADD VOICE TRACKING ALERT TYPES
-- ============================================================
-- Extend billing_alerts to track voice minute tracking failures

-- Drop and recreate the check constraint to add new alert types
ALTER TABLE billing_alerts
  DROP CONSTRAINT IF EXISTS billing_alerts_alert_type_check;

ALTER TABLE billing_alerts
  ADD CONSTRAINT billing_alerts_alert_type_check
  CHECK (alert_type IN (
    'payment_failed',
    'subscription_canceled',
    'subscription_past_due',
    'approaching_limit',
    'limit_reached',
    'subscription_renewed',
    'voice_tracking_failed',
    'voice_limit_warning',
    'voice_limit_exceeded'
  ));
