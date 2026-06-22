import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export const salesRoleName = "Sales";
export const salespersonSelectorRoles = ["Administrator", "Business Operations"] as const;

export type SalespersonOption = {
  id: string;
  displayName: string;
  email: string;
};

type SalesUserLike = {
  id: string;
  displayName: string | null;
  email: string;
  isActive: boolean;
  deletedAt?: Date | null;
  deactivatedAt?: Date | null;
  role?: { name: string } | null;
};

export function isActiveSalesUser(user: SalesUserLike) {
  return Boolean(user.isActive && !user.deletedAt && !user.deactivatedAt && user.role?.name === salesRoleName);
}

export function toSalespersonOption(user: Pick<SalesUserLike, "id" | "displayName" | "email">): SalespersonOption {
  return {
    id: user.id,
    displayName: user.displayName || user.email,
    email: user.email
  };
}

export function filterActiveSalesUsers(users: SalesUserLike[]) {
  return users.filter(isActiveSalesUser).map(toSalespersonOption);
}

export async function getActiveSalesUsers(): Promise<SalespersonOption[]> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      deactivatedAt: null,
      role: { name: salesRoleName }
    },
    select: {
      id: true,
      displayName: true,
      email: true
    },
    orderBy: [{ displayName: "asc" }, { email: "asc" }]
  });

  return users.map(toSalespersonOption);
}

export function canSelectSalesperson(context: CrmAccessContext) {
  return (
    context.permissionLevel === "administrator" ||
    context.permissions.includes("admin.users") ||
    salespersonSelectorRoles.includes(context.role as (typeof salespersonSelectorRoles)[number])
  );
}

export function isSalesRoleUser(context: CrmAccessContext) {
  return context.role === salesRoleName;
}

export function resolveSalespersonScope(context: CrmAccessContext, requestedSalespersonId?: string | null) {
  if (canSelectSalesperson(context)) {
    const selectedSalespersonId = requestedSalespersonId || undefined;
    return {
      canSelect: true,
      selectedSalespersonId,
      ownerWhere: selectedSalespersonId ? { ownerId: selectedSalespersonId } : {}
    };
  }

  if (isSalesRoleUser(context)) {
    return {
      canSelect: false,
      selectedSalespersonId: context.userId,
      ownerWhere: { ownerId: context.userId }
    };
  }

  return {
    canSelect: false,
    selectedSalespersonId: undefined,
    ownerWhere: {}
  };
}

export function resolveSalesRecordOwnerId({
  context,
  requestedOwnerId,
  activeSalespersonIds
}: {
  context: CrmAccessContext;
  requestedOwnerId?: string | null;
  activeSalespersonIds: string[];
}) {
  if (canSelectSalesperson(context)) {
    if (!requestedOwnerId) {
      throw new Error("Missing permission: active Sales owner required");
    }
    if (!activeSalespersonIds.includes(requestedOwnerId)) {
      throw new Error("Missing permission: owner must be an active Sales user");
    }
    return requestedOwnerId;
  }

  if (requestedOwnerId && requestedOwnerId !== context.userId) {
    throw new Error("Missing permission: salesperson assignment");
  }

  return context.userId;
}

export async function resolveSalesRecordOwnerIdFromDb(context: CrmAccessContext, requestedOwnerId?: string | null) {
  const activeSalespeople = await getActiveSalesUsers();
  return resolveSalesRecordOwnerId({
    context,
    requestedOwnerId,
    activeSalespersonIds: activeSalespeople.map((salesperson) => salesperson.id)
  });
}

export function salespersonOpportunityWhere(context: CrmAccessContext, salespersonId?: string | null): Prisma.OpportunityWhereInput {
  return resolveSalespersonScope(context, salespersonId).ownerWhere;
}

export function salespersonLeadWhere(context: CrmAccessContext, salespersonId?: string | null): Prisma.LeadWhereInput {
  return resolveSalespersonScope(context, salespersonId).ownerWhere;
}

export function salespersonActivityWhere(context: CrmAccessContext, salespersonId?: string | null): Prisma.SalesActivityWhereInput {
  return resolveSalespersonScope(context, salespersonId).ownerWhere;
}
