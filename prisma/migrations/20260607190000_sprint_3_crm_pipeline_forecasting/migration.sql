ALTER TYPE "OpportunityStage" RENAME TO "OpportunityStage_old";

CREATE TYPE "OpportunityStage" AS ENUM (
  'lead_new_enquiry',
  'discovery',
  'qualified',
  'pre_sales_required',
  'solution_design',
  'proposal_sent',
  'proposal_review',
  'negotiation',
  'proposal_accepted',
  'won',
  'po_received',
  'lost'
);

ALTER TABLE "opportunities" ALTER COLUMN "stage" DROP DEFAULT;

ALTER TABLE "opportunities"
  ALTER COLUMN "stage" TYPE "OpportunityStage"
  USING (
    CASE "stage"::text
      WHEN 'lead' THEN 'lead_new_enquiry'
      WHEN 'discovery' THEN 'discovery'
      WHEN 'qualified' THEN 'qualified'
      WHEN 'solution_design' THEN 'solution_design'
      WHEN 'proposal' THEN 'proposal_sent'
      WHEN 'negotiation' THEN 'negotiation'
      WHEN 'contract' THEN 'proposal_accepted'
      WHEN 'won' THEN 'won'
      WHEN 'lost' THEN 'lost'
      ELSE 'lead_new_enquiry'
    END
  )::"OpportunityStage";

ALTER TABLE "opportunities" ALTER COLUMN "stage" SET DEFAULT 'lead_new_enquiry';

ALTER TABLE "opportunity_stage_history"
  ALTER COLUMN "from_stage" TYPE "OpportunityStage"
  USING (
    CASE "from_stage"::text
      WHEN 'lead' THEN 'lead_new_enquiry'
      WHEN 'discovery' THEN 'discovery'
      WHEN 'qualified' THEN 'qualified'
      WHEN 'solution_design' THEN 'solution_design'
      WHEN 'proposal' THEN 'proposal_sent'
      WHEN 'negotiation' THEN 'negotiation'
      WHEN 'contract' THEN 'proposal_accepted'
      WHEN 'won' THEN 'won'
      WHEN 'lost' THEN 'lost'
      ELSE NULL
    END
  )::"OpportunityStage",
  ALTER COLUMN "to_stage" TYPE "OpportunityStage"
  USING (
    CASE "to_stage"::text
      WHEN 'lead' THEN 'lead_new_enquiry'
      WHEN 'discovery' THEN 'discovery'
      WHEN 'qualified' THEN 'qualified'
      WHEN 'solution_design' THEN 'solution_design'
      WHEN 'proposal' THEN 'proposal_sent'
      WHEN 'negotiation' THEN 'negotiation'
      WHEN 'contract' THEN 'proposal_accepted'
      WHEN 'won' THEN 'won'
      WHEN 'lost' THEN 'lost'
      ELSE 'lead_new_enquiry'
    END
  )::"OpportunityStage";

DROP TYPE "OpportunityStage_old";

UPDATE "opportunities"
SET
  "probability_percent" = CASE "stage"
    WHEN 'lead_new_enquiry' THEN 5
    WHEN 'discovery' THEN 10
    WHEN 'qualified' THEN 20
    WHEN 'pre_sales_required' THEN 30
    WHEN 'solution_design' THEN 40
    WHEN 'proposal_sent' THEN 55
    WHEN 'proposal_review' THEN 65
    WHEN 'negotiation' THEN 75
    WHEN 'proposal_accepted' THEN 90
    WHEN 'won' THEN 100
    WHEN 'po_received' THEN 100
    WHEN 'lost' THEN 0
  END,
  "weighted_value" = ROUND(("value" * CASE "stage"
    WHEN 'lead_new_enquiry' THEN 5
    WHEN 'discovery' THEN 10
    WHEN 'qualified' THEN 20
    WHEN 'pre_sales_required' THEN 30
    WHEN 'solution_design' THEN 40
    WHEN 'proposal_sent' THEN 55
    WHEN 'proposal_review' THEN 65
    WHEN 'negotiation' THEN 75
    WHEN 'proposal_accepted' THEN 90
    WHEN 'won' THEN 100
    WHEN 'po_received' THEN 100
    WHEN 'lost' THEN 0
  END) / 100, 2);
