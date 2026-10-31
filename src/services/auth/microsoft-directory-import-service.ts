import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertUserPermission } from "@/services/permissions/permission-service";
import { staffRoleName } from "./microsoft-login-service";

// This is an administrator-reviewed directory snapshot, never a sign-in token.
export const microsoftDirectorySnapshotSchema = z.object({
  tenantId: z.string().uuid().transform((value) => value.toLowerCase()),
  users: z.array(z.object({
    objectId: z.string().uuid().transform((value) => value.toLowerCase()),
    email: z.string().trim().min(1).max(320).transform((value) => value.toLowerCase()),
    displayName: z.string().trim().min(1).max(200),
    userType: z.enum(["Member", "Guest"]).nullable(),
    accountEnabled: z.boolean()
  }).strict().refine((entry) => entry.userType === "Guest" || z.string().email().safeParse(entry.email).success, {
    message: "Member account must have a valid sign-in email.", path: ["email"]
  })).min(1).max(10000)
}).strict();

type LocalIdentity = {
  id: string; email: string; microsoftId: string | null;
  isActive: boolean; deletedAt: Date | null; deactivatedAt: Date | null;
};
type ImportRow = {
  email: string; displayName: string; microsoftId: string;
  action: "create" | "link" | "unchanged" | "skip" | "conflict";
  userId?: string; reason?: string;
};

export function planMicrosoftDirectoryImport(snapshot: unknown, users: LocalIdentity[], configuredTenant: string | undefined): ImportRow[] {
  const input = microsoftDirectorySnapshotSchema.parse(snapshot);
  if (input.tenantId !== configuredTenant?.toLowerCase()) throw new Error("Directory tenant does not match the configured Microsoft tenant.");
  const ids = new Set<string>();
  const emails = new Set<string>();
  return input.users.map((entry): ImportRow => {
    const row = { email: entry.email, displayName: entry.displayName, microsoftId: `${input.tenantId}:${entry.objectId}` };
    if (ids.has(entry.objectId) || emails.has(entry.email)) throw new Error("Duplicate identity or email in directory snapshot. Review the source before importing.");
    ids.add(entry.objectId);
    emails.add(entry.email);
    if (!entry.accountEnabled || entry.userType === "Guest") return { ...row, action: "skip", reason: "Guest or disabled Microsoft account." };
    const linked = users.filter((user) => user.microsoftId === row.microsoftId);
    const matched = users.filter((user) => user.email.trim().toLowerCase() === entry.email);
    if (linked.length > 1 || matched.length > 1 || (linked[0] && matched.some((user) => user.id !== linked[0].id))) {
      return { ...row, action: "conflict", reason: "Ambiguous email or Microsoft identity ownership." };
    }
    const user = linked[0] || matched[0];
    if (user && (!user.isActive || user.deletedAt || user.deactivatedAt)) return { ...row, action: "skip", userId: user.id, reason: "Local account is inactive; import cannot reactivate it." };
    if (linked[0]) return { ...row, action: "unchanged", userId: linked[0].id };
    // Legacy blank user types may retain a verified existing link, but cannot acquire access here.
    if (entry.userType !== "Member") return { ...row, action: "skip", reason: "Microsoft membership is not verified." };
    if (user?.microsoftId) return { ...row, action: "conflict", userId: user.id, reason: "Email belongs to a different linked Microsoft identity." };
    return user ? { ...row, action: "link", userId: user.id } : { ...row, action: "create" };
  });
}

export async function importMicrosoftDirectory(adminUserId: string, snapshot: unknown, apply = false) {
  await assertUserPermission(adminUserId, "admin.users");
  return prisma.$transaction(async (tx) => {
    const users = await tx.user.findMany({ select: {
      id: true, email: true, microsoftId: true, isActive: true, deletedAt: true, deactivatedAt: true
    } });
    const plan = planMicrosoftDirectoryImport(snapshot, users, process.env.AZURE_AD_TENANT_ID);
    if (!apply) return plan;
    if (plan.some((row) => row.action === "conflict")) throw new Error("Import stopped: resolve all identity conflicts shown in the preview first. No users were changed.");
    let staffRoleId: string | undefined;
    if (plan.some((row) => row.action === "create")) {
      const role = await tx.role.upsert({
        where: { name: staffRoleName }, update: {},
        create: { name: staffRoleName, description: "Basic account access, pending administrator role assignment." },
        include: { rolePermissions: true }
      });
      if (role.rolePermissions.length) throw new Error("Staff role has operational permissions. Review its access before importing new users.");
      staffRoleId = role.id;
    }
    for (const row of plan) {
      if (row.action !== "link" && row.action !== "create") continue;
      const user = row.action === "link"
        ? await tx.user.update({ where: { id: row.userId! }, data: { microsoftId: row.microsoftId, updatedById: adminUserId } })
        : await tx.user.create({ data: {
          email: row.email, displayName: row.displayName, microsoftId: row.microsoftId,
          roleId: staffRoleId!, permissionLevel: "user", userType: "internal", isActive: true,
          passwordHash: null, mustChangePassword: false, createdById: adminUserId, updatedById: adminUserId
        } });
      row.userId = user.id;
      await tx.auditLog.create({ data: {
        userId: adminUserId, module: "admin", entityType: "User", entityId: user.id,
        action: row.action === "link" ? "link_microsoft_identity" : "microsoft_directory_user_created",
        previousValue: row.action === "link" ? { microsoftId: null } : Prisma.JsonNull,
        newValue: { microsoftId: row.microsoftId, source: "administrator_reviewed_directory", ...(row.action === "create" ? { role: staffRoleName, permissionLevel: "user" } : {}) }
      } });
    }
    return plan;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
}
