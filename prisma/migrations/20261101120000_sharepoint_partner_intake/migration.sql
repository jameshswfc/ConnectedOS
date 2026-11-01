-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "sharepointItemId" TEXT,
ADD COLUMN     "sharepointSyncError" TEXT;

-- CreateTable
CREATE TABLE "document_routes" (
    "id" UUID NOT NULL,
    "hotelName" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "propertyCode" TEXT,
    "partner" TEXT,
    "salesParentId" TEXT NOT NULL,
    "presalesParentId" TEXT NOT NULL,
    "projectsParentId" TEXT NOT NULL,
    "completedParentId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_workspaces" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "routeId" UUID,
    "folderId" TEXT,
    "webUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'awaiting_mapping',
    "lastError" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presales_invitations" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "routeId" UUID NOT NULL,
    "partner" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "requestWindowAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presales_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_submissions" (
    "id" UUID NOT NULL,
    "invitationId" UUID NOT NULL,
    "details" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "presalesRequestId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,

    CONSTRAINT "partner_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_attachments" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "scanStatus" TEXT NOT NULL DEFAULT 'quarantined',
    "documentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_workspaces_entityType_entityId_key" ON "document_workspaces"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "presales_invitations_tokenHash_key" ON "presales_invitations"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "partner_submissions_invitationId_key" ON "partner_submissions"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_submissions_presalesRequestId_key" ON "partner_submissions"("presalesRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_attachments_storageKey_key" ON "partner_attachments"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "partner_attachments_documentId_key" ON "partner_attachments"("documentId");

-- AddForeignKey
ALTER TABLE "document_workspaces" ADD CONSTRAINT "document_workspaces_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "document_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presales_invitations" ADD CONSTRAINT "presales_invitations_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "document_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_submissions" ADD CONSTRAINT "partner_submissions_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "presales_invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_attachments" ADD CONSTRAINT "partner_attachments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "partner_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


