ALTER TABLE "quotes"
ADD COLUMN "project_change_request_id" UUID;

CREATE INDEX "quotes_project_change_request_id_idx"
ON "quotes"("project_change_request_id");

ALTER TABLE "quotes"
ADD CONSTRAINT "quotes_project_change_request_id_fkey"
FOREIGN KEY ("project_change_request_id") REFERENCES "project_forms"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
