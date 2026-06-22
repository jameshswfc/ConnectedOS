import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit/audit-service";
import { activityVisibilityWhere, assertCanEditOwnedCrmRecord, assertCrmPermission } from "@/modules/crm/crm-permissions";
import type { SalesActivityCreateInput, SalesActivityUpdateInput } from "@/modules/crm/schemas/crm-schemas";
import { resolveSalesRecordOwnerIdFromDb, salespersonActivityWhere } from "@/modules/crm/sales/salesperson-service";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export type ActivityListFilters = {
  search?: string;
  salespersonId?: string | null;
};

export async function listActivities(context: CrmAccessContext, filters: string | ActivityListFilters = {}) {
  const normalizedFilters = typeof filters === "string" ? { search: filters } : filters;
  return prisma.salesActivity.findMany({
    where: {
      AND: [
        activityVisibilityWhere(context),
        salespersonActivityWhere(context, normalizedFilters.salespersonId),
        normalizedFilters.search
          ? {
              OR: [
                { subject: { contains: normalizedFilters.search, mode: "insensitive" } },
                { description: { contains: normalizedFilters.search, mode: "insensitive" } },
                { account: { name: { contains: normalizedFilters.search, mode: "insensitive" } } },
                { lead: { accountName: { contains: normalizedFilters.search, mode: "insensitive" } } },
                { lead: { contactName: { contains: normalizedFilters.search, mode: "insensitive" } } },
                { opportunity: { opportunityName: { contains: normalizedFilters.search, mode: "insensitive" } } }
              ]
            }
          : {}
      ]
    },
    include: { account: true, contact: true, lead: true, opportunity: true, owner: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function getActivity(context: CrmAccessContext, id: string) {
  const activity = await prisma.salesActivity.findFirst({
    where: { AND: [activityVisibilityWhere(context), { id }] },
    include: { account: true, contact: true, lead: true, opportunity: true, owner: true }
  });
  if (!activity) {
    throw new Error("Activity not found");
  }
  return activity;
}

export async function createActivity(context: CrmAccessContext, input: SalesActivityCreateInput) {
  assertCrmPermission(context, "crm.activity.create");
  const ownerId = await resolveSalesRecordOwnerIdFromDb(context, input.ownerId);
  const activity = await prisma.salesActivity.create({
    data: {
      ...input,
      ownerId,
      createdById: context.userId,
      updatedById: context.userId
    }
  });
  if (activity.opportunityId) {
    await prisma.opportunity.update({ where: { id: activity.opportunityId }, data: { lastActivityAt: new Date() } });
  }
  await createAuditLog({ userId: context.userId, module: "crm", entityType: "SalesActivity", entityId: activity.id, action: "create", newValue: activity });
  return activity;
}

export async function updateActivity(context: CrmAccessContext, id: string, input: SalesActivityUpdateInput) {
  assertCrmPermission(context, "crm.activity.update");
  const previous = await getActivity(context, id);
  assertCanEditOwnedCrmRecord(context, previous.ownerId);
  const { ownerId: requestedOwnerId, ...activityInput } = input;
  const nextOwnerId = requestedOwnerId ? await resolveSalesRecordOwnerIdFromDb(context, requestedOwnerId) : undefined;
  const activity = await prisma.salesActivity.update({ where: { id }, data: { ...activityInput, ...(nextOwnerId ? { ownerId: nextOwnerId } : {}), updatedById: context.userId } });
  await createAuditLog({ userId: context.userId, module: "crm", entityType: "SalesActivity", entityId: activity.id, action: "update", previousValue: previous, newValue: activity });
  return activity;
}

export async function completeActivity(context: CrmAccessContext, id: string, outcome?: string) {
  assertCrmPermission(context, "crm.activity.complete");
  const previous = await getActivity(context, id);
  assertCanEditOwnedCrmRecord(context, previous.ownerId);
  const activity = await prisma.salesActivity.update({
    where: { id },
    data: { completedAt: new Date(), outcome, updatedById: context.userId }
  });
  await createAuditLog({ userId: context.userId, module: "crm", entityType: "SalesActivity", entityId: activity.id, action: "complete", previousValue: previous, newValue: activity });
  return activity;
}
