import { ResourceType } from "@prisma/client";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { ResourceEditor } from "@/modules/field-services/ui/resource-editor";
import { listUsers } from "@/services/users/user-service";

export default async function NewResourcePage() {
  const { context, userName } = await getCrmPageContext();
  if (!context.permissions.includes("field_services.manage_resources") && context.permissionLevel !== "administrator") {
    return <AppShell title="New Resource" userName={userName}><AccessDenied /></AppShell>;
  }
  const users = await listUsers(false);
  return (
    <AppShell title="New Resource" userName={userName}>
      <ResourceEditor
        mode="create"
        endpoint="/api/v1/resources"
        successHref="/field-services/resources/:id"
        users={users.map((user) => ({ id: user.id, label: user.displayName, email: user.email }))}
        initialValue={{
          resourceType: ResourceType.internal_user,
          displayName: "",
          skillTags: [],
          active: true
        }}
      />
    </AppShell>
  );
}
