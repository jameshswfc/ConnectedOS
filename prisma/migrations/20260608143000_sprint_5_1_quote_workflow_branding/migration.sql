-- Sprint 5.1 Quote workflow, catalogue item types, branding fields and opportunity type cleanup.

CREATE TYPE "CatalogueItemType" AS ENUM ('product', 'labour', 'service');

ALTER TABLE "products"
  ADD COLUMN "item_type" "CatalogueItemType" NOT NULL DEFAULT 'product';

CREATE INDEX "products_item_type_idx" ON "products"("item_type");

ALTER TABLE "quotes"
  ADD COLUMN "contact_id" UUID,
  ADD COLUMN "high_level_scope" TEXT NOT NULL DEFAULT 'To be confirmed.';

UPDATE "quotes"
SET "high_level_scope" = COALESCE(NULLIF("notes", ''), "high_level_scope");

CREATE INDEX "quotes_contact_id_idx" ON "quotes"("contact_id");

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TYPE "OpportunityType" RENAME TO "OpportunityType_old";

CREATE TYPE "OpportunityType" AS ENUM (
  'guest_wifi',
  'cctv_install',
  'converged_network_multiple_technologies',
  'structured_cabling_racks',
  'project_management',
  'pbx_telephony',
  'iot_grms',
  'fibre_broadband',
  'av_meeting_room_solutions',
  'matv_tv_headend',
  'ups_power_protection',
  'digital_signage',
  'integration_services',
  'deployment_services',
  'labour_only',
  'elv_consultancy',
  'iptv_upgrade',
  'other'
);

ALTER TABLE "opportunities"
  ALTER COLUMN "opportunity_type" DROP DEFAULT;

ALTER TABLE "opportunities"
  ALTER COLUMN "opportunity_type" TYPE "OpportunityType"
  USING (
    CASE "opportunity_type"::text
      WHEN 'wifi' THEN 'guest_wifi'
      WHEN 'network_refresh' THEN 'converged_network_multiple_technologies'
      WHEN 'iptv' THEN 'iptv_upgrade'
      WHEN 'digital_signage' THEN 'digital_signage'
      WHEN 'guest_room_tech' THEN 'iot_grms'
      WHEN 'elv' THEN 'elv_consultancy'
      WHEN 'structured_cabling' THEN 'structured_cabling_racks'
      WHEN 'consultancy' THEN 'elv_consultancy'
      WHEN 'support_contract' THEN 'integration_services'
      WHEN 'managed_service' THEN 'integration_services'
      ELSE 'other'
    END
  )::"OpportunityType";

ALTER TABLE "opportunities"
  ALTER COLUMN "opportunity_type" SET DEFAULT 'other';

DROP TYPE "OpportunityType_old";
