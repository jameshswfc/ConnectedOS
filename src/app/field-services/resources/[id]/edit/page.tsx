import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getResource } from "@/modules/field-services/field-services-service";
import { ResourceEditor } from "@/modules/field-services/ui/resource-editor";
import { ResourceNotFoundCard } from "@/modules/field-services/ui/resource-not-found-card";
import { listUsers } from "@/services/users/user-service";

type Params = { params: Promise<{ id: string }> };

export default async function EditResourcePage({ params }: Params) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;

  if (!context.permissions.includes("field_services.manage_resources") && context.permissionLevel !== "administrator") {
    return <AppShell title="Edit Resource" userName={userName}><AccessDenied /></AppShell>;
  }

  let resource: Awaited<ReturnType<typeof getResource>> | null = null;
  let notFound = false;
  try {
    resource = await getResource(context, id);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
      notFound = true;
    } else if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) {
      throw error;
    }
  }

  if (notFound) {
    return <AppShell title="Edit Resource" userName={userName}><ResourceNotFoundCard /></AppShell>;
  }

  if (!resource) {
    return <AppShell title="Edit Resource" userName={userName}><AccessDenied /></AppShell>;
  }

  const users = await listUsers(false);

  return (
    <AppShell title={`Edit ${resource.displayName}`} userName={userName}>
      <ResourceEditor
        mode="edit"
        endpoint={`/api/v1/resources/${resource.id}`}
        successHref={`/field-services/resources/${resource.id}`}
        users={users.map((user) => ({ id: user.id, label: user.displayName, email: user.email }))}
        initialValue={{
          userId: resource.userId,
          resourceType: resource.resourceType,
          displayName: resource.displayName,
          companyName: resource.companyName,
          roleType: resource.roleType,
          skillTags: resource.skillTags,
          phone: resource.phone,
          email: resource.email,
          address: resource.address,
          agentName: resource.agentName,
          agentPhone: resource.agentPhone,
          agentEmail: resource.agentEmail,
          standardDayCost: Number(resource.standardDayCost),
          standardDaySell: Number(resource.standardDaySell),
          halfDayCost: Number(resource.halfDayCost),
          halfDaySell: Number(resource.halfDaySell),
          hourlyCost: Number(resource.hourlyCost),
          hourlySell: Number(resource.hourlySell),
          active: resource.active,
          notes: resource.notes
        }}
      />
    </AppShell>
  );
}
