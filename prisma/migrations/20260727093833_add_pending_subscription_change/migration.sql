-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "pendingConcurrentLimit" INTEGER,
ADD COLUMN     "pendingEffectiveAt" TIMESTAMP(3),
ADD COLUMN     "pendingPlan" "BillingPlan";
