import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { quarantinePath, scanQuarantinedFile } from "./partner-intake-storage";
import { savePresalesUploadBuffer } from "./presales-file-storage";

export async function processPartnerAttachments() {
  const files = await prisma.partnerAttachment.findMany({ where: { documentId: null, OR: [
    { scanStatus: "quarantined" },
    { scanStatus: "clean", submission: { presalesRequestId: { not: null } } }
  ] }, include: { submission: true }, orderBy: { createdAt: "asc" }, take: 50 });
  let promoted = 0, clean = 0, rejected = 0, pending = 0, failed = 0;
  for (const file of files) {
    try {
      const status = await scanQuarantinedFile(file.storageKey, file.sha256);
      await prisma.partnerAttachment.update({ where: { id: file.id }, data: { scanStatus: status } });
      if (status === "clean") clean++;
      else if (status === "rejected") rejected++;
      else pending++;
      if (status !== "clean" || !file.submission.presalesRequestId) continue;
      const didPromote = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`attachment:${file.id}`}))`;
        const latest = await tx.partnerAttachment.findUniqueOrThrow({ where: { id: file.id } });
        if (latest.documentId || latest.scanStatus !== "clean") return false;
        const request = await tx.presalesRequest.findFirst({ where: { id: file.submission.presalesRequestId!, deletedAt: null } });
        if (!request) return false;
        const buffer = await readFile(quarantinePath(file.storageKey));
        if (createHash("sha256").update(buffer).digest("hex") !== file.sha256) {
          await tx.partnerAttachment.update({ where: { id: file.id }, data: { scanStatus: "rejected" } });
          return false;
        }
        const stored = await savePresalesUploadBuffer({ requestNumber: request.requestNumber, fileName: `${file.id}-${file.fileName}`, buffer });
        const document = await tx.document.create({ data: { storageProvider: "other", externalId: stored.relativePath, fileName: file.fileName, sizeBytes: file.sizeBytes, entityType: "PresalesRequest", entityId: request.id } });
        await tx.partnerAttachment.update({ where: { id: file.id }, data: { documentId: document.id } });
        await tx.auditLog.create({ data: { module: "documents", entityType: "Document", entityId: document.id, action: "promote_scanned_partner_attachment", newValue: { submissionId: file.submissionId, sha256: file.sha256 } } });
        return true;
      });
      if (didPromote) promoted++;
    } catch (error) {
      failed++;
      // Do not log file content, partner details or scanner output.
      console.error("Partner attachment processing failed", { attachmentId: file.id, submissionId: file.submissionId, errorType: error instanceof Error ? error.name : "UnknownError" });
    }
  }
  return { inspected: files.length, clean, rejected, pending, failed, promoted };
}
