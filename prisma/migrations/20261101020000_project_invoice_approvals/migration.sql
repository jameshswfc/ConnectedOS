CREATE TYPE "ProjectInvoiceRequestStatus" AS ENUM ('requested', 'approved', 'creating', 'created', 'rejected', 'reconciliation_required');
CREATE TABLE "project_invoice_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "trigger_key" TEXT NOT NULL,
  "trigger_label" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "net_amount" DECIMAL(12,2) NOT NULL,
  "tax_rate" DECIMAL(5,2) NOT NULL,
  "tax_amount" DECIMAL(12,2) NOT NULL,
  "total_amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "status" "ProjectInvoiceRequestStatus" NOT NULL DEFAULT 'requested',
  "requested_by_id" UUID NOT NULL,
  "approver_id" UUID NOT NULL,
  "approved_at" TIMESTAMP(3),
  "rejection_reason" TEXT,
  "sage_business_id" TEXT,
  "sage_contact_id" TEXT,
  "sage_contact_name" TEXT,
  "approved_payload" JSONB,
  "sage_invoice_id" TEXT,
  "sage_invoice_number" TEXT,
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_invoice_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_invoice_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "project_invoice_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "project_invoice_requests_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "project_invoice_requests_positive_amounts" CHECK ("net_amount" > 0 AND "tax_amount" >= 0 AND "total_amount" = "net_amount" + "tax_amount")
);
CREATE UNIQUE INDEX "project_invoice_requests_project_id_trigger_key_key" ON "project_invoice_requests"("project_id", "trigger_key");
CREATE UNIQUE INDEX "project_invoice_requests_sage_invoice_id_key" ON "project_invoice_requests"("sage_invoice_id");
CREATE INDEX "project_invoice_requests_approver_id_status_idx" ON "project_invoice_requests"("approver_id", "status");
