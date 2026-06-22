-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('internal_user', 'subcontractor', 'agency', 'supplier', 'other');

-- CreateEnum
CREATE TYPE "ResourceBookingType" AS ENUM ('project', 'non_project', 'support', 'survey', 'callout', 'training', 'admin', 'leave_block');

-- CreateEnum
CREATE TYPE "ResourceBookingStatus" AS ENUM ('draft', 'confirmed', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "BookingConflictStatus" AS ENUM ('clear', 'warning', 'blocked', 'overridden');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('annual_leave', 'sick_leave', 'unpaid_leave', 'compassionate_leave', 'training', 'toil', 'other');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "ExpenseClaimStatus" AS ENUM ('draft', 'submitted', 'queried', 'approved', 'rejected', 'paid');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('travel', 'mileage', 'accommodation', 'meals', 'parking', 'materials', 'subsistence', 'other');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('draft', 'submitted', 'approved', 'ordered', 'partially_received', 'received', 'cancelled', 'invoiced', 'paid');

-- CreateEnum
CREATE TYPE "SupplierInvoiceStatus" AS ENUM ('received', 'approved', 'disputed', 'paid');

-- CreateEnum
CREATE TYPE "CustomerInvoiceStatus" AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled');

-- CreateEnum
CREATE TYPE "BillingScheduleTrigger" AS ENUM ('upfront', 'milestone', 'completion', 'manual');

-- CreateEnum
CREATE TYPE "BillingScheduleStatus" AS ENUM ('pending', 'ready', 'invoiced', 'paid');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('required', 'ordered', 'received', 'staged', 'installed', 'handed_over', 'returned', 'disposed', 'cancelled');

-- CreateEnum
CREATE TYPE "HelpdeskTicketType" AS ENUM ('incident', 'service_request', 'change_request', 'problem', 'question');

-- CreateEnum
CREATE TYPE "HelpdeskTicketCategory" AS ENUM ('network', 'wifi', 'iptv', 'cabling', 'hardware', 'software', 'access', 'billing', 'other');

-- CreateEnum
CREATE TYPE "HelpdeskPriority" AS ENUM ('low', 'normal', 'high', 'urgent', 'critical');

-- CreateEnum
CREATE TYPE "HelpdeskImpact" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "HelpdeskUrgency" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "HelpdeskTicketStatus" AS ENUM ('new', 'triage', 'assigned', 'waiting_customer', 'waiting_third_party', 'in_progress', 'resolved', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "HelpdeskTicketSource" AS ENUM ('manual', 'email', 'phone', 'portal', 'project_handover');

-- CreateEnum
CREATE TYPE "HelpdeskCommentVisibility" AS ENUM ('internal', 'customer_visible');

-- CreateEnum
CREATE TYPE "HelpdeskSlaStatus" AS ENUM ('on_track', 'due_soon', 'breached', 'paused');

-- CreateEnum
CREATE TYPE "KnowledgeArticleStatus" AS ENUM ('draft', 'published', 'archived');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "folder_path" TEXT,
ADD COLUMN     "storage_path" TEXT,
ADD COLUMN     "version_label" TEXT,
ADD COLUMN     "web_url" TEXT;

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_type" "ResourceType" NOT NULL,
    "user_id" UUID,
    "display_name" TEXT NOT NULL,
    "company_name" TEXT,
    "role_type" TEXT,
    "skill_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "agent_name" TEXT,
    "agent_phone" TEXT,
    "agent_email" TEXT,
    "standard_day_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "standard_day_sell" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "half_day_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "half_day_sell" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "hourly_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "hourly_sell" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "project_id" UUID,
    "account_id" UUID,
    "opportunity_id" UUID,
    "helpdesk_ticket_id" UUID,
    "booking_type" "ResourceBookingType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "working_days" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "cost_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sell_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cost_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sell_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "chargeable" BOOLEAN NOT NULL DEFAULT true,
    "status" "ResourceBookingStatus" NOT NULL DEFAULT 'draft',
    "conflict_status" "BookingConflictStatus" NOT NULL DEFAULT 'clear',
    "override_reason" TEXT,
    "created_by_id" UUID,
    "approved_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "resource_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "working_days" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "leave_type" "LeaveType" NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'draft',
    "reason" TEXT,
    "approver_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_claims" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claim_number" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "resource_booking_id" UUID,
    "account_id" UUID,
    "status" "ExpenseClaimStatus" NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMP(3),
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_by_id" UUID,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "paid_by_id" UUID,
    "paid_at" TIMESTAMP(3),
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "expense_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claim_id" UUID NOT NULL,
    "expense_date" DATE NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "vat_amount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "receipt_document_id" UUID,
    "mileage_miles" DECIMAL(8,2),
    "mileage_rate" DECIMAL(8,2),
    "mileage_from" TEXT,
    "mileage_to" TEXT,
    "project_id" UUID,
    "resource_booking_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "expense_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "account_id" UUID,
    "contact_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "payment_terms" TEXT,
    "default_currency" TEXT NOT NULL DEFAULT 'GBP',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "po_number" TEXT NOT NULL,
    "supplier_id" UUID NOT NULL,
    "project_id" UUID,
    "quote_id" UUID,
    "change_request_id" UUID,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'draft',
    "requested_by_id" UUID,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "order_date" DATE,
    "expected_delivery_date" DATE,
    "received_date" DATE,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_order_id" UUID NOT NULL,
    "product_id" UUID,
    "sku" TEXT,
    "manufacturer" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "received_quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_order_id" UUID NOT NULL,
    "received_by_id" UUID,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_order_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "SupplierInvoiceStatus" NOT NULL DEFAULT 'received',
    "document_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "supplier_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_number" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "project_id" UUID,
    "quote_id" UUID,
    "status" "CustomerInvoiceStatus" NOT NULL DEFAULT 'draft',
    "issue_date" DATE,
    "due_date" DATE,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstanding_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customer_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "payment_date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "trigger" "BillingScheduleTrigger" NOT NULL,
    "percentage" DECIMAL(7,2),
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "due_date" DATE,
    "status" "BillingScheduleStatus" NOT NULL DEFAULT 'pending',
    "linked_invoice_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "asset_number" TEXT NOT NULL,
    "project_id" UUID,
    "account_id" UUID,
    "purchase_order_line_id" UUID,
    "product_id" UUID,
    "sku" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "mac_address" TEXT,
    "description" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'required',
    "location" TEXT,
    "warranty_start" DATE,
    "warranty_end" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_queues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "helpdesk_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_sla_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "priority" "HelpdeskPriority" NOT NULL,
    "response_minutes" INTEGER NOT NULL,
    "resolution_minutes" INTEGER NOT NULL,
    "business_hours_only" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "helpdesk_sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_number" TEXT NOT NULL,
    "account_id" UUID,
    "contact_id" UUID,
    "project_id" UUID,
    "asset_id" UUID,
    "raised_by_user_id" UUID,
    "raised_by_name" TEXT,
    "raised_by_email" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ticket_type" "HelpdeskTicketType" NOT NULL,
    "category" "HelpdeskTicketCategory" NOT NULL,
    "priority" "HelpdeskPriority" NOT NULL DEFAULT 'normal',
    "impact" "HelpdeskImpact" NOT NULL DEFAULT 'low',
    "urgency" "HelpdeskUrgency" NOT NULL DEFAULT 'low',
    "status" "HelpdeskTicketStatus" NOT NULL DEFAULT 'new',
    "sla_status" "HelpdeskSlaStatus" NOT NULL DEFAULT 'on_track',
    "assigned_to_id" UUID,
    "queue_id" UUID,
    "sla_response_due_at" TIMESTAMP(3),
    "sla_resolution_due_at" TIMESTAMP(3),
    "first_response_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "source" "HelpdeskTicketSource" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "helpdesk_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_ticket_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "author_id" UUID,
    "visibility" "HelpdeskCommentVisibility" NOT NULL DEFAULT 'internal',
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "helpdesk_ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "category" TEXT,
    "body" TEXT NOT NULL,
    "status" "KnowledgeArticleStatus" NOT NULL DEFAULT 'draft',
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resources_user_id_key" ON "resources"("user_id");

-- CreateIndex
CREATE INDEX "resources_resource_type_idx" ON "resources"("resource_type");

-- CreateIndex
CREATE INDEX "resources_active_idx" ON "resources"("active");

-- CreateIndex
CREATE INDEX "resources_display_name_idx" ON "resources"("display_name");

-- CreateIndex
CREATE INDEX "resources_deleted_at_idx" ON "resources"("deleted_at");

-- CreateIndex
CREATE INDEX "resource_bookings_resource_id_idx" ON "resource_bookings"("resource_id");

-- CreateIndex
CREATE INDEX "resource_bookings_project_id_idx" ON "resource_bookings"("project_id");

-- CreateIndex
CREATE INDEX "resource_bookings_account_id_idx" ON "resource_bookings"("account_id");

-- CreateIndex
CREATE INDEX "resource_bookings_opportunity_id_idx" ON "resource_bookings"("opportunity_id");

-- CreateIndex
CREATE INDEX "resource_bookings_helpdesk_ticket_id_idx" ON "resource_bookings"("helpdesk_ticket_id");

-- CreateIndex
CREATE INDEX "resource_bookings_booking_type_idx" ON "resource_bookings"("booking_type");

-- CreateIndex
CREATE INDEX "resource_bookings_status_idx" ON "resource_bookings"("status");

-- CreateIndex
CREATE INDEX "resource_bookings_conflict_status_idx" ON "resource_bookings"("conflict_status");

-- CreateIndex
CREATE INDEX "resource_bookings_start_date_idx" ON "resource_bookings"("start_date");

-- CreateIndex
CREATE INDEX "resource_bookings_end_date_idx" ON "resource_bookings"("end_date");

-- CreateIndex
CREATE INDEX "resource_bookings_deleted_at_idx" ON "resource_bookings"("deleted_at");

-- CreateIndex
CREATE INDEX "leave_requests_user_id_idx" ON "leave_requests"("user_id");

-- CreateIndex
CREATE INDEX "leave_requests_approver_id_idx" ON "leave_requests"("approver_id");

-- CreateIndex
CREATE INDEX "leave_requests_leave_type_idx" ON "leave_requests"("leave_type");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "leave_requests_start_date_idx" ON "leave_requests"("start_date");

-- CreateIndex
CREATE INDEX "leave_requests_end_date_idx" ON "leave_requests"("end_date");

-- CreateIndex
CREATE INDEX "leave_requests_deleted_at_idx" ON "leave_requests"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "expense_claims_claim_number_key" ON "expense_claims"("claim_number");

-- CreateIndex
CREATE INDEX "expense_claims_user_id_idx" ON "expense_claims"("user_id");

-- CreateIndex
CREATE INDEX "expense_claims_project_id_idx" ON "expense_claims"("project_id");

-- CreateIndex
CREATE INDEX "expense_claims_resource_booking_id_idx" ON "expense_claims"("resource_booking_id");

-- CreateIndex
CREATE INDEX "expense_claims_account_id_idx" ON "expense_claims"("account_id");

-- CreateIndex
CREATE INDEX "expense_claims_status_idx" ON "expense_claims"("status");

-- CreateIndex
CREATE INDEX "expense_claims_submitted_at_idx" ON "expense_claims"("submitted_at");

-- CreateIndex
CREATE INDEX "expense_claims_deleted_at_idx" ON "expense_claims"("deleted_at");

-- CreateIndex
CREATE INDEX "expense_lines_claim_id_idx" ON "expense_lines"("claim_id");

-- CreateIndex
CREATE INDEX "expense_lines_category_idx" ON "expense_lines"("category");

-- CreateIndex
CREATE INDEX "expense_lines_receipt_document_id_idx" ON "expense_lines"("receipt_document_id");

-- CreateIndex
CREATE INDEX "expense_lines_project_id_idx" ON "expense_lines"("project_id");

-- CreateIndex
CREATE INDEX "expense_lines_resource_booking_id_idx" ON "expense_lines"("resource_booking_id");

-- CreateIndex
CREATE INDEX "expense_lines_expense_date_idx" ON "expense_lines"("expense_date");

-- CreateIndex
CREATE INDEX "expense_lines_deleted_at_idx" ON "expense_lines"("deleted_at");

-- CreateIndex
CREATE INDEX "suppliers_account_id_idx" ON "suppliers"("account_id");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "suppliers_active_idx" ON "suppliers"("active");

-- CreateIndex
CREATE INDEX "suppliers_deleted_at_idx" ON "suppliers"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_project_id_idx" ON "purchase_orders"("project_id");

-- CreateIndex
CREATE INDEX "purchase_orders_quote_id_idx" ON "purchase_orders"("quote_id");

-- CreateIndex
CREATE INDEX "purchase_orders_change_request_id_idx" ON "purchase_orders"("change_request_id");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_expected_delivery_date_idx" ON "purchase_orders"("expected_delivery_date");

-- CreateIndex
CREATE INDEX "purchase_orders_deleted_at_idx" ON "purchase_orders"("deleted_at");

-- CreateIndex
CREATE INDEX "purchase_order_lines_purchase_order_id_idx" ON "purchase_order_lines"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_lines_product_id_idx" ON "purchase_order_lines"("product_id");

-- CreateIndex
CREATE INDEX "goods_receipts_purchase_order_id_idx" ON "goods_receipts"("purchase_order_id");

-- CreateIndex
CREATE INDEX "goods_receipts_received_by_id_idx" ON "goods_receipts"("received_by_id");

-- CreateIndex
CREATE INDEX "supplier_invoices_purchase_order_id_idx" ON "supplier_invoices"("purchase_order_id");

-- CreateIndex
CREATE INDEX "supplier_invoices_status_idx" ON "supplier_invoices"("status");

-- CreateIndex
CREATE INDEX "supplier_invoices_document_id_idx" ON "supplier_invoices"("document_id");

-- CreateIndex
CREATE INDEX "supplier_invoices_deleted_at_idx" ON "supplier_invoices"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_invoices_invoice_number_key" ON "customer_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "customer_invoices_account_id_idx" ON "customer_invoices"("account_id");

-- CreateIndex
CREATE INDEX "customer_invoices_project_id_idx" ON "customer_invoices"("project_id");

-- CreateIndex
CREATE INDEX "customer_invoices_quote_id_idx" ON "customer_invoices"("quote_id");

-- CreateIndex
CREATE INDEX "customer_invoices_status_idx" ON "customer_invoices"("status");

-- CreateIndex
CREATE INDEX "customer_invoices_due_date_idx" ON "customer_invoices"("due_date");

-- CreateIndex
CREATE INDEX "customer_invoices_deleted_at_idx" ON "customer_invoices"("deleted_at");

-- CreateIndex
CREATE INDEX "customer_payments_invoice_id_idx" ON "customer_payments"("invoice_id");

-- CreateIndex
CREATE INDEX "customer_payments_payment_date_idx" ON "customer_payments"("payment_date");

-- CreateIndex
CREATE INDEX "billing_schedules_project_id_idx" ON "billing_schedules"("project_id");

-- CreateIndex
CREATE INDEX "billing_schedules_status_idx" ON "billing_schedules"("status");

-- CreateIndex
CREATE INDEX "billing_schedules_due_date_idx" ON "billing_schedules"("due_date");

-- CreateIndex
CREATE INDEX "billing_schedules_linked_invoice_id_idx" ON "billing_schedules"("linked_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_asset_number_key" ON "assets"("asset_number");

-- CreateIndex
CREATE INDEX "assets_project_id_idx" ON "assets"("project_id");

-- CreateIndex
CREATE INDEX "assets_account_id_idx" ON "assets"("account_id");

-- CreateIndex
CREATE INDEX "assets_purchase_order_line_id_idx" ON "assets"("purchase_order_line_id");

-- CreateIndex
CREATE INDEX "assets_product_id_idx" ON "assets"("product_id");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_serial_number_idx" ON "assets"("serial_number");

-- CreateIndex
CREATE INDEX "assets_mac_address_idx" ON "assets"("mac_address");

-- CreateIndex
CREATE INDEX "assets_deleted_at_idx" ON "assets"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "helpdesk_queues_name_key" ON "helpdesk_queues"("name");

-- CreateIndex
CREATE INDEX "helpdesk_queues_active_idx" ON "helpdesk_queues"("active");

-- CreateIndex
CREATE INDEX "helpdesk_sla_policies_priority_idx" ON "helpdesk_sla_policies"("priority");

-- CreateIndex
CREATE INDEX "helpdesk_sla_policies_active_idx" ON "helpdesk_sla_policies"("active");

-- CreateIndex
CREATE UNIQUE INDEX "helpdesk_sla_policies_name_priority_key" ON "helpdesk_sla_policies"("name", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "helpdesk_tickets_ticket_number_key" ON "helpdesk_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_account_id_idx" ON "helpdesk_tickets"("account_id");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_contact_id_idx" ON "helpdesk_tickets"("contact_id");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_project_id_idx" ON "helpdesk_tickets"("project_id");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_asset_id_idx" ON "helpdesk_tickets"("asset_id");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_raised_by_user_id_idx" ON "helpdesk_tickets"("raised_by_user_id");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_assigned_to_id_idx" ON "helpdesk_tickets"("assigned_to_id");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_queue_id_idx" ON "helpdesk_tickets"("queue_id");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_priority_idx" ON "helpdesk_tickets"("priority");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_status_idx" ON "helpdesk_tickets"("status");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_sla_status_idx" ON "helpdesk_tickets"("sla_status");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_sla_response_due_at_idx" ON "helpdesk_tickets"("sla_response_due_at");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_sla_resolution_due_at_idx" ON "helpdesk_tickets"("sla_resolution_due_at");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_deleted_at_idx" ON "helpdesk_tickets"("deleted_at");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_comments_ticket_id_idx" ON "helpdesk_ticket_comments"("ticket_id");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_comments_author_id_idx" ON "helpdesk_ticket_comments"("author_id");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_comments_visibility_idx" ON "helpdesk_ticket_comments"("visibility");

-- CreateIndex
CREATE INDEX "helpdesk_ticket_comments_deleted_at_idx" ON "helpdesk_ticket_comments"("deleted_at");

-- CreateIndex
CREATE INDEX "knowledge_articles_status_idx" ON "knowledge_articles"("status");

-- CreateIndex
CREATE INDEX "knowledge_articles_category_idx" ON "knowledge_articles"("category");

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_helpdesk_ticket_id_fkey" FOREIGN KEY ("helpdesk_ticket_id") REFERENCES "helpdesk_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_resource_booking_id_fkey" FOREIGN KEY ("resource_booking_id") REFERENCES "resource_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_paid_by_id_fkey" FOREIGN KEY ("paid_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_lines" ADD CONSTRAINT "expense_lines_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "expense_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_lines" ADD CONSTRAINT "expense_lines_receipt_document_id_fkey" FOREIGN KEY ("receipt_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_lines" ADD CONSTRAINT "expense_lines_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_lines" ADD CONSTRAINT "expense_lines_resource_booking_id_fkey" FOREIGN KEY ("resource_booking_id") REFERENCES "resource_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_change_request_id_fkey" FOREIGN KEY ("change_request_id") REFERENCES "project_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "customer_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_schedules" ADD CONSTRAINT "billing_schedules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_schedules" ADD CONSTRAINT "billing_schedules_linked_invoice_id_fkey" FOREIGN KEY ("linked_invoice_id") REFERENCES "customer_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_purchase_order_line_id_fkey" FOREIGN KEY ("purchase_order_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_raised_by_user_id_fkey" FOREIGN KEY ("raised_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "helpdesk_queues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_comments" ADD CONSTRAINT "helpdesk_ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "helpdesk_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_comments" ADD CONSTRAINT "helpdesk_ticket_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

