CREATE TABLE "sage_connections" (
  "id" TEXT NOT NULL DEFAULT 'sage-accounting',
  "business_id" TEXT NOT NULL,
  "encrypted_tokens" TEXT NOT NULL,
  "connected_by_id" UUID NOT NULL,
  "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_synced_at" TIMESTAMP(3),
  "sync_lease_until" TIMESTAMP(3),
  "last_error" TEXT,
  CONSTRAINT "sage_connections_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "sage_oauth_attempts" (
  "state_hash" TEXT NOT NULL,
  "user_id" UUID NOT NULL,
  "encrypted_verifier" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sage_oauth_attempts_pkey" PRIMARY KEY ("state_hash")
);
CREATE INDEX "sage_oauth_attempts_expires_at_idx" ON "sage_oauth_attempts"("expires_at");
CREATE TABLE "sage_invoice_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "connection_id" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "customer_name" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "invoice_date" DATE NOT NULL,
  "due_date" DATE,
  "total_amount" DECIMAL(16,2) NOT NULL,
  "outstanding_amount" DECIMAL(16,2) NOT NULL,
  "synced_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sage_invoice_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sage_invoice_snapshots_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "sage_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "sage_invoice_snapshots_connection_id_external_id_key" ON "sage_invoice_snapshots"("connection_id", "external_id");
CREATE INDEX "sage_invoice_snapshots_due_date_idx" ON "sage_invoice_snapshots"("due_date");
