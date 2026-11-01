import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getModuleContext } from "@/modules/operations/api-utils";
import { documentApiError } from "@/services/documents/document-api-error";
import { canManageDocumentRouting, documentRouteSchema } from "@/services/documents/document-routing";
import { assertPartnerIntakeAccess, createPartnerInvitation } from "@/modules/presales/partner-intake-service";
import { createPresalesRequest } from "@/modules/presales/presales-service";
import { presalesRequestCreateSchema } from "@/modules/presales/schemas/presales-schemas";
import { partnerSubmissionSchema } from "@/modules/presales/partner-intake-schemas";

export async function POST(request: Request) {
  try {
    const context = await getModuleContext();
    assertPartnerIntakeAccess(context);
    const body = await request.json();
    if (body.action === "route") {
      if (!canManageDocumentRouting(context)) throw new Error("Missing permission: document routing administration");
      const data = documentRouteSchema.parse(body.data);
      const route = await prisma.$transaction(async (tx) => {
        const id = body.id ? z.string().uuid().parse(body.id) : undefined;
        if (id) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`document-route:${id}`}))`;
          const previous = await tx.documentRoute.findUniqueOrThrow({ where: { id } });
          const parentChanged = (["salesParentId", "presalesParentId", "projectsParentId", "completedParentId"] as const).some((key) => data[key] !== previous[key]);
          if (parentChanged && await tx.documentWorkspace.count({ where: { routeId: id, folderId: { not: null } } })) throw new Error("Unable to change folder destinations after provisioning. An administrator must review the existing folders first.");
        }
        const created = id ? await tx.documentRoute.update({ where: { id }, data }) : await tx.documentRoute.create({ data });
        await tx.auditLog.create({ data: { userId: context.userId, module: "documents", entityType: "DocumentRoute", entityId: created.id, action: id ? "update_hotel_mapping" : "create_hotel_mapping", newValue: data } });
        return created;
      });
      return NextResponse.json({ id: route.id });
    }
    if (body.action === "invite") {
      const input = z.object({ routeId: z.string().uuid(), partner: z.string().trim().min(1).max(200) }).parse(body);
      return NextResponse.json(await createPartnerInvitation(context, input.routeId, input.partner));
    }
    if (body.action === "revoke") {
      const id = z.string().uuid().parse(body.id);
      await prisma.$transaction(async (tx) => {
        await tx.presalesInvitation.update({ where: { id }, data: { revokedAt: new Date() } });
        await tx.auditLog.create({ data: { userId: context.userId, module: "presales", entityType: "PresalesInvitation", entityId: id, action: "revoke_invitation" } });
      });
      return NextResponse.json({ success: true });
    }
    if (body.action === "review") {
      if (body.confirmHotelMapping !== true) throw new Error("Please confirm the submitted hotel matches the selected hotel mapping.");
      const id = z.string().uuid().parse(body.id);
      const submission = await prisma.partnerSubmission.findUniqueOrThrow({ where: { id } });
      if (submission.presalesRequestId) return NextResponse.json({ href: `/presales/${submission.presalesRequestId}` });
      const details = partnerSubmissionSchema.parse(submission.details);
      const input = presalesRequestCreateSchema.parse({ ...body.data, description: `Partner submission ${id}\nHotel: ${details.hotelName}\nBrand: ${details.brand}\nLocation: ${details.location}\nAddress: ${details.address}\nRequester: ${details.requesterName} (${details.requesterEmail})\nSystems: ${details.systems}\nScope: ${details.scope}\nExisting equipment: ${details.existingEquipment}\nConstraints: ${details.constraints}`, requestedDeliveryDate: details.requestedDate });
      const created = await createPresalesRequest(context, input, { partnerSubmissionId: id });
      return NextResponse.json({ href: `/presales/${created.id}` });
    }
    throw new Error("Please choose a valid intake action.");
  } catch (error) { return documentApiError(error); }
}
