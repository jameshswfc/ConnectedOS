import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { activeProjectStatuses, getProjectsDashboard, listProjectManagers, projectCompletionPercent, type ProjectDashboardView } from "@/modules/projects/project-service";
import { ProjectBadge } from "@/modules/projects/ui/project-badge";
import { formatProjectDate, formatProjectMoney, formatProjectNumber } from "@/modules/projects/ui/project-format";

type PageProps = { searchParams?: Promise<{ status?: string; ragStatus?: string; projectManagerId?: string; overdue?: string; endingNext30Days?: string; overResourceBudget?: string; openIssues?: string; view?: string }> };

const projectViews: Array<{ value: ProjectDashboardView; label: string }> = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" }
];

export default async function ProjectsPage({ searchParams }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const params = await searchParams;
  const activeView = projectViews.some((view) => view.value === params?.view) ? params?.view as ProjectDashboardView : "active";
  let data: [Awaited<ReturnType<typeof getProjectsDashboard>>, Awaited<ReturnType<typeof listProjectManagers>>] | null = null;
  try {
    data = await Promise.all([
      getProjectsDashboard(context, {
        view: activeView,
        status: params?.status as never,
        ragStatus: params?.ragStatus as never,
        projectManagerId: params?.projectManagerId || undefined,
        overdue: params?.overdue === "true" ? true : undefined,
        endingNext30Days: params?.endingNext30Days === "true" ? true : undefined,
        overResourceBudget: params?.overResourceBudget === "true" ? true : undefined,
        openIssues: params?.openIssues === "true" ? true : undefined
      }),
      listProjectManagers()
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing permission")) {
      data = null;
    } else {
      throw error;
    }
  }
  if (!data) return <AppShell title="Projects" userName={userName}><AccessDenied /></AppShell>;
  const [dashboard, managers] = data;
  return (
    <AppShell title="Projects" userName={userName}>
      <div className="mb-4 flex flex-wrap justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {projectViews.map((view) => (
            <Link key={view.value} href={`/projects?view=${view.value}`}>
              <Button variant={activeView === view.value ? "primary" : "secondary"}>{view.label}</Button>
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <input type="hidden" name="view" value={activeView} />
          <select name="status" defaultValue={params?.status ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm"><option value="">All statuses</option>{["draft", "initiation", "planning", "active", "on_hold", "at_risk", "completed", "closed", "cancelled"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select>
          <select name="ragStatus" defaultValue={params?.ragStatus ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm"><option value="">All RAG</option>{["green", "amber", "red"].map((status) => <option key={status} value={status}>{status}</option>)}</select>
          <select name="projectManagerId" defaultValue={params?.projectManagerId ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm"><option value="">All PMs</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.displayName}</option>)}</select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="overdue" value="true" defaultChecked={params?.overdue === "true"} /> Overdue</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="endingNext30Days" value="true" defaultChecked={params?.endingNext30Days === "true"} /> Ending 30 days</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="overResourceBudget" value="true" defaultChecked={params?.overResourceBudget === "true"} /> Over resource</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="openIssues" value="true" defaultChecked={params?.openIssues === "true"} /> Open issues</label>
          <Button type="submit" variant="secondary">Filter</Button>
        </form>
        <div className="flex gap-2">
          <Link href="/projects/task-templates"><Button variant="secondary">Task Templates</Button></Link>
          <Link href="/projects/new"><Button>Create Project</Button></Link>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Active projects" value={dashboard.activeProjects} />
        <Metric title="Starting this week" value={dashboard.startingThisWeek} />
        <Metric title="Overdue projects" value={dashboard.overdueProjects} />
        <Metric title="Open issues/actions" value={dashboard.openIssuesActions} />
        <Metric title="RAG green / amber / red" value={`${dashboard.ragSummary.green} / ${dashboard.ragSummary.amber} / ${dashboard.ragSummary.red}`} />
        <Metric title="Resource days remaining" value={formatProjectNumber(dashboard.resourceDaysRemaining)} />
        <Metric title="Progress summary" value={`${dashboard.averageCompletionPercent}% avg`} />
        <Metric title="Ending this week" value={dashboard.endingThisWeek} />
        <Metric title="Ending next 30 days" value={dashboard.endingNext30Days} />
        <Metric title="Over resource budget" value={dashboard.overResourceBudget} />
        <Metric title="Awaiting closure" value={dashboard.awaitingClosure} />
        <Metric title="Total contract value" value={formatProjectMoney(dashboard.totalContractValue)} />
        <Metric title="Outstanding billing" value={formatProjectMoney(dashboard.outstandingBilling)} />
        <Metric title="Margin at risk" value={dashboard.marginAtRisk} />
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Account</TableHead><TableHead>Status</TableHead><TableHead>RAG</TableHead><TableHead>Progress %</TableHead><TableHead>PM</TableHead><TableHead>Start</TableHead><TableHead>Target End</TableHead><TableHead>Value</TableHead><TableHead>Days</TableHead></TableRow></TableHeader><TableBody>
          {dashboard.projects.map((project) => {
            const remaining = Number(project.totalResourceDaysBudget) - Math.max(Number(project.totalResourceDaysScheduled), Number(project.totalResourceDaysUsed));
            const progress = projectCompletionPercent(project);
            return <TableRow key={project.id}><TableCell><Link href={`/projects/${project.id}`} className="font-medium text-brand-700">{project.projectNumber}<br /><span className="text-slate-700">{project.name}</span></Link></TableCell><TableCell>{project.account.name}</TableCell><TableCell><ProjectBadge value={project.status} /></TableCell><TableCell><ProjectBadge value={project.ragStatus} /></TableCell><TableCell><div className="min-w-24"><span className="text-sm font-medium">{progress}%</span><div className="mt-1 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-brand-700" style={{ width: `${progress}%` }} /></div></div></TableCell><TableCell>{project.projectManager?.displayName ?? "-"}</TableCell><TableCell>{formatProjectDate(project.startDate)}</TableCell><TableCell>{formatProjectDate(project.targetEndDate)}</TableCell><TableCell>{formatProjectMoney(project.commercialValue)}</TableCell><TableCell>{formatProjectNumber(project.totalResourceDaysUsed)} used / {formatProjectNumber(remaining)} remaining</TableCell></TableRow>;
          })}
        </TableBody></Table>
      </div>
      {activeView === "active" ? <p className="mt-3 text-sm text-slate-500">Active view shows live delivery projects only: {activeProjectStatuses.map((status) => status.replaceAll("_", " ")).join(", ")}.</p> : null}
    </AppShell>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold text-brand-900">{value}</p></CardContent></Card>;
}
