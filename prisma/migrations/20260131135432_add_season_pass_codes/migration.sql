-- CreateTable
CREATE TABLE "season_pass_codes" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "is_redeemed" BOOLEAN NOT NULL DEFAULT false,
    "redeemed_by" UUID,
    "redeemed_at" TIMESTAMP(3),
    "created_by" UUID,
    "batch_id" VARCHAR(50),
    "expires_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "season_pass_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "season_pass_codes_code_key" ON "season_pass_codes"("code");

-- CreateIndex
CREATE INDEX "season_pass_codes_code_idx" ON "season_pass_codes"("code");

-- CreateIndex
CREATE INDEX "season_pass_codes_is_redeemed_idx" ON "season_pass_codes"("is_redeemed");

-- CreateIndex
CREATE INDEX "season_pass_codes_batch_id_idx" ON "season_pass_codes"("batch_id");
