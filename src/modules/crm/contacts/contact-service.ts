import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit/audit-service";
import { activityVisibilityWhere, assertCrmPermission, contactVisibilityWhere } from "@/modules/crm/crm-permissions";
import type { ContactCreateInput, ContactUpdateInput } from "@/modules/crm/schemas/crm-schemas";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export async function listContacts(context: CrmAccessContext, search?: string) {
  return prisma.contact.findMany({
    where: {
      AND: [
        contactVisibilityWhere(context),
        search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { account: { name: { contains: search, mode: "insensitive" } } }
              ]
            }
          : {}
      ]
    },
    include: { account: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
  });
}

export async function getContact(context: CrmAccessContext, id: string) {
  const contact = await prisma.contact.findFirst({
    where: { AND: [contactVisibilityWhere(context), { id }] },
    include: { account: true, salesActivities: { where: activityVisibilityWhere(context), orderBy: { createdAt: "desc" } } }
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  return contact;
}

export async function createContact(context: CrmAccessContext, input: ContactCreateInput) {
  assertCrmPermission(context, "crm.contact.create");
  const contact = await prisma.contact.create({
    data: {
      ...input,
      createdById: context.userId,
      updatedById: context.userId
    }
  });

  await createAuditLog({ userId: context.userId, module: "crm", entityType: "Contact", entityId: contact.id, action: "create", newValue: contact });
  return contact;
}

export async function updateContact(context: CrmAccessContext, id: string, input: ContactUpdateInput) {
  assertCrmPermission(context, "crm.contact.update");
  const previous = await getContact(context, id);
  const contact = await prisma.contact.update({
    where: { id },
    data: { ...input, updatedById: context.userId }
  });

  await createAuditLog({ userId: context.userId, module: "crm", entityType: "Contact", entityId: contact.id, action: "update", previousValue: previous, newValue: contact });
  return contact;
}

export async function softDeleteContact(context: CrmAccessContext, id: string) {
  assertCrmPermission(context, "crm.contact.delete");
  const previous = await getContact(context, id);
  const contact = await prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: context.userId, updatedById: context.userId }
  });

  await createAuditLog({ userId: context.userId, module: "crm", entityType: "Contact", entityId: contact.id, action: "soft_delete", previousValue: previous, newValue: contact });
  return contact;
}
