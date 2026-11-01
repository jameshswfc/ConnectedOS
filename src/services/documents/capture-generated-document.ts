import { prisma } from "@/lib/prisma";
import { uploadFileToSharePointStub } from "./sharepoint-document-service";

// Call only after the export service has checked record and export permissions.
export async function captureGeneratedDocument(input: { entityType: "Quote" | "Project"; entityId: string; userId: string; filename: string; buffer: Buffer }) {
  if (process.env.SHAREPOINT_CAPTURE_EXPORTS !== "true") return;
  try {
    const document = await uploadFileToSharePointStub({
      folderPath: `Generated/${input.entityType}/${input.entityId}`,
      fileName: input.filename, buffer: input.buffer,
      entityType: input.entityType, entityId: input.entityId, uploadedById: input.userId
    });
    await prisma.auditLog.create({ data: { userId: input.userId, module: "documents", entityType: "Document", entityId: document.id, action: "capture_generated_export", newValue: { recordId: input.entityId } } });
  } catch (error) {
    console.error("Generated document capture failed", { entityType: input.entityType, entityId: input.entityId, userId: input.userId, errorType: error instanceof Error ? error.name : "UnknownError" });
    throw new Error("Unable to save the generated document. Please try again or contact an administrator.");
  }
}
