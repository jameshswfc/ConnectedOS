import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export async function getCrmPageContext(): Promise<{ context: CrmAccessContext; userName?: string | null }> {
  const user = await requireAuthenticatedUser();
  return {
    context: {
      userId: user.id,
      permissions: user.permissions,
      permissionLevel: user.permissionLevel,
      role: user.role
    },
    userName: user.name
  };
}
