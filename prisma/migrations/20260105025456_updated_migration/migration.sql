-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "mock_exams" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "time_limit_minutes" INTEGER NOT NULL,
    "passing_score" INTEGER NOT NULL,
    "categories" TEXT NOT NULL,
    "difficulty" "Difficulty",
    "status" "ExamStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "time_remaining_seconds" INTEGER,
    "questions" TEXT NOT NULL,
    "answers" TEXT NOT NULL DEFAULT '{}',
    "flagged_questions" TEXT NOT NULL DEFAULT '[]',
    "score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_exams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mock_exams_user_id_idx" ON "mock_exams"("user_id");

-- CreateIndex
CREATE INDEX "mock_exams_status_idx" ON "mock_exams"("status");

-- CreateIndex
CREATE INDEX "mock_exams_created_at_idx" ON "mock_exams"("created_at");

-- AddForeignKey
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
