-- The community edition has no subscriptions, plans, payment events, or plan-based limits.
-- Keep earlier billing migrations in history for existing installations, but remove their schema objects.
DROP TABLE IF EXISTS "SubscriptionEvent";
DROP TABLE IF EXISTS "Subscription";
DROP TABLE IF EXISTS "ActiveVoiceSession";
DROP TABLE IF EXISTS "PaddleWebhookEvent";
ALTER TABLE "Network" DROP COLUMN IF EXISTS "backendLimit";
DROP TYPE IF EXISTS "BillingPlan";
DROP TYPE IF EXISTS "SubscriptionStatus";
