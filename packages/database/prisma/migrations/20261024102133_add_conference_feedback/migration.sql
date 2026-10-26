-- DropForeignKey
ALTER TABLE "presentation_assignments" DROP CONSTRAINT "presentation_assignments_abstractId_fkey";

-- CreateTable
CREATE TABLE "conference_feedback" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "contentRating" TEXT NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conference_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conference_feedback_userId_idx" ON "conference_feedback"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "conference_feedback_conferenceId_userId_key" ON "conference_feedback"("conferenceId", "userId");

-- AddForeignKey
ALTER TABLE "presentation_assignments" ADD CONSTRAINT "presentation_assignments_abstractId_fkey" FOREIGN KEY ("abstractId") REFERENCES "abstracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_feedback" ADD CONSTRAINT "conference_feedback_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_feedback" ADD CONSTRAINT "conference_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
