import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getProjectCreateOptions } from "@/modules/projects/project-service";
import { ProjectCreateForm } from "@/modules/projects/ui/project-actions";
import { formatProjectMoney } from "@/modules/projects/ui/project-format";
import { opportunityTypeDefinitions } from "@/modules/crm/opportunities/opportunity-types";

export default async function NewProjectPage() {
  const { context, userName } = await getCrmPageContext();
  let options: Awaited<ReturnType<typeof getProjectCreateOptions>> | null = null;
  try {
    options = await getProjectCreateOptions(context);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing permission")) options = null;
    else throw error;
  }
  if (!options) return <AppShell title="Create Project" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title="Create Project" userName={userName}>
      <Card>
        <CardHeader><CardTitle>Create project from approved / accepted quote</CardTitle></CardHeader>
        <CardContent>
          <ProjectCreateForm
            quotes={options.quotes.map((quote) => ({ id: quote.id, label: `${quote.quoteNumber} - ${quote.title}`, meta: `${quote.accountName} / ${formatProjectMoney(quote.value)}` }))}
            templates={options.templates.map((template) => ({ id: template.id, label: `${template.name} (${template.projectType})` }))}
            managers={options.managers.map((manager) => ({ id: manager.id, label: manager.name, meta: manager.email }))}
            projectTypes={opportunityTypeDefinitions.map((type) => ({ id: type.value, label: type.label }))}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
