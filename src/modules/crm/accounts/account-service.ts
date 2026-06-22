import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit/audit-service";
import { accountVisibilityWhere, activityVisibilityWhere, assertAnyCrmPermission, assertCanEditOwnedCrmRecord, assertCrmPermission } from "@/modules/crm/crm-permissions";
import { presalesVisibilityWhere } from "@/modules/presales/presales-permissions";
import type { AccountCreateInput, AccountUpdateInput } from "@/modules/crm/schemas/crm-schemas";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

const accountInclude = {
  owner: true,
  _count: {
    select: {
      contacts: true,
      opportunities: true,
      salesActivities: true
    }
  }
} satisfies Prisma.AccountInclude;

export async function listAccounts(context: CrmAccessContext, search?: string) {
  const visibility = accountVisibilityWhere(context);
  return prisma.account.findMany({
    where: {
      AND: [
        visibility,
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { industry: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } }
              ]
            }
          : {}
      ]
    },
    include: accountInclude,
    orderBy: { name: "asc" }
  });
}

export async function getAccount(context: CrmAccessContext, id: string) {
  const account = await prisma.account.findFirst({
    where: { AND: [accountVisibilityWhere(context), { id }] },
    include: {
      ...accountInclude,
      contacts: { where: { deletedAt: null }, orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }] },
      opportunities: { where: { deletedAt: null, status: "open" }, orderBy: { updatedAt: "desc" } },
      quotes: {
        where: { deletedAt: null },
        include: {
          versions: { orderBy: { versionNumber: "desc" }, take: 1 },
          approvalRequests: { orderBy: { requestedAt: "desc" }, take: 1 }
        },
        orderBy: { updatedAt: "desc" }
      },
      salesActivities: {
        where: activityVisibilityWhere(context),
        include: { contact: true, lead: true, opportunity: true },
        orderBy: { createdAt: "desc" },
        take: 10
      },
      presalesRequests: { where: presalesVisibilityWhere(context), include: { assignedTo: true, opportunity: true, quote: true }, orderBy: { updatedAt: "desc" } }
    }
  });

  if (!account) {
    throw new Error("Account not found");
  }

  return account;
}

export async function createAccount(context: CrmAccessContext, input: AccountCreateInput) {
  assertCrmPermission(context, "crm.account.create");
  const ownerId = input.ownerId ?? context.userId;
  const account = await prisma.account.create({
    data: {
      ...input,
      ownerId,
      createdById: context.userId,
      updatedById: context.userId
    }
  });

  await createAuditLog({
    userId: context.userId,
    module: "crm",
    entityType: "Account",
    entityId: account.id,
    action: "create",
    newValue: account
  });

  return account;
}

export async function updateAccount(context: CrmAccessContext, id: string, input: AccountUpdateInput) {
  assertAnyCrmPermission(context, ["crm.account.update"]);
  const previous = await getAccount(context, id);
  assertCanEditOwnedCrmRecord(context, previous.ownerId);
  const account = await prisma.account.update({
    where: { id },
    data: {
      ...input,
      updatedById: context.userId
    }
  });

  await createAuditLog({
    userId: context.userId,
    module: "crm",
    entityType: "Account",
    entityId: account.id,
    action: "update",
    previousValue: previous,
    newValue: account
  });

  return account;
}

export async function softDeleteAccount(context: CrmAccessContext, id: string) {
  assertCrmPermission(context, "crm.account.delete");
  const previous = await getAccount(context, id);
  const account = await prisma.account.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedById: context.userId,
      updatedById: context.userId
    }
  });

  await createAuditLog({
    userId: context.userId,
    module: "crm",
    entityType: "Account",
    entityId: account.id,
    action: "soft_delete",
    previousValue: previous,
    newValue: account
  });

  return account;
}
