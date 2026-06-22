import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listProjectTaskTemplates } from "@/modules/projects/project-service";
import { ProjectTaskTemplateForm } from "@/modules/projects/ui/project-actions";

export default async function ProjectTaskTemplatesPage() {
  const { context, userName } = await getCrmPageContext();
  let templates: Awaited<ReturnType<typeof listProjectTaskTemplates>> | null = null;
  try {
    if (!(context.permissionLevel === "administrator" || context.role === "Business Operations" || context.permissions.includes("admin.users"))) throw new Error("Missing permission: project template administration");
    templates = await listProjectTaskTemplates(context);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing permission")) templates = null;
    else throw error;
  }
  if (!templates) return <AppShell title="Project Task Templates" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title="Project Task Templates" userName={userName}>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card><CardHeader><CardTitle>Create template</CardTitle></CardHeader><CardContent><ProjectTaskTemplateForm /></CardContent></Card>
        <Card><CardHeader><CardTitle>Templates</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Project Type</TableHead><TableHead>Active</TableHead><TableHead>Items</TableHead></TableRow></TableHeader><TableBody>{templates.map((template) => <TableRow key={template.id}><TableCell>{template.name}</TableCell><TableCell>{template.projectType}</TableCell><TableCell>{template.isActive ? "Yes" : "No"}</TableCell><TableCell>{template.items.length}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      </div>
    </AppShell>
  );
}
