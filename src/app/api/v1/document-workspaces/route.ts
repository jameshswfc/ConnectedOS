import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getModuleContext } from "@/modules/operations/api-utils";
import { documentApiError } from "@/services/documents/document-api-error";
import { canManageDocumentRouting, workspaceType } from "@/services/documents/document-routing";
import { assertWorkspaceAccess, assignWorkspaceRoute, ensureDocumentWorkspace } from "@/services/documents/document-workspace-service";

const keySchema = z.object({ entityType: workspaceType, entityId: z.string().uuid() });
export async function GET(request: Request) {
  try {
    const context = await getModuleContext();
    const key = keySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    await assertWorkspaceAccess(context, key.entityType, key.entityId);
    const workspace = await ensureDocumentWorkspace(key.entityType, key.entityId);
    const canManage = canManageDocumentRouting(context);
    const routes = canManage ? await prisma.documentRoute.findMany({ where: { active: true }, select: { id: true, hotelName: true, location: true } }) : [];
    return NextResponse.json({ status: workspace.status, webUrl: workspace.webUrl, routeId: workspace.routeId, lastError: workspace.lastError, canManage, routes, enabled: process.env.SHAREPOINT_ENABLED === "true" });
  } catch (error) { return documentApiError(error); }
}
export async function PATCH(request: Request) {
  try {
    const context = await getModuleContext();
    const input = keySchema.extend({ routeId: z.string().uuid() }).parse(await request.json());
    await assignWorkspaceRoute(context, input.entityType, input.entityId, input.routeId);
    return NextResponse.json({ success: true });
  } catch (error) { return documentApiError(error); }
}
