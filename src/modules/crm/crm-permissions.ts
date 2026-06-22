import type { Prisma } from "@prisma/client";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export function canReadAllCrm(context: CrmAccessContext) {
  return (
    context.permissions.includes("crm.account.read_all") ||
    context.permissions.includes("crm.opportunity.read_all") ||
    context.permissions.includes("admin.users")
  );
}

export function assertCrmPermission(context: CrmAccessContext, permission: string) {
  if (!context.permissions.includes(permission) && !context.permissions.includes("admin.users") && context.permissionLevel !== "administrator") {
    throw new Error(`Missing permission: ${permission}`);
  }
}

export function assertAnyCrmPermission(context: CrmAccessContext, permissions: string[]) {
  if (context.permissions.includes("admin.users") || context.permissionLevel === "administrator") {
    return;
  }

  if (!permissions.some((permission) => context.permissions.includes(permission))) {
    throw new Error(`Missing permission: ${permissions.join(" or ")}`);
  }
}

export function canManageAllCrmRecords(context: CrmAccessContext) {
  return context.permissions.includes("admin.users") || context.permissionLevel === "administrator";
}

export function assertCanEditOwnedCrmRecord(context: CrmAccessContext, ownerId?: string | null) {
  if (canManageAllCrmRecords(context)) return;
  if (ownerId === context.userId) return;
  throw new Error("Missing permission: assigned record access");
}

export function accountVisibilityWhere(context: CrmAccessContext): Prisma.AccountWhereInput {
  if (context.permissions.includes("crm.account.read_all") || context.permissions.includes("admin.users") || context.permissionLevel === "administrator") {
    return { deletedAt: null };
  }

  assertCrmPermission(context, "crm.account.read_own");
  return { deletedAt: null, ownerId: context.userId };
}

export function contactVisibilityWhere(context: CrmAccessContext): Prisma.ContactWhereInput {
  if (context.permissions.includes("crm.contact.read_all") || context.permissions.includes("admin.users") || context.permissionLevel === "administrator") {
    return { deletedAt: null };
  }

  assertCrmPermission(context, "crm.contact.read_own");
  return { deletedAt: null, account: { ownerId: context.userId, deletedAt: null } };
}

export function leadVisibilityWhere(context: CrmAccessContext): Prisma.LeadWhereInput {
  if (context.permissions.includes("crm.lead.read_all") || context.permissions.includes("admin.users") || context.permissionLevel === "administrator") {
    return { deletedAt: null };
  }

  assertCrmPermission(context, "crm.lead.read_own");
  return { deletedAt: null, ownerId: context.userId };
}

export function opportunityVisibilityWhere(context: CrmAccessContext): Prisma.OpportunityWhereInput {
  if (context.permissions.includes("crm.opportunity.read_all") || context.permissions.includes("admin.users") || context.permissionLevel === "administrator") {
    return { deletedAt: null };
  }

  assertCrmPermission(context, "crm.opportunity.read_own");
  return { deletedAt: null, ownerId: context.userId };
}

export function activityVisibilityWhere(context: CrmAccessContext): Prisma.SalesActivityWhereInput {
  if (context.permissions.includes("crm.activity.read_all") || context.permissions.includes("admin.users") || context.permissionLevel === "administrator") {
    return { deletedAt: null };
  }

  assertCrmPermission(context, "crm.activity.read_own");
  return { deletedAt: null, ownerId: context.userId };
}
