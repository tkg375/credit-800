-- Idempotency table for Stripe webhook events
CREATE TABLE IF NOT EXISTS stripe_processed_events (
  event_id TEXT PRIMARY KEY,
  processed_at INTEGER NOT NULL
);
