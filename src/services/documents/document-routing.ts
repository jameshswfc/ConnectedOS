import { z } from "zod";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export const workspaceType = z.enum(["Opportunity", "Quote", "PresalesRequest", "Project"]);
export type WorkspaceType = z.infer<typeof workspaceType>;
const text = z.string().trim().min(1).max(200);
const folderId = z.string().trim().regex(/^[A-Za-z0-9!_-]+$/, "Enter a SharePoint folder item ID, not a URL.").max(200).or(z.literal(""));
export const documentRouteSchema = z.object({
  hotelName: text, brand: text, location: text, address: z.string().trim().min(1).max(1500),
  propertyCode: z.string().trim().max(100).optional(), partner: z.string().trim().max(200).optional(),
  salesParentId: folderId, presalesParentId: folderId, projectsParentId: folderId, completedParentId: folderId
});
export function canManageDocumentRouting(context: CrmAccessContext) {
  return context.permissionLevel === "administrator" || context.permissions.includes("admin.integrations") || context.permissions.includes("admin.users");
}
export function canManagePartnerIntake(context: CrmAccessContext) {
  return canManageDocumentRouting(context) || (context.permissions.includes("presales.assign") && context.permissions.includes("presales.create"));
}
export function workspaceFolderName(type: WorkspaceType, id: string, reference: string) {
  return `${reference.replace(/["*:<>?\/\\|#%]/g, "_").slice(0, 80).trim()} - ${type} ${id}`;
}
export function parentForWorkspace(type: WorkspaceType, route: Pick<z.infer<typeof documentRouteSchema>, "salesParentId" | "presalesParentId" | "projectsParentId">) {
  return type === "Project" ? route.projectsParentId : type === "PresalesRequest" ? route.presalesParentId : route.salesParentId;
}
export function shouldArchiveWorkspace(type: WorkspaceType, status: string) {
  return type === "Project" && status === "closed";
}
