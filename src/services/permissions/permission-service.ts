import { prisma } from "@/lib/prisma";
import { combinedRolePermissions, userAccessInclude } from "./user-roles";

export function hasPermissionFromCodes(userPermissions: string[], requiredPermission: string) {
  return userPermissions.includes(requiredPermission);
}

export async function getUserPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userAccessInclude
  });

  if (!user || !user.isActive || user.deletedAt || user.deactivatedAt) return [];
  if (user.permissionLevel === "administrator") {
    const permissions = await prisma.permission.findMany({ select: { code: true } });
    return permissions.map((permission) => permission.code);
  }
  return combinedRolePermissions(user);
}

export async function assertUserPermission(userId: string, requiredPermission: string) {
  const permissions = await getUserPermissions(userId);
  if (!hasPermissionFromCodes(permissions, requiredPermission)) {
    throw new Error(`Missing permission: ${requiredPermission}`);
  }
}

export async function userHasPermission(userId: string, requiredPermission: string) {
  const permissions = await getUserPermissions(userId);
  return hasPermissionFromCodes(permissions, requiredPermission);
}
