ALTER TABLE "presentation_assignments"
  ALTER COLUMN "abstractId" DROP NOT NULL;

ALTER TABLE "presentation_assignments"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "speakerName" TEXT,
  ADD COLUMN "speakerAffiliation" TEXT;
