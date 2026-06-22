ALTER TABLE "products"
ADD COLUMN "supplier_id" UUID;

ALTER TABLE "project_resource_assignments"
ADD COLUMN "resource_id" UUID;

ALTER TABLE "project_resource_assignments"
ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "suppliers"
ADD COLUMN "account_manager" TEXT,
ADD COLUMN "categories_supplied" TEXT;

CREATE INDEX "products_supplier_id_idx" ON "products"("supplier_id");
CREATE INDEX "project_resource_assignments_resource_id_idx" ON "project_resource_assignments"("resource_id");

ALTER TABLE "products"
ADD CONSTRAINT "products_supplier_id_fkey"
FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_resource_assignments"
ADD CONSTRAINT "project_resource_assignments_resource_id_fkey"
FOREIGN KEY ("resource_id") REFERENCES "resources"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "resources" (
  "resource_type",
  "user_id",
  "display_name",
  "email",
  "active"
)
SELECT
  'internal_user'::"ResourceType",
  "u"."id",
  "u"."display_name",
  "u"."email",
  TRUE
FROM "users" AS "u"
INNER JOIN "project_resource_assignments" AS "pra" ON "pra"."user_id" = "u"."id"
LEFT JOIN "resources" AS "r" ON "r"."user_id" = "u"."id"
WHERE "r"."id" IS NULL
  AND "u"."deleted_at" IS NULL;

UPDATE "project_resource_assignments" AS "pra"
SET "resource_id" = "r"."id"
FROM "resources" AS "r"
WHERE "pra"."resource_id" IS NULL
  AND "pra"."user_id" IS NOT NULL
  AND "r"."user_id" = "pra"."user_id";

UPDATE "products" AS "p"
SET "supplier_id" = "s"."id"
FROM "suppliers" AS "s"
WHERE "p"."supplier_id" IS NULL
  AND "s"."deleted_at" IS NULL
  AND LOWER(TRIM("p"."supplier")) = LOWER(TRIM("s"."name"));
