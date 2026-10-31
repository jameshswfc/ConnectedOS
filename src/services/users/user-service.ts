import { PermissionLevel, type Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, assertPasswordConfirmation, verifyPassword } from "@/services/auth/password-service";
import { createAuditLog } from "@/services/audit/audit-service";
import { userRolesInclude, usersWithRoles } from "@/services/permissions/user-roles";
import { assertUserPermission } from "@/services/permissions/permission-service";
import type { ChangePasswordInput, MeUpdateInput, UserCreateInput, UserResetPasswordInput, UserUpdateInput } from "@/services/users/user-schemas";

export const adminIssuedPasswordRequiresChange = true;
export const completedPasswordChangeRequiresChange = false;

export async function listUsers(includeInactive = true) {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(includeInactive ? {} : { isActive: true, deactivatedAt: null })
    },
    include: userRolesInclude,
    orderBy: {
      displayName: "asc"
    }
  });
  return users.map(sanitizeUser);
}

export async function getUser(id: string) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null }, include: userRolesInclude });
  if (!user) throw new Error("User not found");
  return sanitizeUser(user);
}

export async function createUser(adminUserId: string, input: UserCreateInput) {
  await assertUserPermission(adminUserId, "admin.users");
  assertPasswordConfirmation(input.password, input.confirmPassword);
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
  const additionalRoleIds = await validateRoleAssignment(tx, input.roleId, input.additionalRoleIds ?? []);
  const created = await tx.user.create({
    data: {
      displayName: input.name,
      email: input.email,
      passwordHash,
      roleId: input.roleId,
      userRoles: { create: additionalRoleIds.map((roleId) => ({ roleId })) },
      permissionLevel: input.permissionLevel,
      isActive: input.isActive,
      mustChangePassword: adminIssuedPasswordRequiresChange,
      userType: "internal",
      createdById: adminUserId,
      updatedById: adminUserId
    },
    include: userRolesInclude
  });
  await tx.auditLog.create({ data: { userId: adminUserId, module: "admin", entityType: "User", entityId: created.id, action: "create_user", newValue: auditUserValue(created) } });
  return sanitizeUser(created);
  });
}

export async function updateUser(adminUserId: string, id: string, input: UserUpdateInput) {
  await assertUserPermission(adminUserId, "admin.users");
  return prisma.$transaction(async (tx) => {
  const previous = await tx.user.findFirst({ where: { id, deletedAt: null }, include: userRolesInclude });
  if (!previous) throw new Error("User not found");
  const rolesChanged = input.roleId !== undefined || input.additionalRoleIds !== undefined;
  const additionalRoleIds = rolesChanged ? await validateRoleAssignment(tx, input.roleId ?? previous.roleId, input.additionalRoleIds ?? previous.userRoles.map((item) => item.roleId)) : undefined;
  const updated = await tx.user.update({
    where: { id },
    data: {
      displayName: input.name,
      email: input.email,
      roleId: input.roleId,
      ...(additionalRoleIds ? { userRoles: { deleteMany: {}, create: additionalRoleIds.map((roleId) => ({ roleId })) } } : {}),
      permissionLevel: input.permissionLevel,
      isActive: input.isActive,
      deactivatedAt: input.isActive === false && previous.isActive ? new Date() : input.isActive === true ? null : undefined,
      updatedById: adminUserId
    },
    include: userRolesInclude
  });
  await tx.auditLog.create({ data: { userId: adminUserId, module: "admin", entityType: "User", entityId: id, action: "update_user", previousValue: auditUserValue(previous), newValue: auditUserValue(updated) } });
  return sanitizeUser(updated);
  });
}

export class UserManagementValidationError extends Error {}

