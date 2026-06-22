import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { userHasPermission } from "@/services/permissions/permission-service";

export default async function AuditRedirectPage() {
  const user = await requireAuthenticatedUser();
  const canReadAudit = user.permissionLevel === "administrator"
    || user.role === "Business Operations"
    || await userHasPermission(user.id, "audit.read");
  redirect(canReadAudit ? "/admin/audit" : "/403");
}
