CREATE TYPE "RelationshipStrength" AS ENUM (
  'unknown',
  'weak',
  'medium',
  'strong',
  'secured',
  'preferred_partner',
  'only_partner'
);

CREATE TYPE "OpportunityType" AS ENUM (
  'wifi',
  'network_refresh',
  'iptv',
  'digital_signage',
  'guest_room_tech',
  'elv',
  'structured_cabling',
  'consultancy',
  'support_contract',
  'managed_service',
  'other'
);

CREATE TYPE "OpportunitySource" AS ENUM (
  'referral',
  'linkedin',
  'website',
  'existing_customer',
  'partner',
  'manufacturer',
  'tender_portal',
  'cold_outreach',
  'conference_event',
  'other'
);

ALTER TABLE "contacts"
  ALTER COLUMN "relationship_strength" DROP DEFAULT,
  ALTER COLUMN "relationship_strength" TYPE "RelationshipStrength"
  USING (
    CASE
      WHEN "relationship_strength" IS NULL THEN 'unknown'
      WHEN "relationship_strength" <= 1 THEN 'weak'
      WHEN "relationship_strength" = 2 THEN 'medium'
      WHEN "relationship_strength" = 3 THEN 'strong'
      WHEN "relationship_strength" = 4 THEN 'secured'
      ELSE 'preferred_partner'
    END
  )::"RelationshipStrength",
  ALTER COLUMN "relationship_strength" SET DEFAULT 'unknown',
  ALTER COLUMN "relationship_strength" SET NOT NULL;

ALTER TABLE "opportunities" ADD COLUMN "opportunity_type" "OpportunityType" NOT NULL DEFAULT 'other';

ALTER TABLE "opportunities"
  ALTER COLUMN "source" TYPE "OpportunitySource"
  USING (
    CASE lower(coalesce("source", 'other'))
      WHEN 'referral' THEN 'referral'
      WHEN 'linkedin' THEN 'linkedin'
      WHEN 'website' THEN 'website'
      WHEN 'existing customer' THEN 'existing_customer'
      WHEN 'existing_customer' THEN 'existing_customer'
      WHEN 'partner' THEN 'partner'
      WHEN 'manufacturer' THEN 'manufacturer'
      WHEN 'tender portal' THEN 'tender_portal'
      WHEN 'tender_portal' THEN 'tender_portal'
      WHEN 'cold outreach' THEN 'cold_outreach'
      WHEN 'cold_outreach' THEN 'cold_outreach'
      WHEN 'conference/event' THEN 'conference_event'
      WHEN 'conference event' THEN 'conference_event'
      WHEN 'conference_event' THEN 'conference_event'
      ELSE 'other'
    END
  )::"OpportunitySource",
  ALTER COLUMN "source" SET DEFAULT 'other';

ALTER TABLE "sales_activities" ADD COLUMN "lead_id" UUID;
CREATE INDEX "sales_activities_lead_id_idx" ON "sales_activities"("lead_id");
ALTER TABLE "sales_activities" ADD CONSTRAINT "sales_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
