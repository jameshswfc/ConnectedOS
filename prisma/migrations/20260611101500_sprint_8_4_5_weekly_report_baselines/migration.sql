-- AlterTable
ALTER TABLE "project_milestones"
  ADD COLUMN "baseline_date" DATE,
  ADD COLUMN "manual_date_override" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "project_tasks"
  ADD COLUMN "baseline_end_date" DATE,
  ADD COLUMN "baseline_estimated_days" DECIMAL(8,2),
  ADD COLUMN "baseline_start_date" DATE;

-- AlterTable
ALTER TABLE "projects"
  ADD COLUMN "plan_baselined_at" TIMESTAMP(3),
  ADD COLUMN "plan_baselined_by_id" UUID;

-- CreateIndex
CREATE INDEX "project_tasks_baseline_end_date_idx" ON "project_tasks"("baseline_end_date");

-- CreateIndex
CREATE INDEX "projects_plan_baselined_by_id_idx" ON "projects"("plan_baselined_by_id");

-- AddForeignKey
ALTER TABLE "projects"
  ADD CONSTRAINT "projects_plan_baselined_by_id_fkey"
  FOREIGN KEY ("plan_baselined_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
