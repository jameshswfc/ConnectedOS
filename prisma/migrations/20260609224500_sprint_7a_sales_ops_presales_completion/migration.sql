CREATE TYPE "PresalesDeliverableType" AS ENUM (
  'guest_wifi_heatmap',
  'ap_locations',
  'network_diagram',
  'port_matrix',
  'bill_of_materials',
  'survey_report',
  'channel_list',
  'dish_rig_drawing',
  'bandwidth_assessment',
  'gui_scope',
  'casting_scope',
  'applications_scope',
  'phone_system_design',
  'rack_design',
  'cable_schedule',
  'fibre_schedule',
  'network_requirements',
  'telephony_design',
  'other'
);

CREATE TABLE "presales_deliverables" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "presales_request_id" UUID NOT NULL,
  "deliverable_type" "PresalesDeliverableType" NOT NULL,
  "title" TEXT NOT NULL,
  "document_id" UUID,
  "uploaded_by_id" UUID,
  "uploaded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "presales_deliverables_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "presales_deliverables_presales_request_id_deliverable_type_key" ON "presales_deliverables"("presales_request_id", "deliverable_type");
CREATE INDEX "presales_deliverables_presales_request_id_idx" ON "presales_deliverables"("presales_request_id");
CREATE INDEX "presales_deliverables_document_id_idx" ON "presales_deliverables"("document_id");
CREATE INDEX "presales_deliverables_uploaded_by_id_idx" ON "presales_deliverables"("uploaded_by_id");
CREATE INDEX "presales_deliverables_deliverable_type_idx" ON "presales_deliverables"("deliverable_type");

ALTER TABLE "presales_deliverables" ADD CONSTRAINT "presales_deliverables_presales_request_id_fkey" FOREIGN KEY ("presales_request_id") REFERENCES "presales_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "presales_deliverables" ADD CONSTRAINT "presales_deliverables_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "presales_deliverables" ADD CONSTRAINT "presales_deliverables_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
