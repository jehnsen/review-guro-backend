-- CreateTable
CREATE TABLE "daily_practice_usage" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "questions_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_practice_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_practice_usage_user_id_date_idx" ON "daily_practice_usage"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_practice_usage_user_id_date_key" ON "daily_practice_usage"("user_id", "date");
