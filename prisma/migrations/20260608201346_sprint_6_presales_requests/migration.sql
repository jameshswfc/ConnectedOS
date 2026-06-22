-- CreateEnum
CREATE TYPE "PresalesRequestCategory" AS ENUM ('network', 'wi_fi', 'iptv', 'structured_cabling', 'elv', 'security', 'guest_room_technology', 'digital_signage', 'audio_visual', 'consultancy', 'multi_discipline');

-- CreateEnum
CREATE TYPE "PresalesRequestType" AS ENUM ('wifi_design', 'iptv_design', 'structured_cabling', 'elv', 'consultancy', 'survey', 'rfp_analysis', 'design_review', 'bom_review', 'proposal_support');

-- CreateEnum
CREATE TYPE "PresalesPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "PresalesCommercialPriority" AS ENUM ('low', 'normal', 'high', 'strategic');

-- CreateEnum
CREATE TYPE "PresalesRequestStatus" AS ENUM ('submitted', 'triage', 'assigned', 'in_progress', 'query_raised', 'waiting_customer', 'internal_review', 'complete', 'cancelled');

-- CreateEnum
CREATE TYPE "PresalesTaskStatus" AS ENUM ('open', 'in_progress', 'complete', 'cancelled');

-- CreateEnum
CREATE TYPE "PresalesSlaStatus" AS ENUM ('on_track', 'due_soon', 'overdue', 'complete');

-- CreateEnum
CREATE TYPE "PresalesRagStatus" AS ENUM ('green', 'amber', 'red');

-- CreateTable
CREATE TABLE "presales_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_number" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "opportunity_id" UUID,
    "quote_id" UUID,
    "requested_by_id" UUID NOT NULL,
    "assigned_to_id" UUID,
    "request_category" "PresalesRequestCategory" NOT NULL,
    "request_type" "PresalesRequestType" NOT NULL,
    "priority" "PresalesPriority" NOT NULL DEFAULT 'normal',
    "commercial_priority" "PresalesCommercialPriority" NOT NULL DEFAULT 'normal',
    "status" "PresalesRequestStatus" NOT NULL DEFAULT 'submitted',
    "sla_status" "PresalesSlaStatus" NOT NULL DEFAULT 'on_track',
    "rag_status" "PresalesRagStatus" NOT NULL DEFAULT 'green',
    "description" TEXT NOT NULL,
    "requested_delivery_date" DATE,
    "internal_deadline" DATE NOT NULL,
    "estimated_hours" DECIMAL(8,2),
    "actual_hours" DECIMAL(8,2),
    "quote_value_snapshot" DECIMAL(12,2),
    "quote_version_snapshot" INTEGER,
    "sharepoint_folder_url" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "ready_for_project" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" UUID,

    CONSTRAINT "presales_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presales_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "presales_request_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigned_to_id" UUID,
    "status" "PresalesTaskStatus" NOT NULL DEFAULT 'open',
    "due_date" DATE,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" UUID,

    CONSTRAINT "presales_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "presales_requests_request_number_key" ON "presales_requests"("request_number");

-- CreateIndex
CREATE INDEX "presales_requests_account_id_idx" ON "presales_requests"("account_id");

-- CreateIndex
CREATE INDEX "presales_requests_opportunity_id_idx" ON "presales_requests"("opportunity_id");

-- CreateIndex
CREATE INDEX "presales_requests_quote_id_idx" ON "presales_requests"("quote_id");

-- CreateIndex
CREATE INDEX "presales_requests_requested_by_id_idx" ON "presales_requests"("requested_by_id");

-- CreateIndex
CREATE INDEX "presales_requests_assigned_to_id_idx" ON "presales_requests"("assigned_to_id");

-- CreateIndex
CREATE INDEX "presales_requests_status_idx" ON "presales_requests"("status");

-- CreateIndex
CREATE INDEX "presales_requests_sla_status_idx" ON "presales_requests"("sla_status");

-- CreateIndex
CREATE INDEX "presales_requests_rag_status_idx" ON "presales_requests"("rag_status");

-- CreateIndex
CREATE INDEX "presales_requests_internal_deadline_idx" ON "presales_requests"("internal_deadline");

-- CreateIndex
CREATE INDEX "presales_requests_deleted_at_idx" ON "presales_requests"("deleted_at");

-- CreateIndex
CREATE INDEX "presales_tasks_presales_request_id_idx" ON "presales_tasks"("presales_request_id");

-- CreateIndex
CREATE INDEX "presales_tasks_assigned_to_id_idx" ON "presales_tasks"("assigned_to_id");

-- CreateIndex
CREATE INDEX "presales_tasks_status_idx" ON "presales_tasks"("status");

-- CreateIndex
CREATE INDEX "presales_tasks_due_date_idx" ON "presales_tasks"("due_date");

-- CreateIndex
CREATE INDEX "presales_tasks_deleted_at_idx" ON "presales_tasks"("deleted_at");

-- AddForeignKey
ALTER TABLE "presales_requests" ADD CONSTRAINT "presales_requests_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presales_requests" ADD CONSTRAINT "presales_requests_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presales_requests" ADD CONSTRAINT "presales_requests_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presales_requests" ADD CONSTRAINT "presales_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presales_requests" ADD CONSTRAINT "presales_requests_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presales_tasks" ADD CONSTRAINT "presales_tasks_presales_request_id_fkey" FOREIGN KEY ("presales_request_id") REFERENCES "presales_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presales_tasks" ADD CONSTRAINT "presales_tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
