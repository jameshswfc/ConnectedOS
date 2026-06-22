ALTER TABLE "project_task_dependencies"
ADD COLUMN IF NOT EXISTS "lag_days" INTEGER NOT NULL DEFAULT 0;
