CREATE TYPE "AccountType" AS ENUM ('prospect', 'customer', 'partner', 'supplier', 'former_customer');
CREATE TYPE "AccountStatus" AS ENUM ('prospect', 'active_customer', 'partner', 'supplier', 'inactive', 'former_customer');
CREATE TYPE "ContactStatus" AS ENUM ('active', 'inactive');
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'disqualified', 'converted');
CREATE TYPE "OpportunityStage" AS ENUM ('lead', 'qualified', 'discovery', 'solution_design', 'proposal', 'negotiation', 'contract', 'won', 'lost');
CREATE TYPE "OpportunityStatus" AS ENUM ('open', 'won', 'lost', 'inactive');
CREATE TYPE "SalesActivityType" AS ENUM ('call', 'email', 'meeting', 'task', 'note');

CREATE TABLE "accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "account_type" "AccountType" NOT NULL DEFAULT 'prospect',
  "status" "AccountStatus" NOT NULL DEFAULT 'prospect',
  "website" TEXT,
  "phone" TEXT,
  "address_line_1" TEXT,
  "address_line_2" TEXT,
  "city" TEXT,
  "county" TEXT,
  "postcode" TEXT,
  "country" TEXT,
  "industry" TEXT,
  "owner_id" UUID NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by_id" UUID,
  "deleted_at" TIMESTAMP(3),
  "deleted_by_id" UUID,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contacts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "job_title" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "mobile" TEXT,
  "linkedin_url" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "relationship_strength" INTEGER,
  "notes" TEXT,
  "status" "ContactStatus" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by_id" UUID,
  "deleted_at" TIMESTAMP(3),
  "deleted_by_id" UUID,
  CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID,
  "contact_id" UUID,
  "account_name" TEXT,
  "contact_name" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "source" TEXT,
  "status" "LeadStatus" NOT NULL DEFAULT 'new',
  "estimated_value" DECIMAL(12,2),
  "owner_id" UUID NOT NULL,
  "next_action_date" DATE,
  "converted_account_id" UUID,
  "converted_contact_id" UUID,
  "converted_opportunity_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by_id" UUID,
  "deleted_at" TIMESTAMP(3),
  "deleted_by_id" UUID,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "opportunities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "primary_contact_id" UUID,
  "owner_id" UUID NOT NULL,
  "opportunity_name" TEXT NOT NULL,
  "stage" "OpportunityStage" NOT NULL DEFAULT 'lead',
  "status" "OpportunityStatus" NOT NULL DEFAULT 'open',
  "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "margin_percent" DECIMAL(5,2),
  "probability_percent" INTEGER NOT NULL DEFAULT 0,
  "weighted_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "expected_close_date" DATE,
  "source" TEXT,
  "competitor" TEXT,
  "next_action_date" DATE,
  "last_activity_at" TIMESTAMP(3),
  "won_date" DATE,
  "lost_date" DATE,
  "lost_reason" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by_id" UUID,
  "deleted_at" TIMESTAMP(3),
  "deleted_by_id" UUID,
  CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sales_activities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID,
  "contact_id" UUID,
  "opportunity_id" UUID,
  "owner_id" UUID NOT NULL,
  "activity_type" "SalesActivityType" NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT,
  "due_date" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "outcome" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by_id" UUID,
  "deleted_at" TIMESTAMP(3),
  "deleted_by_id" UUID,
  CONSTRAINT "sales_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "opportunity_stage_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "opportunity_id" UUID NOT NULL,
  "from_stage" "OpportunityStage",
  "to_stage" "OpportunityStage" NOT NULL,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "changed_by_id" UUID,
  CONSTRAINT "opportunity_stage_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lost_reasons" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lost_reasons_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "accounts_owner_id_idx" ON "accounts"("owner_id");
CREATE INDEX "accounts_status_idx" ON "accounts"("status");
CREATE INDEX "accounts_created_at_idx" ON "accounts"("created_at");
CREATE INDEX "accounts_deleted_at_idx" ON "accounts"("deleted_at");

CREATE INDEX "contacts_account_id_idx" ON "contacts"("account_id");
CREATE INDEX "contacts_email_idx" ON "contacts"("email");
CREATE INDEX "contacts_status_idx" ON "contacts"("status");
CREATE INDEX "contacts_deleted_at_idx" ON "contacts"("deleted_at");

CREATE INDEX "leads_account_id_idx" ON "leads"("account_id");
CREATE INDEX "leads_contact_id_idx" ON "leads"("contact_id");
CREATE INDEX "leads_owner_id_idx" ON "leads"("owner_id");
CREATE INDEX "leads_status_idx" ON "leads"("status");
CREATE INDEX "leads_next_action_date_idx" ON "leads"("next_action_date");
CREATE INDEX "leads_deleted_at_idx" ON "leads"("deleted_at");

CREATE INDEX "opportunities_account_id_idx" ON "opportunities"("account_id");
CREATE INDEX "opportunities_primary_contact_id_idx" ON "opportunities"("primary_contact_id");
CREATE INDEX "opportunities_owner_id_idx" ON "opportunities"("owner_id");
CREATE INDEX "opportunities_stage_idx" ON "opportunities"("stage");
CREATE INDEX "opportunities_status_idx" ON "opportunities"("status");
CREATE INDEX "opportunities_expected_close_date_idx" ON "opportunities"("expected_close_date");
CREATE INDEX "opportunities_next_action_date_idx" ON "opportunities"("next_action_date");
CREATE INDEX "opportunities_last_activity_at_idx" ON "opportunities"("last_activity_at");
CREATE INDEX "opportunities_created_at_idx" ON "opportunities"("created_at");
CREATE INDEX "opportunities_deleted_at_idx" ON "opportunities"("deleted_at");

CREATE INDEX "sales_activities_account_id_idx" ON "sales_activities"("account_id");
CREATE INDEX "sales_activities_contact_id_idx" ON "sales_activities"("contact_id");
CREATE INDEX "sales_activities_opportunity_id_idx" ON "sales_activities"("opportunity_id");
CREATE INDEX "sales_activities_owner_id_idx" ON "sales_activities"("owner_id");
CREATE INDEX "sales_activities_activity_type_idx" ON "sales_activities"("activity_type");
CREATE INDEX "sales_activities_due_date_idx" ON "sales_activities"("due_date");
CREATE INDEX "sales_activities_completed_at_idx" ON "sales_activities"("completed_at");
CREATE INDEX "sales_activities_deleted_at_idx" ON "sales_activities"("deleted_at");

CREATE INDEX "opportunity_stage_history_opportunity_id_idx" ON "opportunity_stage_history"("opportunity_id");
CREATE INDEX "opportunity_stage_history_changed_at_idx" ON "opportunity_stage_history"("changed_at");
CREATE UNIQUE INDEX "lost_reasons_name_key" ON "lost_reasons"("name");

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_primary_contact_id_fkey" FOREIGN KEY ("primary_contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_activities" ADD CONSTRAINT "sales_activities_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_activities" ADD CONSTRAINT "sales_activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_activities" ADD CONSTRAINT "sales_activities_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_activities" ADD CONSTRAINT "sales_activities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
