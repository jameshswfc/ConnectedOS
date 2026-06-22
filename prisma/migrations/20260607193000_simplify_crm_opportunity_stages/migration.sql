ALTER TYPE "OpportunityStage" RENAME TO "OpportunityStage_old";

CREATE TYPE "OpportunityStage" AS ENUM (
  'lead',
  'discovery',
  'qualified',
  'pre_sales_solution_design',
  'proposal_sent',
  'proposal_review',
  'negotiation',
  'proposal_verbally_accepted',
  'closed_won_po_received',
  'lost'
);

ALTER TABLE "opportunities" ALTER COLUMN "stage" DROP DEFAULT;

ALTER TABLE "opportunities"
  ALTER COLUMN "stage" TYPE "OpportunityStage"
  USING (
    CASE "stage"::text
      WHEN 'lead_new_enquiry' THEN 'lead'
      WHEN 'lead' THEN 'lead'
      WHEN 'discovery' THEN 'discovery'
      WHEN 'qualified' THEN 'qualified'
      WHEN 'pre_sales_required' THEN 'pre_sales_solution_design'
      WHEN 'solution_design' THEN 'pre_sales_solution_design'
      WHEN 'pre_sales_solution_design' THEN 'pre_sales_solution_design'
      WHEN 'proposal_sent' THEN 'proposal_sent'
      WHEN 'proposal_review' THEN 'proposal_review'
      WHEN 'negotiation' THEN 'negotiation'
      WHEN 'proposal_accepted' THEN 'proposal_verbally_accepted'
      WHEN 'proposal_verbally_accepted' THEN 'proposal_verbally_accepted'
      WHEN 'won' THEN 'closed_won_po_received'
      WHEN 'po_received' THEN 'closed_won_po_received'
      WHEN 'closed_won_po_received' THEN 'closed_won_po_received'
      WHEN 'lost' THEN 'lost'
      ELSE 'lead'
    END
  )::"OpportunityStage";

ALTER TABLE "opportunities" ALTER COLUMN "stage" SET DEFAULT 'lead';

ALTER TABLE "opportunity_stage_history"
  ALTER COLUMN "from_stage" TYPE "OpportunityStage"
  USING (
    CASE "from_stage"::text
      WHEN 'lead_new_enquiry' THEN 'lead'
      WHEN 'lead' THEN 'lead'
      WHEN 'discovery' THEN 'discovery'
      WHEN 'qualified' THEN 'qualified'
      WHEN 'pre_sales_required' THEN 'pre_sales_solution_design'
      WHEN 'solution_design' THEN 'pre_sales_solution_design'
      WHEN 'pre_sales_solution_design' THEN 'pre_sales_solution_design'
      WHEN 'proposal_sent' THEN 'proposal_sent'
      WHEN 'proposal_review' THEN 'proposal_review'
      WHEN 'negotiation' THEN 'negotiation'
      WHEN 'proposal_accepted' THEN 'proposal_verbally_accepted'
      WHEN 'proposal_verbally_accepted' THEN 'proposal_verbally_accepted'
      WHEN 'won' THEN 'closed_won_po_received'
      WHEN 'po_received' THEN 'closed_won_po_received'
      WHEN 'closed_won_po_received' THEN 'closed_won_po_received'
      WHEN 'lost' THEN 'lost'
      ELSE NULL
    END
  )::"OpportunityStage",
  ALTER COLUMN "to_stage" TYPE "OpportunityStage"
  USING (
    CASE "to_stage"::text
      WHEN 'lead_new_enquiry' THEN 'lead'
      WHEN 'lead' THEN 'lead'
      WHEN 'discovery' THEN 'discovery'
      WHEN 'qualified' THEN 'qualified'
      WHEN 'pre_sales_required' THEN 'pre_sales_solution_design'
      WHEN 'solution_design' THEN 'pre_sales_solution_design'
      WHEN 'pre_sales_solution_design' THEN 'pre_sales_solution_design'
      WHEN 'proposal_sent' THEN 'proposal_sent'
      WHEN 'proposal_review' THEN 'proposal_review'
      WHEN 'negotiation' THEN 'negotiation'
      WHEN 'proposal_accepted' THEN 'proposal_verbally_accepted'
      WHEN 'proposal_verbally_accepted' THEN 'proposal_verbally_accepted'
      WHEN 'won' THEN 'closed_won_po_received'
      WHEN 'po_received' THEN 'closed_won_po_received'
      WHEN 'closed_won_po_received' THEN 'closed_won_po_received'
      WHEN 'lost' THEN 'lost'
      ELSE 'lead'
    END
  )::"OpportunityStage";

DROP TYPE "OpportunityStage_old";

UPDATE "opportunities"
SET
  "probability_percent" = CASE "stage"
    WHEN 'lead' THEN 0
    WHEN 'discovery' THEN 5
    WHEN 'qualified' THEN 10
    WHEN 'pre_sales_solution_design' THEN 20
    WHEN 'proposal_sent' THEN 30
    WHEN 'proposal_review' THEN 40
    WHEN 'negotiation' THEN 50
    WHEN 'proposal_verbally_accepted' THEN 75
    WHEN 'closed_won_po_received' THEN 100
    WHEN 'lost' THEN 0
  END,
  "weighted_value" = ROUND(("value" * CASE "stage"
    WHEN 'lead' THEN 0
    WHEN 'discovery' THEN 5
    WHEN 'qualified' THEN 10
    WHEN 'pre_sales_solution_design' THEN 20
    WHEN 'proposal_sent' THEN 30
    WHEN 'proposal_review' THEN 40
    WHEN 'negotiation' THEN 50
    WHEN 'proposal_verbally_accepted' THEN 75
    WHEN 'closed_won_po_received' THEN 100
    WHEN 'lost' THEN 0
  END) / 100, 2);
