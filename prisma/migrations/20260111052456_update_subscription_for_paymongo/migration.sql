-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "payment_provider" VARCHAR(20) NOT NULL DEFAULT 'paymongo',
ADD COLUMN     "reference_number" VARCHAR(50);

-- CreateIndex
CREATE INDEX "subscriptions_reference_number_idx" ON "subscriptions"("reference_number");
