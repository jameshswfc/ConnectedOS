CREATE TYPE "ProjectEquipmentItemStatus" AS ENUM ('required', 'ordered', 'received', 'cancelled');

CREATE TABLE "project_equipment_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "source_change_request_id" UUID,
  "sku" TEXT,
  "manufacturer" TEXT,
  "supplier" TEXT,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
  "unit_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "unit_sell" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" "ProjectEquipmentItemStatus" NOT NULL DEFAULT 'required',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "project_equipment_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_equipment_items_project_id_idx" ON "project_equipment_items"("project_id");
CREATE INDEX "project_equipment_items_source_change_request_id_idx" ON "project_equipment_items"("source_change_request_id");
CREATE INDEX "project_equipment_items_status_idx" ON "project_equipment_items"("status");

ALTER TABLE "project_equipment_items" ADD CONSTRAINT "project_equipment_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_equipment_items" ADD CONSTRAINT "project_equipment_items_source_change_request_id_fkey" FOREIGN KEY ("source_change_request_id") REFERENCES "project_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
