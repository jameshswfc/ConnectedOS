import { prisma } from "../src/lib/prisma";
import { discoverDocumentWorkspaces, syncDocumentWorkspaces, syncNewDocuments } from "../src/services/documents/document-sync-service";
import { GraphDocumentClient } from "../src/services/documents/graph-document-client";
import { processPartnerAttachments } from "../src/modules/presales/partner-intake-worker";

async function main() {
  await discoverDocumentWorkspaces();
  console.info("Partner attachment processing", await processPartnerAttachments());
  if (process.env.SHAREPOINT_ENABLED !== "true") {
    console.info("SharePoint is disabled. Mappings remain pending; no remote files or folders changed.");
    return;
  }
  const client = new GraphDocumentClient();
  console.info("SharePoint folder processing", await syncDocumentWorkspaces(client));
  await syncNewDocuments(client);
}
main().catch((error: unknown) => {
  console.error("Document processing failed. Check configuration and pending document records.", { errorType: error instanceof Error ? error.name : "UnknownError" });
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
