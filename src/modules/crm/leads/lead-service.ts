import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit/audit-service";
import { activityVisibilityWhere, assertCanEditOwnedCrmRecord, assertCrmPermission, leadVisibilityWhere } from "@/modules/crm/crm-permissions";
import type { LeadCreateInput, LeadUpdateInput } from "@/modules/crm/schemas/crm-schemas";
import { resolveSalesRecordOwnerIdFromDb, salespersonLeadWhere } from "@/modules/crm/sales/salesperson-service";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export type LeadListFilters = {
  search?: string;
  salespersonId?: string | null;
};

export async function listLeads(context: CrmAccessContext, filters: string | LeadListFilters = {}) {
  const normalizedFilters = typeof filters === "string" ? { search: filters } : filters;
  return prisma.lead.findMany({
    where: {
      AND: [
        leadVisibilityWhere(context),
        salespersonLeadWhere(context, normalizedFilters.salespersonId),
        normalizedFilters.search
          ? {
              OR: [
                { accountName: { contains: normalizedFilters.search, mode: "insensitive" } },
                { contactName: { contains: normalizedFilters.search, mode: "insensitive" } },
                { email: { contains: normalizedFilters.search, mode: "insensitive" } },
                { source: { contains: normalizedFilters.search, mode: "insensitive" } }
              ]
            }
          : {}
      ]
    },
    include: { owner: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function getLead(context: CrmAccessContext, id: string) {
  const lead = await prisma.lead.findFirst({
    where: { AND: [leadVisibilityWhere(context), { id }] },
    include: {
      account: true,
      contact: true,
      owner: true,
      salesActivities: { where: activityVisibilityWhere(context), include: { account: true, contact: true, opportunity: true }, orderBy: { createdAt: "desc" } }
    }
  });
  if (!lead) {
    throw new Error("Lead not found");
  }
  return lead;
}

export async function createLead(context: CrmAccessContext, input: LeadCreateInput) {
  assertCrmPermission(context, "crm.lead.create");
  const ownerId = await resolveSalesRecordOwnerIdFromDb(context, input.ownerId);
  const lead = await prisma.lead.create({
    data: {
      ...input,
      ownerId,
      createdById: context.userId,
      updatedById: context.userId
    }
  });
  await createAuditLog({ userId: context.userId, module: "crm", entityType: "Lead", entityId: lead.id, action: "create", newValue: lead });
  return lead;
}

export async function updateLead(context: CrmAccessContext, id: string, input: LeadUpdateInput) {
  assertCrmPermission(context, "crm.lead.update");
  const previous = await getLead(context, id);
  assertCanEditOwnedCrmRecord(context, previous.ownerId);
  const { ownerId: requestedOwnerId, ...leadInput } = input;
  const nextOwnerId = requestedOwnerId ? await resolveSalesRecordOwnerIdFromDb(context, requestedOwnerId) : undefined;
  const lead = await prisma.lead.update({
    where: { id },
    data: { ...leadInput, ...(nextOwnerId ? { ownerId: nextOwnerId } : {}), updatedById: context.userId }
  });
  await createAuditLog({ userId: context.userId, module: "crm", entityType: "Lead", entityId: lead.id, action: "update", previousValue: previous, newValue: lead });
  return lead;
}

export async function softDeleteLead(context: CrmAccessContext, id: string) {
  assertCrmPermission(context, "crm.lead.delete");
  const previous = await getLead(context, id);
  const lead = await prisma.lead.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: context.userId, updatedById: context.userId }
  });
  await createAuditLog({ userId: context.userId, module: "crm", entityType: "Lead", entityId: lead.id, action: "soft_delete", previousValue: previous, newValue: lead });
  return lead;
}
