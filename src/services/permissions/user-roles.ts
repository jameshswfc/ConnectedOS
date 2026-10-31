import type { Prisma } from "@prisma/client";

export const userRolesInclude = { role: true, userRoles: { include: { role: true } } } as const;
const permissionsInclude = { include: { rolePermissions: { include: { permission: true } } } } as const;
export const userAccessInclude = { role: permissionsInclude, userRoles: { include: { role: permissionsInclude } } } as const;

type RoleShape = { name: string; rolePermissions?: { permission: { code: string } }[] };
type UserRoleShape = { role?: RoleShape | null; userRoles?: { role: RoleShape }[] };

export function assignedRoleNames(user: UserRoleShape): string[] {
  return [...new Set([...(user.role ? [user.role.name] : []), ...(user.userRoles ?? []).map(({ role }) => role.name)])];
}

export function combinedRolePermissions(user: UserRoleShape): string[] {
  const roles = [...(user.role ? [user.role] : []), ...(user.userRoles ?? []).map(({ role }) => role)];
  const permissions = [...new Set(roles.flatMap((role) => (role.rolePermissions ?? []).map(({ permission }) => permission.code)))];
  // Non-admin role combinations must never acquire user/security administration.
  return assignedRoleNames(user).includes("Administrator") ? permissions : permissions.filter((code) => !code.startsWith("admin."));
}

export function hasRole(context: { role?: string | null; roles?: string[] }, roleName: string) {
  return context.role === roleName || Boolean(context.roles?.includes(roleName));
}

export function usersWithRoles(roleNames: readonly string[]): Prisma.UserWhereInput {
  return { OR: [{ role: { name: { in: [...roleNames] } } }, { userRoles: { some: { role: { name: { in: [...roleNames] } } } } }] };
}