async function validateRoleAssignment(tx: Prisma.TransactionClient, primaryRoleId: string, additional: string[]) {
  const extraIds = [...new Set(additional)].filter((id) => id !== primaryRoleId);
  const ids = [primaryRoleId, ...extraIds];
  const roles = await tx.role.findMany({ where: { id: { in: ids }, name: { in: [...businessRoleNames] } } });
  if (roles.length !== ids.length) throw new UserManagementValidationError("Select valid business roles.");
  if (roles.some((role) => role.name === "Administrator" && role.id !== primaryRoleId)) throw new UserManagementValidationError("Administrator must be the primary role, not an additional role.");
  if (roles.length > 1 && roles.some((role) => role.name === "Staff")) throw new UserManagementValidationError("Replace Staff with a business role before adding other roles.");
  return extraIds;
}

export async function archiveUser(adminUserId: string, id: string) {
  await assertUserPermission(adminUserId, "admin.users");
  if (id === adminUserId) throw new UserManagementValidationError("You cannot archive your own account.");
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id }, include: userRolesInclude });
    if (!user) throw new Error("User not found");
    if (user.isActive) throw new UserManagementValidationError("Deactivate the user before archiving their account.");
    if (user.deletedAt) return { id, archived: true };
    await tx.user.update({ where: { id }, data: { deletedAt: new Date(), deletedById: adminUserId, updatedById: adminUserId } });
    await tx.auditLog.create({ data: { userId: adminUserId, module: "admin", entityType: "User", entityId: id, action: "archive_user", previousValue: auditUserValue(user), newValue: { archived: true, signInBlocked: true } } });
    return { id, archived: true };
  });
}

export async function deactivateUser(adminUserId: string, id: string) {
  return updateUser(adminUserId, id, { isActive: false });
}

export async function resetUserPassword(adminUserId: string, id: string, input: UserResetPasswordInput) {
  assertPasswordConfirmation(input.password, input.confirmPassword);
  const passwordHash = await hashPassword(input.password);
  const previous = await prisma.user.findFirst({ where: { id, deletedAt: null }, include: { role: true } });
  if (!previous) throw new Error("User not found");
  const updated = await prisma.user.update({
    where: { id },
    data: { passwordHash, mustChangePassword: adminIssuedPasswordRequiresChange, updatedById: adminUserId },
    include: { role: true }
  });
  await createAuditLog({ userId: adminUserId, module: "admin", entityType: "User", entityId: id, action: "reset_password", previousValue: auditUserValue(previous), newValue: auditUserValue(updated) });
  return sanitizeUser(updated);
}

export async function getMe(userId: string) {
  return getUser(userId);
}

export async function updateMe(userId: string, input: MeUpdateInput) {
  const previous = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, include: { role: true } });
  if (!previous) throw new Error("User not found");
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { displayName: input.name, updatedById: userId },
    include: { role: true }
  });
  await createAuditLog({ userId, module: "admin", entityType: "User", entityId: userId, action: "update_profile", previousValue: auditUserValue(previous), newValue: auditUserValue(updated) });
  return sanitizeUser(updated);
}

export async function changeMyPassword(userId: string, input: ChangePasswordInput) {
  assertPasswordConfirmation(input.password, input.confirmPassword);
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, include: { role: true } });
  if (!user) throw new Error("User not found");
  if (!await verifyPassword(input.currentPassword, user.passwordHash)) {
    throw new Error("Current password is incorrect.");
  }
  const passwordHash = await hashPassword(input.password);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: completedPasswordChangeRequiresChange, updatedById: userId },
    include: { role: true }
  });
  await createAuditLog({ userId, module: "admin", entityType: "User", entityId: userId, action: "change_password", newValue: auditUserValue(updated) });
  return sanitizeUser(updated);
}

