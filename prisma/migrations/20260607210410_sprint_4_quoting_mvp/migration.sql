-- CreateEnum
CREATE TYPE "PriceImportStatus" AS ENUM ('completed', 'completed_with_errors', 'failed');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('draft', 'internal_review', 'approved', 'rejected', 'sent', 'accepted', 'declined', 'expired');

-- CreateEnum
CREATE TYPE "QuoteLineType" AS ENUM ('product', 'labour', 'service', 'note');

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sku" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost_price" DECIMAL(12,2) NOT NULL,
    "default_sell_price" DECIMAL(12,2) NOT NULL,
    "margin_percent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "lead_time_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" UUID,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_imports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "filename" TEXT NOT NULL,
    "supplier" TEXT,
    "uploaded_by_id" UUID NOT NULL,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "successful_rows" INTEGER NOT NULL DEFAULT 0,
    "failed_rows" INTEGER NOT NULL DEFAULT 0,
    "status" "PriceImportStatus" NOT NULL DEFAULT 'completed',
    "error_summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "opportunity_id" UUID,
    "owner_id" UUID NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "current_version_number" INTEGER NOT NULL DEFAULT 1,
    "cost_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sell_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "margin_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "margin_percent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" UUID,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "cost_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sell_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "margin_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "margin_percent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "quote_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_version_id" UUID NOT NULL,
    "product_id" UUID,
    "line_type" "QuoteLineType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unit_sell" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cost_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sell_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "margin_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "margin_percent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" UUID,

    CONSTRAINT "quote_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_supplier_idx" ON "products"("supplier");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "products_deleted_at_idx" ON "products"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "products_supplier_sku_key" ON "products"("supplier", "sku");

-- CreateIndex
CREATE INDEX "price_imports_supplier_idx" ON "price_imports"("supplier");

-- CreateIndex
CREATE INDEX "price_imports_uploaded_by_id_idx" ON "price_imports"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "price_imports_created_at_idx" ON "price_imports"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quote_number_key" ON "quotes"("quote_number");

-- CreateIndex
CREATE INDEX "quotes_account_id_idx" ON "quotes"("account_id");

-- CreateIndex
CREATE INDEX "quotes_opportunity_id_idx" ON "quotes"("opportunity_id");

-- CreateIndex
CREATE INDEX "quotes_owner_id_idx" ON "quotes"("owner_id");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quotes_created_at_idx" ON "quotes"("created_at");

-- CreateIndex
CREATE INDEX "quotes_deleted_at_idx" ON "quotes"("deleted_at");

-- CreateIndex
CREATE INDEX "quote_versions_quote_id_idx" ON "quote_versions"("quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "quote_versions_quote_id_version_number_key" ON "quote_versions"("quote_id", "version_number");

-- CreateIndex
CREATE INDEX "quote_lines_quote_version_id_idx" ON "quote_lines"("quote_version_id");

-- CreateIndex
CREATE INDEX "quote_lines_product_id_idx" ON "quote_lines"("product_id");

-- CreateIndex
CREATE INDEX "quote_lines_line_type_idx" ON "quote_lines"("line_type");

-- CreateIndex
CREATE INDEX "quote_lines_deleted_at_idx" ON "quote_lines"("deleted_at");

-- AddForeignKey
ALTER TABLE "price_imports" ADD CONSTRAINT "price_imports_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_version_id_fkey" FOREIGN KEY ("quote_version_id") REFERENCES "quote_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
