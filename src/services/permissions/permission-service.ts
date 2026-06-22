import { prisma } from "@/lib/prisma";

export function hasPermissionFromCodes(userPermissions: string[], requiredPermission: string) {
  return userPermissions.includes(requiredPermission);
}

export async function getUserPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } }
  });

  if (!user) return [];
  if (user.permissionLevel === "administrator") {
    const permissions = await prisma.permission.findMany({ select: { code: true } });
    return permissions.map((permission) => permission.code);
  }
  return user.role.rolePermissions.map((rolePermission) => rolePermission.permission.code);
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
