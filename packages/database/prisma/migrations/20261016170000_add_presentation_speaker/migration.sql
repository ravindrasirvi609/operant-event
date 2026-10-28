ALTER TABLE "presentation_assignments"
ADD COLUMN "speakerId" TEXT;

CREATE INDEX "presentation_assignments_speakerId_idx"
ON "presentation_assignments"("speakerId");

ALTER TABLE "presentation_assignments"
ADD CONSTRAINT "presentation_assignments_speakerId_fkey"
FOREIGN KEY ("speakerId")
REFERENCES "speakers"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;