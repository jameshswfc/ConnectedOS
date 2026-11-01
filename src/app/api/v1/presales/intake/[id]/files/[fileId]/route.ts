import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getModuleContext } from "@/modules/operations/api-utils";
import { assertPartnerIntakeReadAccess } from "@/modules/presales/partner-intake-service";
import { quarantinePath } from "@/modules/presales/partner-intake-storage";
import { documentApiError } from "@/services/documents/document-api-error";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  try {
    const context = await getModuleContext(); assertPartnerIntakeReadAccess(context);
    const { id, fileId } = z.object({ id: z.string().uuid(), fileId: z.string().uuid() }).parse(await params);
    const file = await prisma.partnerAttachment.findFirst({ where: { id: fileId, submissionId: id, scanStatus: "clean" } });
    if (!file) return NextResponse.json({ error: { message: "This file is unavailable or awaiting security checks." } }, { status: 404 });
    const bytes = await readFile(quarantinePath(file.storageKey));
    if (createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw new Error("Unable to verify this document. Please contact an administrator.");
    await prisma.auditLog.create({ data: { userId: context.userId, module: "documents", entityType: "PartnerAttachment", entityId: file.id, action: "download_scanned_attachment" } });
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });
  } catch (error) { return documentApiError(error); }
}
