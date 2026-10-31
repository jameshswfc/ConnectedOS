import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { accountVisibilityWhere, assertCanEditOwnedCrmRecord, assertCrmPermission, contactVisibilityWhere, leadVisibilityWhere, opportunityVisibilityWhere } from "@/modules/crm/crm-permissions";
import { calculateStageFinancials } from "@/modules/crm/opportunities/opportunity-calculations";
import { opportunitySourceSchema, opportunityTypeSchema } from "@/modules/crm/schemas/crm-schemas";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid expected close date.")
  .refine((value) => { const date = new Date(value); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; }, "Enter a valid expected close date.");

export const leadConversionSchema = z.object({
  opportunityName: z.string().trim().min(1, "Enter an opportunity name.").max(250),
  opportunityType: opportunityTypeSchema.default("other"),
  expectedCloseDate: dateOnly.optional(),
  accountId: z.string().uuid().optional(),
  accountName: z.string().trim().max(250).optional(),
  contactId: z.string().uuid().optional(),
  firstName: z.string().trim().max(120).optional(),
  lastName: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Enter a valid contact email.").optional(),
  phone: z.string().trim().max(80).optional()
});

export class LeadConversionError extends Error {}

export function canConvertLead(context: CrmAccessContext, ownerId: string) {
  const admin = context.permissionLevel === "administrator" || context.permissions.includes("admin.users");
  return admin || (ownerId === context.userId && context.permissions.includes("crm.lead.update") && context.permissions.includes("crm.opportunity.create"));
}

export async function convertLead(context: CrmAccessContext, id: string, rawInput: unknown) {
  assertCrmPermission(context, "crm.lead.update");
  assertCrmPermission(context, "crm.opportunity.create");
  const input = leadConversionSchema.parse(rawInput);
  return prisma.$transaction(async (tx) => {
    // Serialise conversion of this lead so retries and double clicks reuse its opportunity.
    await tx.$queryRaw`SELECT id FROM leads WHERE id = ${id}::uuid FOR UPDATE`;
    const lead = await tx.lead.findFirst({ where: { AND: [leadVisibilityWhere(context), { id }] } });
    if (!lead) throw new Error("Lead not found");
    assertCanEditOwnedCrmRecord(context, lead.ownerId);
    if (lead.convertedOpportunityId) {
      const existing = await tx.opportunity.findFirst({ where: { AND: [opportunityVisibilityWhere(context), { id: lead.convertedOpportunityId }] }, select: { id: true, accountId: true, primaryContactId: true } });
      if (!existing) throw new LeadConversionError("This lead was already converted. Contact an administrator to check its linked opportunity.");
      return { opportunityId: existing.id, accountId: existing.accountId, contactId: existing.primaryContactId, alreadyConverted: true };
    }
    if (lead.status === "disqualified" || lead.status === "converted") throw new LeadConversionError("Only an active lead can be qualified and converted.");
    const accountId = input.accountId ?? lead.accountId;
    let account;
    if (accountId) {
      account = await tx.account.findFirst({ where: { AND: [accountVisibilityWhere(context), { id: accountId }] } });
      if (!account) throw new LeadConversionError("Select an account you can access.");
    } else {
      assertCrmPermission(context, "crm.account.create");
      const name = input.accountName || lead.accountName;
      if (!name) throw new LeadConversionError("Enter an account name or select an existing account.");
      const duplicate = await tx.account.findFirst({ where: { AND: [accountVisibilityWhere(context), { name: { equals: name, mode: "insensitive" } }] }, select: { id: true } });
      if (duplicate) throw new LeadConversionError("An account with this name already exists. Select it from the existing account list.");
      account = await tx.account.create({ data: { name, ownerId: lead.ownerId, phone: lead.phone, createdById: context.userId, updatedById: context.userId } });
      await tx.auditLog.create({ data: { userId: context.userId, module: "crm", entityType: "Account", entityId: account.id, action: "create_from_lead", newValue: { leadId: id } } });
    }
    const contactId = input.contactId ?? (account.id === lead.accountId ? lead.contactId : null);
    let contact = null;
    if (contactId) {
      contact = await tx.contact.findFirst({ where: { AND: [contactVisibilityWhere(context), { id: contactId, accountId: account.id, status: "active" }] } });
      if (!contact) throw new LeadConversionError("Select an active contact belonging to this account.");
    } else if (input.firstName || input.lastName || input.email) {
      assertCrmPermission(context, "crm.contact.create");
      if (!input.firstName || !input.lastName) throw new LeadConversionError("Enter both contact names or select an existing contact.");
      if (input.email) {
        const duplicate = await tx.contact.findFirst({ where: { AND: [contactVisibilityWhere(context), { accountId: account.id, email: { equals: input.email, mode: "insensitive" } }] }, select: { id: true } });
        if (duplicate) throw new LeadConversionError("This contact email already exists on the account. Select the existing contact.");
      }
      contact = await tx.contact.create({ data: { accountId: account.id, firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone ?? lead.phone, createdById: context.userId, updatedById: context.userId } });
      await tx.auditLog.create({ data: { userId: context.userId, module: "crm", entityType: "Contact", entityId: contact.id, action: "create_from_lead", newValue: { leadId: id } } });
    }
    const value = Number(lead.estimatedValue ?? 0);
    if (!Number.isFinite(value) || value < 0) throw new LeadConversionError("Correct the lead's estimated value before conversion.");
    const opportunity = await tx.opportunity.create({ data: {
      accountId: account.id, primaryContactId: contact?.id, ownerId: lead.ownerId,
      opportunityName: input.opportunityName, opportunityType: input.opportunityType,
      stage: "qualified", status: "open", value, ...calculateStageFinancials("qualified", value),
      expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
      nextActionDate: lead.nextActionDate, source: opportunitySourceSchema.safeParse(lead.source).data ?? "other",
      createdById: context.userId, updatedById: context.userId
    } });
    await tx.opportunityStageHistory.create({ data: { opportunityId: opportunity.id, toStage: "qualified", changedById: context.userId } });
    await tx.lead.update({ where: { id }, data: { status: "converted", accountId: account.id, contactId: contact?.id ?? null, convertedAccountId: account.id, convertedContactId: contact?.id ?? null, convertedOpportunityId: opportunity.id, updatedById: context.userId } });
    // Preserve the lead link while making its activity history visible on the new opportunity.
    await tx.salesActivity.updateMany({ where: { leadId: id, deletedAt: null, opportunityId: null }, data: { opportunityId: opportunity.id, accountId: account.id, updatedById: context.userId } });
    await tx.auditLog.create({ data: { userId: context.userId, module: "crm", entityType: "Lead", entityId: id, action: "convert", previousValue: { status: lead.status }, newValue: { opportunityId: opportunity.id, accountId: account.id, contactId: contact?.id ?? null } } });
    await tx.auditLog.create({ data: { userId: context.userId, module: "crm", entityType: "Opportunity", entityId: opportunity.id, action: "create_from_lead", newValue: { leadId: id, ownerId: lead.ownerId } } });
    await tx.notification.create({ data: { userId: lead.ownerId, title: "Lead converted to opportunity", body: input.opportunityName, metadata: { module: "crm", href: `/crm/opportunities/${opportunity.id}` } } });
    return { opportunityId: opportunity.id, accountId: account.id, contactId: contact?.id ?? null, alreadyConverted: false };
  });
}
