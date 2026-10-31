import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit/audit-service";
import { accountVisibilityWhere, activityVisibilityWhere, contactVisibilityWhere, opportunityVisibilityWhere, assertAnyCrmPermission, assertCanEditOwnedCrmRecord, assertCrmPermission } from "@/modules/crm/crm-permissions";
import { presalesVisibilityWhere } from "@/modules/presales/presales-permissions";
import { quoteVisibilityWhere } from "@/modules/quoting/quotes/quote-permissions";
import { projectVisibilityWhere } from "@/modules/projects/project-permissions";
import type { AccountCreateInput, AccountUpdateInput } from "@/modules/crm/schemas/crm-schemas";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

// Account access never grants implicit access to linked modules or their counts.
function permitted<T>(predicate: () => T): T | { id: { in: string[] } } {
  try { return predicate(); }
  catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing permission")) return { id: { in: [] } };
    throw error;
  }
}
const accountInclude = (context: CrmAccessContext) => ({
  owner: { select: { id: true, displayName: true, email: true } },
  _count: {
    select: {
      contacts: { where: permitted(() => contactVisibilityWhere(context)) },
      opportunities: { where: permitted(() => opportunityVisibilityWhere(context)) },
      salesActivities: { where: permitted(() => activityVisibilityWhere(context)) }
    }
  }
} satisfies Prisma.AccountInclude);

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
    include: accountInclude(context),
    orderBy: { name: "asc" }
  });
}

export async function getAccount(context: CrmAccessContext, id: string) {
  const account = await prisma.account.findFirst({
    where: { AND: [accountVisibilityWhere(context), { id }] },
    include: {
      ...accountInclude(context),
      contacts: { where: permitted(() => contactVisibilityWhere(context)), orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }] },
      opportunities: { where: { AND: [permitted(() => opportunityVisibilityWhere(context)), { status: "open" }] }, orderBy: { updatedAt: "desc" } },
      quotes: {
        where: permitted(() => quoteVisibilityWhere(context)),
        include: {
          versions: { select: { versionNumber: true }, orderBy: { versionNumber: "desc" }, take: 1 },
          approvalRequests: { select: { status: true }, orderBy: { requestedAt: "desc" }, take: 1 }
        },
        orderBy: { updatedAt: "desc" }
      },
      salesActivities: {
        where: permitted(() => activityVisibilityWhere(context)),
        orderBy: { createdAt: "desc" },
        take: 10
      },
      presalesRequests: { where: permitted(() => presalesVisibilityWhere(context)), orderBy: { updatedAt: "desc" } },
      projects: { where: permitted(() => projectVisibilityWhere(context)), select: { id: true, projectNumber: true, name: true, status: true, ragStatus: true, targetEndDate: true, projectManager: { select: { displayName: true } } }, orderBy: { updatedAt: "desc" } }
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
