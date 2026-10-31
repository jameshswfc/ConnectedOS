import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertUserPermission } from "@/services/permissions/permission-service";

export const microsoftAccountLinkSchema = z.object({ objectId: z.string().trim().uuid("Enter a valid Microsoft Entra user Object ID.") });

export class MicrosoftAccountLinkError extends Error {}

export async function linkMicrosoftAccount(adminUserId: string, userId: string, objectId: string) {
  await assertUserPermission(adminUserId, "admin.users");
  const input = microsoftAccountLinkSchema.parse({ objectId });
  const tenant = z.string().uuid().safeParse(process.env.AZURE_AD_TENANT_ID);
  if (!tenant.success) throw new MicrosoftAccountLinkError("Configure the Connected Hospitality Microsoft tenant before linking accounts.");
  const microsoftId = `${tenant.data.toLowerCase()}:${input.objectId.toLowerCase()}`;
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({ where: { id: userId, deletedAt: null } });
      if (!user) throw new MicrosoftAccountLinkError("User not found.");
      if (user.microsoftId && user.microsoftId !== microsoftId) {
        throw new MicrosoftAccountLinkError("This user already has a different Microsoft identity. Review the existing link before changing it.");
      }
      const existing = await tx.user.findUnique({ where: { microsoftId } });
      if (existing && existing.id !== userId) throw new MicrosoftAccountLinkError("That Microsoft identity is already linked to another ConnectedOS user.");
      await tx.user.update({ where: { id: userId }, data: { microsoftId, updatedById: adminUserId } });
      await tx.auditLog.create({ data: {
        userId: adminUserId, module: "admin", entityType: "User", entityId: userId,
        action: "link_microsoft_identity", previousValue: { microsoftId: user.microsoftId }, newValue: { microsoftId }
      } });
      return { id: userId, microsoftId };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new MicrosoftAccountLinkError("That Microsoft identity is already linked to another ConnectedOS user.");
    }
    throw error;
  }
}
