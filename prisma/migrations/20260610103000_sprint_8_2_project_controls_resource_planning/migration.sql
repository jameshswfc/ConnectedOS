CREATE TYPE "ProjectMilestoneStatus" AS ENUM ('not_started', 'in_progress', 'complete', 'delayed', 'cancelled');
CREATE TYPE "ProjectDeliveryStage" AS ENUM ('initiation', 'planning', 'delivery', 'validation', 'handover', 'closure');
CREATE TYPE "StageGateStatus" AS ENUM ('not_started', 'in_progress', 'complete', 'blocked');

ALTER TABLE "projects"
  ADD COLUMN "baseline_start_date" DATE,
  ADD COLUMN "baseline_end_date" DATE,
  ADD COLUMN "actual_start_date" DATE;

UPDATE "projects"
SET
  "baseline_start_date" = COALESCE("baseline_start_date", "start_date"),
  "baseline_end_date" = COALESCE("baseline_end_date", "target_end_date");

ALTER TABLE "project_resource_assignments"
  ADD COLUMN "conflict_override" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "conflict_override_note" TEXT;

CREATE TABLE "project_milestones" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "milestone_date" DATE NOT NULL,
  "status" "ProjectMilestoneStatus" NOT NULL DEFAULT 'not_started',
  "owner_id" UUID,
  "completed_at" TIMESTAMP(3),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_stage_gates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "stage" "ProjectDeliveryStage" NOT NULL,
  "status" "StageGateStatus" NOT NULL DEFAULT 'not_started',
  "completed_at" TIMESTAMP(3),
  "completed_by_id" UUID,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "project_stage_gates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_milestones_project_id_title_key" ON "project_milestones"("project_id", "title");
CREATE INDEX "project_milestones_project_id_idx" ON "project_milestones"("project_id");
CREATE INDEX "project_milestones_owner_id_idx" ON "project_milestones"("owner_id");
CREATE INDEX "project_milestones_status_idx" ON "project_milestones"("status");
CREATE INDEX "project_milestones_milestone_date_idx" ON "project_milestones"("milestone_date");
CREATE INDEX "project_milestones_deleted_at_idx" ON "project_milestones"("deleted_at");

CREATE UNIQUE INDEX "project_stage_gates_project_id_stage_key" ON "project_stage_gates"("project_id", "stage");
CREATE INDEX "project_stage_gates_project_id_idx" ON "project_stage_gates"("project_id");
CREATE INDEX "project_stage_gates_stage_idx" ON "project_stage_gates"("stage");
CREATE INDEX "project_stage_gates_status_idx" ON "project_stage_gates"("status");
CREATE INDEX "project_stage_gates_completed_by_id_idx" ON "project_stage_gates"("completed_by_id");

CREATE INDEX "projects_baseline_end_date_idx" ON "projects"("baseline_end_date");

ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_stage_gates" ADD CONSTRAINT "project_stage_gates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_stage_gates" ADD CONSTRAINT "project_stage_gates_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
