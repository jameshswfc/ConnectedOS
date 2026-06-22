ALTER TABLE "purchase_orders"
  ADD COLUMN IF NOT EXISTS "supplier_name" TEXT,
  ADD COLUMN IF NOT EXISTS "supplier_address" TEXT,
  ADD COLUMN IF NOT EXISTS "supplier_contact_name" TEXT,
  ADD COLUMN IF NOT EXISTS "supplier_contact_email" TEXT,
  ADD COLUMN IF NOT EXISTS "delivery_address" TEXT;

ALTER TABLE "purchase_order_lines"
  ADD COLUMN IF NOT EXISTS "tax_rate" DECIMAL(5, 2) NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_including_tax" DECIMAL(12, 2) NOT NULL DEFAULT 0;
