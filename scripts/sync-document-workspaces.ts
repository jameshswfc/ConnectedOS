import { prisma } from "../src/lib/prisma";
import { syncDocumentWorkspaces, syncNewDocuments } from "../src/services/documents/document-sync-service";
import { GraphDocumentClient } from "../src/services/documents/graph-document-client";
import { processPartnerAttachments } from "../src/modules/presales/partner-intake-worker";

async function main() {
  if (process.env.PARTNER_INTAKE_ENABLED === "true") {
    const attachments = await processPartnerAttachments();
    console.info("Partner attachment processing", attachments);
    if (attachments.failed || attachments.pending) process.exitCode = 1;
  }
  if (process.env.SHAREPOINT_ENABLED !== "true") {
    console.info("SharePoint is disabled. Mappings remain pending; no remote files or folders changed.");
    return;
  }
  const client = new GraphDocumentClient();
  const workspaces = await syncDocumentWorkspaces(client);
  console.info("SharePoint folder processing", workspaces);
  if (workspaces.failed) process.exitCode = 1;
  const uploads = await syncNewDocuments(client);
  console.info("SharePoint document processing", uploads);
  if (uploads.failed) process.exitCode = 1;
  if (!uploads.enabled) console.warn("Document copying is paused. Set an explicit valid SHAREPOINT_DOCUMENTS_SINCE cutoff before activation.");
}
main().catch((error: unknown) => {
  console.error("Document processing failed. Check configuration and pending document records.", { errorType: error instanceof Error ? error.name : "UnknownError" });
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
