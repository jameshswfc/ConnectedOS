ALTER TYPE "OpportunityType" ADD VALUE IF NOT EXISTS 'marriott_gpns';

ALTER TABLE "projects" ADD COLUMN "project_type" "OpportunityType" NOT NULL DEFAULT 'other';

CREATE INDEX "projects_project_type_idx" ON "projects"("project_type");
