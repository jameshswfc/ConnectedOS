import type { Prisma } from "@prisma/client";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export function assertPresalesPermission(context: CrmAccessContext, permission: string) {
  if (!context.permissions.includes(permission) && !context.permissions.includes("admin.users") && context.permissionLevel !== "administrator") {
    throw new Error(`Missing permission: ${permission}`);
  }
}

export function assertAnyPresalesPermission(context: CrmAccessContext, permissions: string[]) {
  if (context.permissions.includes("admin.users") || context.permissionLevel === "administrator") return;
  if (!permissions.some((permission) => context.permissions.includes(permission))) {
    throw new Error(`Missing permission: ${permissions.join(" or ")}`);
  }
}

export function canAssignPresales(context: CrmAccessContext) {
  return context.permissions.includes("presales.assign") || context.permissions.includes("admin.users") || context.permissionLevel === "administrator";
}

export function canReadAllPresales(context: CrmAccessContext) {
  return context.permissions.includes("presales.read_all") || context.permissions.includes("admin.users") || context.permissionLevel === "administrator";
}

export function assertCanEditPresalesRequest(context: CrmAccessContext, request: { requestedById?: string | null; assignedToId?: string | null; opportunity?: { ownerId?: string | null } | null }) {
  if (context.permissionLevel === "administrator" || context.permissions.includes("admin.users")) return;
  if ([request.requestedById, request.assignedToId, request.opportunity?.ownerId].includes(context.userId)) return;
  throw new Error("Missing permission: assigned pre-sales access");
}

export function presalesVisibilityWhere(context: CrmAccessContext): Prisma.PresalesRequestWhereInput {
  if (canReadAllPresales(context)) return { deletedAt: null };
  assertAnyPresalesPermission(context, ["presales.read_assigned", "presales.create"]);
  return {
    deletedAt: null,
    OR: [
      { requestedById: context.userId },
      { assignedToId: context.userId },
      { account: { ownerId: context.userId, deletedAt: null } },
      { opportunity: { ownerId: context.userId, deletedAt: null } }
    ]
  };
}
