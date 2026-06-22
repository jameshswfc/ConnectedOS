ALTER TYPE "PresalesDeliverableType" ADD VALUE IF NOT EXISTS 'rfp_review';
ALTER TYPE "PresalesDeliverableType" ADD VALUE IF NOT EXISTS 'partner_quote';
ALTER TYPE "PresalesDeliverableType" ADD VALUE IF NOT EXISTS 'ip_extensions';
ALTER TYPE "PresalesDeliverableType" ADD VALUE IF NOT EXISTS 'analogue_extensions';
ALTER TYPE "PresalesDeliverableType" ADD VALUE IF NOT EXISTS 'handsets';
ALTER TYPE "PresalesDeliverableType" ADD VALUE IF NOT EXISTS 'ip_network_requirements';
ALTER TYPE "PresalesDeliverableType" ADD VALUE IF NOT EXISTS 'pbx_requirement';
ALTER TYPE "PresalesDeliverableType" ADD VALUE IF NOT EXISTS 'sip_trunks';
ALTER TYPE "PresalesDeliverableType" ADD VALUE IF NOT EXISTS 'number_porting';
ALTER TYPE "PresalesDeliverableType" ADD VALUE IF NOT EXISTS 'rack_count';
ALTER TYPE "PresalesDeliverableType" ADD VALUE IF NOT EXISTS 'cable_runs';
ALTER TYPE "PresalesDeliverableType" ADD VALUE IF NOT EXISTS 'fibre_runs';
ALTER TYPE "PresalesDeliverableType" ADD VALUE IF NOT EXISTS 'cabling_days';

CREATE TYPE "PresalesDeliverableStatus" AS ENUM ('open', 'in_progress', 'complete', 'not_required');

ALTER TABLE "presales_deliverables"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "assigned_to_id" UUID,
  ADD COLUMN "status" "PresalesDeliverableStatus" NOT NULL DEFAULT 'open',
  ADD COLUMN "due_date" DATE,
  ADD COLUMN "completed_at" TIMESTAMP(3);

UPDATE "presales_deliverables"
SET "title" = CASE
  WHEN "title" = 'Predictive Heatmap' THEN 'Predictive Heatmap Created'
  WHEN "title" = 'AP Locations' THEN 'AP locations Created'
  WHEN "title" = 'Network Diagram' THEN 'Network Diagram Created'
  WHEN "title" = 'Port Matrix' THEN 'Port Matrix Created'
  WHEN "title" = 'Bill of Materials' THEN 'Bill of Materials Created'
  WHEN "title" = 'Channel List' THEN 'Channel List Created'
  WHEN "title" = 'Dish Rig Drawing' THEN 'Dish rig drawing created'
  WHEN "title" = 'Bandwidth Assessment' THEN 'Bandwidth requirements determined'
  WHEN "title" = 'Rack Design' THEN 'Numbers and size of racks determined'
  WHEN "title" = 'Cable Schedule' THEN 'Number of cable runs and estimated lengths required'
  WHEN "title" = 'Fibre Schedule' THEN 'Fibre runs determined'
  WHEN "title" = 'Telephony Design' THEN 'Number of handsets required'
  WHEN "title" = 'Network Requirements' THEN 'IP network requirements determined'
  ELSE "title"
END;

UPDATE "presales_deliverables"
SET
  "description" = CASE
    WHEN "title" ILIKE '%bill of materials%' OR "title" ILIKE '%bom%' THEN 'Create or update the Bill of Materials in the connected Quote Builder.'
    ELSE "description"
  END,
  "status" = CASE
    WHEN "document_id" IS NOT NULL THEN 'complete'::"PresalesDeliverableStatus"
    ELSE "status"
  END,
  "completed_at" = CASE
    WHEN "document_id" IS NOT NULL THEN COALESCE("uploaded_at", "updated_at")
    ELSE "completed_at"
  END;

DROP INDEX IF EXISTS "presales_deliverables_presales_request_id_deliverable_type_key";

CREATE UNIQUE INDEX "presales_deliverables_presales_request_id_title_key" ON "presales_deliverables"("presales_request_id", "title");
CREATE INDEX "presales_deliverables_assigned_to_id_idx" ON "presales_deliverables"("assigned_to_id");
CREATE INDEX "presales_deliverables_status_idx" ON "presales_deliverables"("status");
CREATE INDEX "presales_deliverables_due_date_idx" ON "presales_deliverables"("due_date");

ALTER TABLE "presales_deliverables" ADD CONSTRAINT "presales_deliverables_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "presales_deliverables" (
  "presales_request_id",
  "deliverable_type",
  "title",
  "description",
  "assigned_to_id",
  "status",
  "due_date",
  "completed_at",
  "created_at",
  "updated_at"
)
SELECT
  task."presales_request_id",
  CASE
    WHEN task."title" ILIKE '%RFP documentation reviewed%' THEN 'rfp_review'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Predictive Heatmap%' THEN 'guest_wifi_heatmap'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%AP location%' THEN 'ap_locations'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Network Diagram%' THEN 'network_diagram'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Port Matrix%' THEN 'port_matrix'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Bill of Materials%' OR task."title" ILIKE '%BoM%' THEN 'bill_of_materials'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Scope for GUI%' THEN 'gui_scope'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Channel List%' THEN 'channel_list'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Dish rig%' THEN 'dish_rig_drawing'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Bandwidth requirements%' THEN 'bandwidth_assessment'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Quote for partner%' THEN 'partner_quote'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Numbers and size of racks%' THEN 'rack_count'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Number of cable runs%' THEN 'cable_runs'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Fibre runs%' THEN 'fibre_runs'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Number of days for 2 man cabling%' THEN 'cabling_days'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Number of IP extension%' OR task."title" ILIKE '%Number of IP extensions%' THEN 'ip_extensions'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Number of analogue extension%' THEN 'analogue_extensions'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Number of handsets%' THEN 'handsets'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%IP network requirements%' THEN 'ip_network_requirements'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%On site or Cloud PBX%' THEN 'pbx_requirement'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%SIP trunks%' THEN 'sip_trunks'::"PresalesDeliverableType"
    WHEN task."title" ILIKE '%Number porting%' THEN 'number_porting'::"PresalesDeliverableType"
    ELSE 'other'::"PresalesDeliverableType"
  END,
  CASE
    WHEN task."title" = 'Bill of materials created' THEN 'Bill of Materials Created'
    WHEN task."title" = 'Number of IP extension determined' THEN 'Number of IP extensions determined'
    WHEN task."title" = 'IP network requirements' THEN 'IP network requirements determined'
    ELSE task."title"
  END,
  task."description",
  task."assigned_to_id",
  CASE
    WHEN task."status" = 'complete' THEN 'complete'::"PresalesDeliverableStatus"
    WHEN task."status" = 'in_progress' THEN 'in_progress'::"PresalesDeliverableStatus"
    WHEN task."status" = 'cancelled' THEN 'not_required'::"PresalesDeliverableStatus"
    ELSE 'open'::"PresalesDeliverableStatus"
  END,
  task."due_date",
  task."completed_at",
  task."created_at",
  task."updated_at"
FROM "presales_tasks" task
WHERE task."deleted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "presales_deliverables" deliverable
    WHERE deliverable."presales_request_id" = task."presales_request_id"
      AND deliverable."title" = CASE
        WHEN task."title" = 'Bill of materials created' THEN 'Bill of Materials Created'
        WHEN task."title" = 'Number of IP extension determined' THEN 'Number of IP extensions determined'
        WHEN task."title" = 'IP network requirements' THEN 'IP network requirements determined'
        ELSE task."title"
      END
  );