export async function listRoles() {
  const roles = await prisma.role.findMany({
    where: { name: { in: [...businessRoleNames] } },
    include: {
      _count: {
        select: {
          users: true,
          userRoles: true,
          rolePermissions: true
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });
  return roles.map((role) => ({ ...role, _count: { ...role._count, users: role._count.users + role._count.userRoles } }));
}

export async function listBusinessRoles() {
  return prisma.role.findMany({
    where: { name: { in: [...businessRoleNames] } },
    orderBy: { name: "asc" }
  });
}

export const businessRoleNames = ["Administrator", "Sales", "Pre-Sales", "Project Engineer", "Project Manager", "Field Engineer", "Finance", "Business Operations", "Staff"] as const;

export const approvedRoleAccess: Record<(typeof businessRoleNames)[number], string> = {
  Staff: "Basic account access only. An administrator assigns a business role before operational records are available.",
  Administrator: "Everything, user administration, roles, permissions, settings and all current and future modules.",
  Sales: "Accounts, contacts, leads, opportunities, CRM pipeline, CRM forecast, activities, pre-sales and quotes.",
  "Pre-Sales": "Accounts, contacts, leads, opportunities, activities, pre-sales and quotes.",
  "Project Engineer": "Projects, pre-sales, field services and project management.",
  "Project Manager": "Projects, field services and project management.",
  "Field Engineer": "Field services.",
  Finance: "Finance, expenses approvals/payment, procurement financial visibility and finance reporting.",
  "Business Operations": "CRM, pipeline and forecast, activities, pre-sales, projects, field services, project management, products, price imports and quotes."
};

export function administratorPermissionCodes(allPermissions: string[]) {
  return allPermissions;
}

export function standardUserPermissionCodes() {
  return [];
}

export function permissionCodesForLevel(permissionLevel: PermissionLevel, rolePermissionCodes: string[], allPermissionCodes: string[]) {
  if (permissionLevel === PermissionLevel.administrator) {
    return administratorPermissionCodes(allPermissionCodes);
  }
  return [...new Set([...rolePermissionCodes, ...standardUserPermissionCodes()])];
}

export type SanitizedUser = ReturnType<typeof sanitizeUser>;

function sanitizeUser<TUser extends User & { role?: { id: string; name: string }; userRoles?: { role: { id: string; name: string } }[] }>(user: TUser) {
  return {
    id: user.id,
    name: user.displayName,
    displayName: user.displayName,
    email: user.email,
    roleId: user.roleId,
    role: user.role,
    additionalRoles: (user.userRoles ?? []).map(({ role }) => ({ id: role.id, name: role.name })),
    permissionLevel: user.permissionLevel,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    microsoftId: user.microsoftId,
    hasLocalPassword: Boolean(user.passwordHash),
    lastLoginAt: user.lastLoginAt,
    userType: user.userType,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deactivatedAt: user.deactivatedAt,
    deletedAt: user.deletedAt
  };
}

function auditUserValue(user: User & { role?: { name: string }; userRoles?: { role: { id: string; name: string } }[] }): Prisma.InputJsonValue {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    roleId: user.roleId,
    role: user.role?.name,
    additionalRoles: (user.userRoles ?? []).map(({ role }) => ({ id: role.id, name: role.name })),
    permissionLevel: user.permissionLevel,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    deactivatedAt: user.deactivatedAt?.toISOString() ?? null
  };
}

export async function listPermissions() {
  return prisma.permission.findMany({
    orderBy: [
      {
        module: "asc"
      },
      {
        code: "asc"
      }
    ]
  });
}

export async function listActiveUsersByRole(roleName: string) {
  return prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      deactivatedAt: null,
      ...usersWithRoles([roleName])
    },
    include: {
      role: true
    },
    orderBy: [{ displayName: "asc" }, { email: "asc" }]
  });
}

export async function listActiveUserOptionsByRole(roleName: string) {
  const users = await listActiveUsersByRole(roleName);
  return users.map((user) => ({
    id: user.id,
    label: user.displayName || user.email,
    email: user.email
  }));
}

export async function findPreferredApprovers(preferredEmail: string, preferredName?: string) {
  const preferred = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      deactivatedAt: null,
      OR: [
        { email: { equals: preferredEmail.trim().toLowerCase(), mode: "insensitive" } },
        ...(preferredName ? [{ displayName: { equals: preferredName, mode: "insensitive" as const } }] : [])
      ]
    },
    include: { role: true },
    orderBy: { displayName: "asc" }
  });

  if (preferred.length) return preferred;

  return prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      deactivatedAt: null,
      OR: [
        { permissionLevel: "administrator" },
        { role: { name: "Administrator" } }
      ]
    },
    include: { role: true },
    orderBy: { displayName: "asc" }
  });
}
