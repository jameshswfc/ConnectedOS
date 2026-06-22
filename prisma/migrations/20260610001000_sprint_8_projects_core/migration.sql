-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'initiation', 'planning', 'active', 'on_hold', 'at_risk', 'completed', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProjectRagStatus" AS ENUM ('green', 'amber', 'red');

-- CreateEnum
CREATE TYPE "ProjectTaskStatus" AS ENUM ('not_started', 'in_progress', 'blocked', 'complete', 'cancelled');

-- CreateEnum
CREATE TYPE "ProjectDependencyType" AS ENUM ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish');

-- CreateEnum
CREATE TYPE "ProjectResourceRole" AS ENUM ('project_manager', 'technical_lead', 'project_engineer', 'field_engineer', 'pre_sales_engineer', 'other');

-- CreateEnum
CREATE TYPE "ProjectActivityType" AS ENUM ('call', 'email', 'meeting', 'site_visit', 'note', 'task', 'handover', 'customer_update');

-- CreateEnum
CREATE TYPE "ProjectIssueActionType" AS ENUM ('issue', 'action', 'risk', 'decision');

-- CreateEnum
CREATE TYPE "ProjectIssueActionStatus" AS ENUM ('open', 'in_progress', 'blocked', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "ProjectDocumentType" AS ENUM ('daily_update', 'weekly_update', 'implementation_document', 'change_request', 'closure_form', 'support_handover', 'issue_action_export', 'other');

-- CreateEnum
CREATE TYPE "ProjectFinancialEntryType" AS ENUM ('invoice', 'payment', 'cost', 'purchase_order_placeholder');

-- CreateEnum
CREATE TYPE "ProjectFinancialEntryStatus" AS ENUM ('planned', 'raised', 'paid', 'collected', 'cancelled');

-- CreateEnum
CREATE TYPE "ProjectFormType" AS ENUM ('daily_update', 'weekly_update', 'implementation_document', 'change_request', 'closure', 'support_handover');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "quote_version_id" UUID NOT NULL,
    "presales_request_id" UUID,
    "project_manager_id" UUID,
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "rag_status" "ProjectRagStatus" NOT NULL DEFAULT 'green',
    "start_date" DATE,
    "target_end_date" DATE,
    "actual_end_date" DATE,
    "description" TEXT,
    "scope_summary" TEXT,
    "commercial_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "budget_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "budget_sell" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_terms" TEXT,
    "invoiced_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "collected_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstanding_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_resource_days_budget" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "total_resource_days_scheduled" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "total_resource_days_used" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" UUID,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectTaskStatus" NOT NULL DEFAULT 'not_started',
    "owner_id" UUID,
    "assigned_to_id" UUID,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "estimated_days" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "actual_days" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_task_dependencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "predecessor_task_id" UUID NOT NULL,
    "successor_task_id" UUID NOT NULL,
    "dependency_type" "ProjectDependencyType" NOT NULL DEFAULT 'finish_to_start',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_resource_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ProjectResourceRole" NOT NULL DEFAULT 'project_engineer',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "scheduled_days" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "used_days" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "project_resource_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "activity_type" "ProjectActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" UUID,
    "assigned_to_id" UUID,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "outcome" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "project_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_issue_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "type" "ProjectIssueActionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" UUID,
    "status" "ProjectIssueActionStatus" NOT NULL DEFAULT 'open',
    "priority" "ProjectPriority" NOT NULL DEFAULT 'normal',
    "due_date" DATE,
    "closed_at" TIMESTAMP(3),
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "project_issue_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_document_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "document_type" "ProjectDocumentType" NOT NULL DEFAULT 'other',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_document_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_financial_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "type" "ProjectFinancialEntryType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ProjectFinancialEntryStatus" NOT NULL DEFAULT 'planned',
    "reference" TEXT,
    "expected_date" DATE,
    "actual_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_financial_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_forms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "form_type" "ProjectFormType" NOT NULL,
    "title" TEXT NOT NULL,
    "prepared_by_id" UUID,
    "form_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "project_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_task_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "project_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_task_template_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "default_owner_role" "ProjectResourceRole",
    "offset_days_from_start" INTEGER NOT NULL DEFAULT 0,
    "default_duration_days" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_task_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_project_number_key" ON "projects"("project_number");
CREATE INDEX "projects_account_id_idx" ON "projects"("account_id");
CREATE INDEX "projects_opportunity_id_idx" ON "projects"("opportunity_id");
CREATE INDEX "projects_quote_id_idx" ON "projects"("quote_id");
CREATE INDEX "projects_quote_version_id_idx" ON "projects"("quote_version_id");
CREATE INDEX "projects_presales_request_id_idx" ON "projects"("presales_request_id");
CREATE INDEX "projects_project_manager_id_idx" ON "projects"("project_manager_id");
CREATE INDEX "projects_status_idx" ON "projects"("status");
CREATE INDEX "projects_rag_status_idx" ON "projects"("rag_status");
CREATE INDEX "projects_start_date_idx" ON "projects"("start_date");
CREATE INDEX "projects_target_end_date_idx" ON "projects"("target_end_date");
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");

CREATE INDEX "project_tasks_project_id_idx" ON "project_tasks"("project_id");
CREATE INDEX "project_tasks_owner_id_idx" ON "project_tasks"("owner_id");
CREATE INDEX "project_tasks_assigned_to_id_idx" ON "project_tasks"("assigned_to_id");
CREATE INDEX "project_tasks_status_idx" ON "project_tasks"("status");
CREATE INDEX "project_tasks_start_date_idx" ON "project_tasks"("start_date");
CREATE INDEX "project_tasks_end_date_idx" ON "project_tasks"("end_date");
CREATE INDEX "project_tasks_deleted_at_idx" ON "project_tasks"("deleted_at");

CREATE INDEX "project_task_dependencies_project_id_idx" ON "project_task_dependencies"("project_id");
CREATE INDEX "project_task_dependencies_predecessor_task_id_idx" ON "project_task_dependencies"("predecessor_task_id");
CREATE INDEX "project_task_dependencies_successor_task_id_idx" ON "project_task_dependencies"("successor_task_id");
CREATE UNIQUE INDEX "project_task_dependencies_predecessor_task_id_successor_tas_key" ON "project_task_dependencies"("predecessor_task_id", "successor_task_id");

CREATE INDEX "project_resource_assignments_project_id_idx" ON "project_resource_assignments"("project_id");
CREATE INDEX "project_resource_assignments_user_id_idx" ON "project_resource_assignments"("user_id");
CREATE INDEX "project_resource_assignments_role_idx" ON "project_resource_assignments"("role");
CREATE INDEX "project_resource_assignments_start_date_idx" ON "project_resource_assignments"("start_date");
CREATE INDEX "project_resource_assignments_end_date_idx" ON "project_resource_assignments"("end_date");
CREATE INDEX "project_resource_assignments_deleted_at_idx" ON "project_resource_assignments"("deleted_at");

CREATE INDEX "project_activities_project_id_idx" ON "project_activities"("project_id");
CREATE INDEX "project_activities_activity_type_idx" ON "project_activities"("activity_type");
CREATE INDEX "project_activities_owner_id_idx" ON "project_activities"("owner_id");
CREATE INDEX "project_activities_assigned_to_id_idx" ON "project_activities"("assigned_to_id");
CREATE INDEX "project_activities_start_date_idx" ON "project_activities"("start_date");
CREATE INDEX "project_activities_deleted_at_idx" ON "project_activities"("deleted_at");

CREATE INDEX "project_issue_actions_project_id_idx" ON "project_issue_actions"("project_id");
CREATE INDEX "project_issue_actions_type_idx" ON "project_issue_actions"("type");
CREATE INDEX "project_issue_actions_status_idx" ON "project_issue_actions"("status");
CREATE INDEX "project_issue_actions_priority_idx" ON "project_issue_actions"("priority");
CREATE INDEX "project_issue_actions_owner_id_idx" ON "project_issue_actions"("owner_id");
CREATE INDEX "project_issue_actions_due_date_idx" ON "project_issue_actions"("due_date");
CREATE INDEX "project_issue_actions_deleted_at_idx" ON "project_issue_actions"("deleted_at");

CREATE INDEX "project_document_records_project_id_idx" ON "project_document_records"("project_id");
CREATE INDEX "project_document_records_document_id_idx" ON "project_document_records"("document_id");
CREATE INDEX "project_document_records_document_type_idx" ON "project_document_records"("document_type");

CREATE INDEX "project_financial_entries_project_id_idx" ON "project_financial_entries"("project_id");
CREATE INDEX "project_financial_entries_type_idx" ON "project_financial_entries"("type");
CREATE INDEX "project_financial_entries_status_idx" ON "project_financial_entries"("status");
CREATE INDEX "project_financial_entries_expected_date_idx" ON "project_financial_entries"("expected_date");

CREATE INDEX "project_forms_project_id_idx" ON "project_forms"("project_id");
CREATE INDEX "project_forms_form_type_idx" ON "project_forms"("form_type");
CREATE INDEX "project_forms_form_date_idx" ON "project_forms"("form_date");
CREATE INDEX "project_forms_deleted_at_idx" ON "project_forms"("deleted_at");

CREATE INDEX "project_task_templates_project_type_idx" ON "project_task_templates"("project_type");
CREATE INDEX "project_task_templates_is_active_idx" ON "project_task_templates"("is_active");
CREATE INDEX "project_task_template_items_template_id_idx" ON "project_task_template_items"("template_id");
CREATE INDEX "project_task_template_items_sort_order_idx" ON "project_task_template_items"("sort_order");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_quote_version_id_fkey" FOREIGN KEY ("quote_version_id") REFERENCES "quote_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_presales_request_id_fkey" FOREIGN KEY ("presales_request_id") REFERENCES "presales_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_manager_id_fkey" FOREIGN KEY ("project_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_task_dependencies" ADD CONSTRAINT "project_task_dependencies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_task_dependencies" ADD CONSTRAINT "project_task_dependencies_predecessor_task_id_fkey" FOREIGN KEY ("predecessor_task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_task_dependencies" ADD CONSTRAINT "project_task_dependencies_successor_task_id_fkey" FOREIGN KEY ("successor_task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_resource_assignments" ADD CONSTRAINT "project_resource_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_resource_assignments" ADD CONSTRAINT "project_resource_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_issue_actions" ADD CONSTRAINT "project_issue_actions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_issue_actions" ADD CONSTRAINT "project_issue_actions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_document_records" ADD CONSTRAINT "project_document_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_document_records" ADD CONSTRAINT "project_document_records_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_financial_entries" ADD CONSTRAINT "project_financial_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_forms" ADD CONSTRAINT "project_forms_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_forms" ADD CONSTRAINT "project_forms_prepared_by_id_fkey" FOREIGN KEY ("prepared_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_task_template_items" ADD CONSTRAINT "project_task_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "project_task_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
