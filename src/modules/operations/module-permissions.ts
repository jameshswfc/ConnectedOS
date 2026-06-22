import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export function isAdminContext(context: CrmAccessContext) {
  return context.permissionLevel === "administrator" || context.permissions.includes("admin.users");
}

export function assertModulePermission(context: CrmAccessContext, permission: string) {
  if (isAdminContext(context) || context.permissions.includes(permission)) return;
  throw new Error(`Missing permission: ${permission}`);
}

export function assertAnyModulePermission(context: CrmAccessContext, permissions: string[]) {
  if (isAdminContext(context) || permissions.some((permission) => context.permissions.includes(permission))) return;
  throw new Error(`Missing permission: ${permissions.join(" or ")}`);
}
