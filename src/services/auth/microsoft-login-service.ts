import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const staffRoleName = "Staff";

export function isMicrosoftLoginEnabled() {
  return process.env.ENABLE_ENTRA_LOGIN === "true"
    && z.string().uuid().safeParse(process.env.AZURE_AD_TENANT_ID).success
    && Boolean(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET);
}

export class MicrosoftLoginError extends Error {
  constructor(public readonly reason: "MicrosoftTenantRequired" | "MicrosoftMemberRequired" | "MicrosoftAccountLinkRequired" | "MicrosoftAccountInactive") {
    super(reason);
    this.name = "MicrosoftLoginError";
  }
}

const identitySchema = z.object({
  tid: z.string().uuid(),
  oid: z.string().uuid(),
  acct: z.union([z.literal(0), z.literal("0")]),
  name: z.string().trim().min(1).optional(),
  email: z.string().optional(),
  preferred_username: z.string().optional()
});

// NextAuth validates the OIDC token; enforce our tenant and member-only policy here.
export function microsoftIdentity(profile: unknown) {
  const parsed = identitySchema.safeParse(profile);
  const claims = profile as { tid?: string; acct?: unknown } | undefined;
  if (typeof claims?.tid !== "string" || claims.tid.toLowerCase() !== process.env.AZURE_AD_TENANT_ID?.toLowerCase()) {
    throw new MicrosoftLoginError("MicrosoftTenantRequired");
  }
  if (!parsed.success) throw new MicrosoftLoginError("MicrosoftMemberRequired");
  const email = [parsed.data.preferred_username, parsed.data.email]
    .map((value) => value?.trim().toLowerCase())
    .find((value) => z.string().email().safeParse(value).success);
  if (!email) throw new MicrosoftLoginError("MicrosoftMemberRequired");
  return {
    microsoftId: `${parsed.data.tid.toLowerCase()}:${parsed.data.oid.toLowerCase()}`,
    email,
    displayName: parsed.data.name || email
  };
}

export async function signInMicrosoftUser(profile: unknown) {
  const identity = microsoftIdentity(profile);
  try {
    return await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { microsoftId: identity.microsoftId } });
      if (user && (!user.isActive || user.deletedAt || user.deactivatedAt)) {
        throw new MicrosoftLoginError("MicrosoftAccountInactive");
      }
      if (!user) {
        // Email is a contact field, not proof that a Microsoft identity owns an existing account.
        const existing = await tx.user.findFirst({ where: { email: { equals: identity.email, mode: "insensitive" } } });
        if (existing) throw new MicrosoftLoginError("MicrosoftAccountLinkRequired");
        const role = await tx.role.upsert({
          where: { name: staffRoleName },
          create: { name: staffRoleName, description: "Basic account access, pending administrator role assignment." },
          update: {}
        });
        user = await tx.user.create({ data: {
          ...identity, roleId: role.id, permissionLevel: "user", userType: "internal",
          isActive: true, mustChangePassword: false, passwordHash: null
        } });
        await tx.auditLog.create({ data: {
          userId: user.id, module: "auth", entityType: "User", entityId: user.id,
          action: "microsoft_user_provisioned", newValue: { role: staffRoleName, permissionLevel: "user" }
        } });
        const admins = await tx.user.findMany({
          where: { isActive: true, deletedAt: null, deactivatedAt: null, OR: [{ permissionLevel: "administrator" }, { role: { name: "Administrator" } }] },
          select: { id: true }
        });
        if (admins.length) await tx.notification.createMany({ data: admins.map((admin) => ({
          userId: admin.id, title: "New Microsoft 365 user",
          body: `${user!.displayName} has signed in. Review their ConnectedOS access.`,
          metadata: { href: "/admin/users" }
        })) });
      }
      user = await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await tx.auditLog.create({ data: {
        userId: user.id, module: "auth", entityType: "User", entityId: user.id,
        action: "microsoft_login", newValue: { microsoftId: identity.microsoftId }
      } });
      return user;
    });
  } catch (error) {
    // A concurrent first sign-in must never create a duplicate or claim an email-matched account.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new MicrosoftLoginError("MicrosoftAccountLinkRequired");
    }
    throw error;
  }
}
