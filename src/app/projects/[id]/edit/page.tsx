import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { opportunityTypeDefinitions } from "@/modules/crm/opportunities/opportunity-types";
import { getProject } from "@/modules/projects/project-service";
import { ProjectEditForm } from "@/modules/projects/ui/project-actions";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  let project: Awaited<ReturnType<typeof getProject>> | null = null;
  try {
    project = await getProject(context, id);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing permission")) project = null;
    else throw error;
  }
  if (!project) return <AppShell title="Edit Project" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title={`Edit ${project.projectNumber}`} userName={userName}>
      <Card><CardHeader><CardTitle>Project details</CardTitle></CardHeader><CardContent><ProjectEditForm project={{ id: project.id, name: project.name, projectType: project.projectType, status: project.status, startDate: project.startDate?.toISOString().slice(0, 10), targetEndDate: project.targetEndDate?.toISOString().slice(0, 10), baselineStartDate: project.baselineStartDate?.toISOString().slice(0, 10), baselineEndDate: project.baselineEndDate?.toISOString().slice(0, 10), actualStartDate: project.actualStartDate?.toISOString().slice(0, 10), actualEndDate: project.actualEndDate?.toISOString().slice(0, 10), scopeSummary: project.scopeSummary, description: project.description, totalResourceDaysBudget: Number(project.totalResourceDaysBudget), invoicedAmount: Number(project.invoicedAmount), collectedAmount: Number(project.collectedAmount), paymentTerms: project.paymentTerms }} projectTypes={opportunityTypeDefinitions.map((type) => ({ id: type.value, label: type.label }))} /></CardContent></Card>
    </AppShell>
  );
}
