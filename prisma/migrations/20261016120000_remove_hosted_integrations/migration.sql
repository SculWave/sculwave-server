-- Remove hosted identity and Paddle-only persistence from the self-hosted edition.
ALTER TABLE "User" RENAME COLUMN "firebaseUid" TO "localUid";
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "paddleSubscriptionId";
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "paddleCustomerId";
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "paddlePriceId";
DROP TABLE IF EXISTS "PaddleWebhookEvent";
