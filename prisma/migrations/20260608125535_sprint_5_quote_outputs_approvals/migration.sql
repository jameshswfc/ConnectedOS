-- CreateEnum
CREATE TYPE "QuoteApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "QuoteApprovalRuleType" AS ENUM ('low_margin', 'high_value', 'manual_override');

-- CreateEnum
CREATE TYPE "QuoteExportType" AS ENUM ('pdf_quote', 'excel_bom', 'internal_margin_sheet');

-- AlterTable
ALTER TABLE "quote_versions" ADD COLUMN     "is_locked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "accepted_at" TIMESTAMP(3),
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_id" UUID,
ADD COLUMN     "customer_name" TEXT,
ADD COLUMN     "declined_at" TIMESTAMP(3),
ADD COLUMN     "expired_at" TIMESTAMP(3),
ADD COLUMN     "hotel_name" TEXT,
ADD COLUMN     "prepared_date" DATE,
ADD COLUMN     "project_name" TEXT,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejected_by_id" UUID,
ADD COLUMN     "sent_at" TIMESTAMP(3),
ADD COLUMN     "submitted_for_approval_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "quote_approval_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL,
    "quote_version_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "approver_id" UUID,
    "status" "QuoteApprovalStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT NOT NULL,
    "comments" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "quote_approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_approval_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rule_type" "QuoteApprovalRuleType" NOT NULL,
    "threshold_value" DECIMAL(12,2),
    "required_permission" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_approval_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_exports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL,
    "quote_version_id" UUID NOT NULL,
    "export_type" "QuoteExportType" NOT NULL,
    "filename" TEXT NOT NULL,
    "generated_by_id" UUID NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_approval_requests_quote_id_idx" ON "quote_approval_requests"("quote_id");

-- CreateIndex
CREATE INDEX "quote_approval_requests_quote_version_id_idx" ON "quote_approval_requests"("quote_version_id");

-- CreateIndex
CREATE INDEX "quote_approval_requests_requested_by_id_idx" ON "quote_approval_requests"("requested_by_id");

-- CreateIndex
CREATE INDEX "quote_approval_requests_approver_id_idx" ON "quote_approval_requests"("approver_id");

-- CreateIndex
CREATE INDEX "quote_approval_requests_status_idx" ON "quote_approval_requests"("status");

-- CreateIndex
CREATE INDEX "quote_approval_requests_requested_at_idx" ON "quote_approval_requests"("requested_at");

-- CreateIndex
CREATE UNIQUE INDEX "quote_approval_rules_rule_type_key" ON "quote_approval_rules"("rule_type");

-- CreateIndex
CREATE INDEX "quote_approval_rules_is_active_idx" ON "quote_approval_rules"("is_active");

-- CreateIndex
CREATE INDEX "quote_exports_quote_id_idx" ON "quote_exports"("quote_id");

-- CreateIndex
CREATE INDEX "quote_exports_quote_version_id_idx" ON "quote_exports"("quote_version_id");

-- CreateIndex
CREATE INDEX "quote_exports_export_type_idx" ON "quote_exports"("export_type");

-- CreateIndex
CREATE INDEX "quote_exports_generated_by_id_idx" ON "quote_exports"("generated_by_id");

-- CreateIndex
CREATE INDEX "quote_exports_generated_at_idx" ON "quote_exports"("generated_at");

-- CreateIndex
CREATE INDEX "quote_versions_status_idx" ON "quote_versions"("status");

-- CreateIndex
CREATE INDEX "quote_versions_is_locked_idx" ON "quote_versions"("is_locked");

-- CreateIndex
CREATE INDEX "quotes_submitted_for_approval_at_idx" ON "quotes"("submitted_for_approval_at");

-- AddForeignKey
ALTER TABLE "quote_approval_requests" ADD CONSTRAINT "quote_approval_requests_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_approval_requests" ADD CONSTRAINT "quote_approval_requests_quote_version_id_fkey" FOREIGN KEY ("quote_version_id") REFERENCES "quote_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_approval_requests" ADD CONSTRAINT "quote_approval_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_approval_requests" ADD CONSTRAINT "quote_approval_requests_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_exports" ADD CONSTRAINT "quote_exports_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_exports" ADD CONSTRAINT "quote_exports_quote_version_id_fkey" FOREIGN KEY ("quote_version_id") REFERENCES "quote_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_exports" ADD CONSTRAINT "quote_exports_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
