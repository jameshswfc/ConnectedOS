import Link from "next/link";
import type { ReactNode } from "react";
import { AuditPanel } from "@/components/audit/audit-panel";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getOpportunityTypeLabel } from "@/modules/crm/opportunities/opportunity-types";
import { buildProjectResourceOptions, buildProjectUserOptions, serializeProject, type SerializableProject } from "@/modules/projects/project-serializer";
import { projectResourceDisplayName } from "@/modules/projects/project-resource-label";
import { getProject, listProjectResources, listProjectUsers, projectCompletionPercent, projectResourceDayMetrics, projectTaskDayMetrics } from "@/modules/projects/project-service";
import { calculateProjectScheduleVariance } from "@/modules/projects/project-baseline-service";
import { calculateProjectBudgetVariance } from "@/modules/projects/project-budget-variance";
import { buildProjectGanttData } from "@/modules/projects/project-gantt-service";
import { buildProjectCalendarData } from "@/modules/projects/project-calendar-service";
import { linkedTaskForMilestone, stageGateCompletionConditions } from "@/modules/projects/project-stage-automation";
import { dependencyReason } from "@/modules/projects/project-dependency-scheduling";
import { ProjectBadge } from "@/modules/projects/ui/project-badge";
import { AddDefaultDependenciesButton, AddDefaultTasksButton, CreateChangeQuoteButton, ProjectChangeRequestActionButtons, ProjectFinancialQuickForm, ProjectFormQuickForm, ProjectIssueQuickForm, ProjectLockPlanButton, ProjectMilestoneActionButtons, ProjectMilestoneInlineEditForm, ProjectResourceDeleteButton, ProjectResourceQuickForm, ProjectStageGateActionButtons, ProjectTaskActionButtons, ProjectTaskDependencyCreateForm, ProjectTaskDependencyDeleteButton, ProjectTaskInlineEditForm, ProjectTaskQuickForm } from "@/modules/projects/ui/project-actions";
import { formatProjectDate, formatProjectMoney, formatProjectNumber, projectLabel } from "@/modules/projects/ui/project-format";

type PageProps = { params: Promise<{ id: string }> };
type ProjectData = Awaited<ReturnType<typeof getProject>>;
type SerializedProject = SerializableProject<ProjectData>;

const tabs = ["Overview", "Pre-Sales Handover", "Milestones", "Tasks", "Schedule", "Calendar", "Gantt", "Resources", "Budget", "Issues & Actions", "Daily Updates", "Weekly Updates", "Implementation Document", "Change Requests", "Closure", "Support Handover", "Documents", "Audit"];

export default async function ProjectDetailPage({ params }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  let data: [Awaited<ReturnType<typeof getProject>>, Awaited<ReturnType<typeof listProjectUsers>>, Awaited<ReturnType<typeof listProjectResources>>] | null = null;
  try {
    data = await Promise.all([getProject(context, id), listProjectUsers(), listProjectResources(context)]);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing permission")) data = null;
    else throw error;
  }
  if (!data) return <AppShell title="Project" userName={userName}><AccessDenied /></AppShell>;
  const [project, users, resources] = data;
  const projectClient = serializeProject(project);
  const userOptions = buildProjectUserOptions(users);
  const resourceOptions = buildProjectResourceOptions(resources);
  const resourceMetrics = projectResourceDayMetrics({ allocatedDays: project.totalResourceDaysBudget, scheduledDays: project.totalResourceDaysScheduled, actualDaysUsed: project.totalResourceDaysUsed });
  const taskDayMetrics = projectTaskDayMetrics(project);
  const variance = calculateProjectScheduleVariance(project);
  const completionPercent = projectCompletionPercent(project);
  return (
      <AppShell title={`${project.projectNumber} - ${project.name}`} userName={userName}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">{tabs.map((tab) => <a key={tab} href={`#${slug(tab)}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-brand-200 hover:bg-brand-50">{tab}</a>)}</div>
          <Link href={`/projects/${project.id}/edit`}><Button>Edit Project</Button></Link>
        </div>
        <section id="overview" className="grid gap-4 lg:grid-cols-4">
          <Card><CardHeader><CardTitle>Overview</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Account: <Link href={`/crm/accounts/${project.accountId}`} className="font-medium text-brand-700">{project.account.name}</Link></p><p>Opportunity: <Link href={`/crm/opportunities/${project.opportunityId}`} className="font-medium text-brand-700">{project.opportunity.opportunityName}</Link></p><p>Quote: <Link href={`/quotes/${project.quoteId}`} className="font-medium text-brand-700">{project.quote.quoteNumber}</Link></p><p>Pre-Sales: {project.presalesRequest ? <Link href={`/presales/${project.presalesRequest.id}`} className="font-medium text-brand-700">{project.presalesRequest.requestNumber}</Link> : "-"}</p><p>Project type: {getOpportunityTypeLabel(project.projectType)}</p><p>PM: {project.projectManager?.displayName ?? "Unassigned"}</p><p>Salesperson: {project.opportunity.owner.displayName}</p><p>Status: <ProjectBadge value={project.status} /></p><p>RAG: <ProjectBadge value={project.ragStatus} /></p></CardContent></Card>
          <Card><CardHeader><CardTitle>Progress</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-4xl font-semibold text-brand-900">{completionPercent}%</p><div className="h-3 rounded-full bg-slate-200"><div className="h-3 rounded-full bg-brand-700" style={{ width: `${completionPercent}%` }} /></div><p className="text-sm text-slate-600">Project completion from active tasks.</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Dates & Resource Budget</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Baseline start: {formatProjectDate(project.baselineStartDate)}</p><p>Baseline finish: {formatProjectDate(project.baselineEndDate)}</p><p>Current start: {formatProjectDate(project.startDate)}</p><p>Current finish: {formatProjectDate(project.targetEndDate)}</p><p>Actual start: {formatProjectDate(project.actualStartDate)}</p><p>Actual finish: {formatProjectDate(project.actualEndDate)}</p><p>Schedule variance: {variance.scheduleVarianceLabel}</p><p>Estimated task days: {formatProjectNumber(taskDayMetrics.estimatedDays)}</p><p>Actual task days: {formatProjectNumber(taskDayMetrics.actualDays)}</p><p>Task days variance: {formatProjectNumber(taskDayMetrics.variance)} ({taskDayMetrics.varianceLabel})</p><p>Resource scheduled days: {formatProjectNumber(resourceMetrics.scheduledDays)}</p><p>Resource actual days used: {formatProjectNumber(resourceMetrics.actualDaysUsed)}</p><p>Resource remaining days: {formatProjectNumber(resourceMetrics.remainingDays)}</p><p>Utilisation: {resourceMetrics.utilisationPercent}%</p>{taskDayMetrics.overEstimate ? <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">Task effort over estimate</p> : null}</CardContent></Card>
          <Card><CardHeader><CardTitle>Commercial</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Commercial value: {formatProjectMoney(project.commercialValue)}</p><p>Budget cost: {formatProjectMoney(project.budgetCost)}</p><p>Budget sell: {formatProjectMoney(project.budgetSell)}</p><p>Invoiced: {formatProjectMoney(project.invoicedAmount)}</p><p>Collected: {formatProjectMoney(project.collectedAmount)}</p><p>Outstanding: {formatProjectMoney(project.outstandingAmount)}</p></CardContent></Card>
        </section>
        <Section title="Project Stage Gates"><StageGatesList project={project} /></Section>
        <Card className="mt-4"><CardHeader><CardTitle>Scope Summary</CardTitle></CardHeader><CardContent className="whitespace-pre-wrap text-sm text-slate-700">{project.scopeSummary || project.description || "No scope summary recorded."}</CardContent></Card>
        <Section title="Pre-Sales Handover"><PresalesHandover project={project} /></Section>
        <Section title="Milestones"><MilestonesTable project={projectClient} projectType={project.projectType} users={userOptions} /></Section>
        <Section title="Tasks"><div className="flex flex-wrap gap-2"><ProjectTaskQuickForm projectId={project.id} users={userOptions} /><AddDefaultTasksButton projectId={project.id} /><AddDefaultDependenciesButton projectId={project.id} /><ProjectLockPlanButton projectId={project.id} /></div><ProjectTasksTable tasks={projectClient.tasks} users={userOptions} /></Section>
        <Section title="Schedule"><ScheduleTable project={project} /></Section>
        <Section title="Calendar"><CalendarSummary project={project} /></Section>
        <Section title="Gantt"><GanttSummary project={project} /></Section>
        <Section title="Resources"><ProjectResourceQuickForm projectId={project.id} resources={resourceOptions} /><ResourcesTable resources={projectClient.resourceAssignments} /></Section>
        <Section title="Budget"><ProjectFinancialQuickForm projectId={project.id} /><BudgetSummary project={project} planBaselinedAt={project.planBaselinedAt} /></Section>
        <Section title="Issues & Actions"><ProjectIssueQuickForm projectId={project.id} users={userOptions} /><IssuesTable items={project.issueActions} projectId={project.id} /></Section>
        <Section title="Daily Updates"><ProjectFormQuickForm projectId={project.id} formType="daily_update" buttonLabel="Add Daily Update" /><FormsList projectId={project.id} forms={project.forms.filter((form) => form.formType === "daily_update")} exportBase="daily-update" /></Section>
        <Section title="Weekly Updates"><ProjectFormQuickForm projectId={project.id} formType="weekly_update" buttonLabel="Add Weekly Update" /><FormsList projectId={project.id} forms={project.forms.filter((form) => form.formType === "weekly_update")} exportBase="weekly-update" /></Section>
        <Section title="Implementation Document"><p className="text-sm text-slate-600">Structured implementation document compiled from project, pre-sales and resource data.</p><Link href={`/api/v1/projects/${project.id}/exports/implementation-document/pdf`}><Button>Export PDF</Button></Link></Section>
        <Section title="Change Requests"><ProjectFormQuickForm projectId={project.id} formType="change_request" buttonLabel="Add Change Request" /><FormsList projectId={project.id} forms={project.forms.filter((form) => form.formType === "change_request")} exportBase="change-request" /></Section>
        <Section title="Closure"><ProjectFormQuickForm projectId={project.id} formType="closure" buttonLabel="Add Closure Form" /><Link href={`/api/v1/projects/${project.id}/exports/closure/pdf`}><Button>Export Closure PDF</Button></Link></Section>
        <Section title="Support Handover"><ProjectFormQuickForm projectId={project.id} formType="support_handover" buttonLabel="Add Support Handover" /><Link href={`/api/v1/projects/${project.id}/exports/support-handover/pdf`}><Button>Export Handover PDF</Button></Link></Section>
        <Section title="Documents">{project.documentRecords.length ? project.documentRecords.map((record) => <p key={record.id} className="text-sm">{record.document.fileName} - {projectLabel(record.documentType)}</p>) : <p className="text-sm text-slate-500">No project documents linked yet. SharePoint live upload remains deferred.</p>}</Section>
        <Section title="Audit"><AuditPanel title="Project Audit" module="projects" entityType="Project" entityId={project.id} /></Section>
      </AppShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <Card id={slug(title)} className="mt-4"><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-4">{children}</CardContent></Card>;
}

function ProjectTasksTable({ tasks, users }: { tasks: SerializedProject["tasks"]; users: { id: string; label: string }[] }) {
  const dependencyTaskOptions = tasks.map((task) => ({ id: task.id, label: task.title }));
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  return <Table><TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Assignee</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead><TableHead>Days</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{tasks.map((task) => {
    const dependencies = (task.predecessors ?? []).map((dependency) => {
      const predecessor = taskById.get(String(dependency.predecessorTaskId ?? ""));
      return {
        id: dependency.id,
        label: predecessor ? dependencyReason(predecessor.title, String(dependency.dependencyType ?? "finish_to_start"), Number(dependency.lagDays ?? 0)) : "Dependency"
      };
    });
    return (
      <TableRow key={task.id} className="align-top">
        <TableCell>
          <div className="space-y-2">
            <div>{task.title}</div>
            {dependencies.length ? (
              <div className="space-y-1 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                {dependencies.map((dependency) => <div key={dependency.id}>{dependency.label}</div>)}
              </div>
            ) : null}
            <details className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <summary className="cursor-pointer text-xs font-medium text-brand-700">Edit task</summary>
              <div className="mt-3 space-y-3">
                <ProjectTaskInlineEditForm task={task} users={users} />
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Dependencies</p>
                  <ProjectTaskDependencyCreateForm successorTaskId={task.id} taskOptions={dependencyTaskOptions.filter((option) => option.id !== task.id)} />
                  <div className="space-y-2">
                    {dependencies.map((dependency) => (
                      <div key={dependency.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        <span>{dependency.label}</span>
                        <ProjectTaskDependencyDeleteButton dependencyId={dependency.id} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          </div>
        </TableCell>
        <TableCell>{task.assignedTo?.displayName ?? "-"}</TableCell>
        <TableCell>{formatProjectDate(task.startDate)}</TableCell>
        <TableCell>{formatProjectDate(task.endDate)}</TableCell>
        <TableCell><ProjectBadge value={task.status} /></TableCell>
        <TableCell><div className="space-y-1"><p>Baseline: {formatProjectNumber(task.baselineEstimatedDays ?? task.estimatedDays)}</p><p>Forecast: {formatProjectNumber(task.estimatedDays)}</p><p>Actual: {formatProjectNumber(task.actualDays)}</p><p>Variance: {formatProjectNumber((Number(task.actualDays ?? 0) || Number(task.estimatedDays ?? 0)) - Number(task.baselineEstimatedDays ?? task.estimatedDays ?? 0))}</p>{Number(task.actualDays ?? 0) > Number(task.estimatedDays ?? 0) ? <p className="text-xs font-medium text-amber-700">Over estimate</p> : null}</div></TableCell>
        <TableCell><ProjectTaskActionButtons taskId={task.id} actualDays={task.actualDays} estimatedDays={task.estimatedDays} /></TableCell>
      </TableRow>
    );
  })}</TableBody></Table>;
}

function ScheduleTable({ project }: { project: Awaited<ReturnType<typeof getProject>> }) {
  const rows = [...project.tasks.map((task) => ({ id: task.id, type: "Task", name: task.title, user: task.assignedTo?.displayName, start: task.startDate, end: task.endDate, status: task.status })), ...project.resourceAssignments.map((resource) => ({ id: resource.id, type: "Resource", name: projectLabel(resource.role), user: projectResourceDisplayName(resource), start: resource.startDate, end: resource.endDate, status: `${formatProjectNumber(resource.usedDays)} used` }))];
  return <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Item</TableHead><TableHead>Assigned</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={`${row.type}-${row.id}`}><TableCell>{row.type}</TableCell><TableCell>{row.name}</TableCell><TableCell>{row.user ?? "-"}</TableCell><TableCell>{formatProjectDate(row.start)}</TableCell><TableCell>{formatProjectDate(row.end)}</TableCell><TableCell>{projectLabel(row.status)}</TableCell></TableRow>)}</TableBody></Table>;
}

function CalendarSummary({ project }: { project: Awaited<ReturnType<typeof getProject>> }) {
  const items = buildProjectCalendarData(project);
  return <div className="grid gap-2 md:grid-cols-3">{items.slice(0, 18).map((item) => <div key={`${item.type}-${item.id}`} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"><p className="font-medium">{formatProjectDate(item.startDate)} - {item.title}</p><p className="text-slate-500">{item.type} - {projectLabel(item.status)}</p></div>)}</div>;
}

function GanttSummary({ project }: { project: Awaited<ReturnType<typeof getProject>> }) {
  const gantt = buildProjectGanttData(project);
  const dayWidth = 24;
  const timelineWidth = Math.max(720, gantt.totalDays * dayWidth);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">Baseline: {formatProjectDate(gantt.baseline.startDate)} to {formatProjectDate(gantt.baseline.endDate)}</p>
        <Link href={`/api/v1/projects/${project.id}/exports/gantt/pdf`}><Button>Export Gantt PDF</Button></Link>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[980px] space-y-2" style={{ width: 220 + 12 + timelineWidth }}>
          <div className="grid grid-cols-[220px_1fr] gap-3 text-xs font-medium text-slate-500">
            <div>Item</div>
            <div className="relative h-8 rounded border border-slate-200 bg-slate-50" style={{ width: timelineWidth }}>
              {gantt.weekHeaders.map((week) => (
                <div
                  key={week.label}
                  className="absolute bottom-0 top-0 flex items-center justify-center overflow-hidden border-r border-slate-200 px-2 py-2 text-center text-[11px] whitespace-nowrap"
                  style={{ left: week.offsetDays * dayWidth, width: week.spanDays * dayWidth }}
                >
                  {week.spanDays * dayWidth < 140 ? week.shortLabel : week.label}
                </div>
              ))}
            </div>
          </div>
          {gantt.items.map((item) => {
            const left = item.offsetDays * dayWidth;
            const width = Math.max(item.type === "milestone" ? 16 : 16, item.spanDays * dayWidth);
            const barClass = item.tone === "green"
              ? "bg-emerald-500"
              : item.tone === "red"
                ? "bg-red-500"
                : item.tone === "amber"
                  ? "bg-amber-500"
                  : item.tone === "grey"
                    ? "bg-slate-400"
                    : "bg-brand-700";
            return (
              <div key={`${item.type}-${item.id}`} className="grid grid-cols-[220px_1fr] items-center gap-3 text-sm">
                <div className="space-y-1">
                  <p className={`truncate font-medium ${item.overdue ? "text-red-700" : "text-slate-800"}`}>{item.type === "milestone" ? "◆ " : ""}{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.assignedTo ? `${item.assignedTo} | ` : ""}{formatProjectDate(item.startDate)} to {formatProjectDate(item.endDate)} | {projectLabel(item.status)}
                  </p>
                  {item.dependencyLabels.length ? <p className="text-xs text-slate-500">Depends on: {item.dependencyLabels.join(", ")}</p> : null}
                </div>
                <div className="relative h-10 rounded border border-slate-200 bg-slate-50" style={{ width: timelineWidth }}>
                  {item.type === "milestone" ? (
                    <div
                      className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 rounded-sm ${barClass}`}
                      style={{ left }}
                    />
                  ) : (
                    <>
                      <div
                        className={`absolute top-1/2 h-4 -translate-y-1/2 rounded ${barClass}`}
                        style={{ left, width }}
                      />
                      {item.completionPercent === 100 ? <div className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded bg-emerald-900" style={{ left: left + width - 2 }} /> : null}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MilestonesTable({ project, projectType, users }: { project: Pick<SerializedProject, "milestones">; projectType: ProjectData["projectType"]; users: { id: string; label: string }[] }) {
  return <div className="space-y-3"><p className="text-sm text-slate-600">Milestones can be completed manually or automatically when the linked project task is completed.</p><Table><TableHeader><TableRow><TableHead>Milestone</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Linked task</TableHead><TableHead>Owner</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>{project.milestones.map((milestone) => <TableRow key={milestone.id} className="align-top"><TableCell><div className="space-y-2"><div>{milestone.title}</div>{milestone.manualDateOverride ? <p className="text-xs font-medium text-amber-700">Milestone manually set. Dependency update did not override it.</p> : null}<details className="rounded-md border border-slate-200 bg-slate-50 p-2"><summary className="cursor-pointer text-xs font-medium text-brand-700">Edit milestone</summary><div className="mt-3"><ProjectMilestoneInlineEditForm milestone={milestone} users={users} /></div></details></div></TableCell><TableCell><div className="space-y-1"><p>{formatProjectDate(milestone.milestoneDate)}</p><p className="text-xs text-slate-500">Baseline: {formatProjectDate(milestone.baselineDate ?? null)}</p></div></TableCell><TableCell><ProjectBadge value={milestone.status} /></TableCell><TableCell>{linkedTaskForMilestone(milestone.title, projectType) ?? "Manual completion"}</TableCell><TableCell>{milestone.owner?.displayName ?? "-"}</TableCell><TableCell>{milestone.status === "complete" ? "-" : <ProjectMilestoneActionButtons milestoneId={milestone.id} />}</TableCell></TableRow>)}</TableBody></Table></div>;
}

function StageGatesList({ project }: { project: Awaited<ReturnType<typeof getProject>> }) {
  return <div className="space-y-3"><p className="text-sm text-slate-600">Stage gates follow PRINCE2-style governance. They update automatically when linked project tasks, milestones or forms are completed, but Project Managers can manually update them where needed.</p><div className="grid gap-2 md:grid-cols-3">{project.stageGates.map((gate) => <div key={gate.id} className="space-y-2 rounded-md border border-slate-200 bg-white p-3 text-sm"><p className="font-medium capitalize">{projectLabel(gate.stage)}</p><p><ProjectBadge value={gate.status} /></p><p className="text-xs text-slate-500">Condition: {stageGateCompletionConditions[gate.stage]}</p><p className="text-xs text-slate-500">Linked source: {stageGateLinkedSource(gate.stage)}</p>{gate.notes ? <p className="text-slate-600">{gate.notes}</p> : null}<ProjectStageGateActionButtons stageGateId={gate.id} /></div>)}</div></div>;
}

function PresalesHandover({ project }: { project: Awaited<ReturnType<typeof getProject>> }) {
  if (!project.presalesRequest) return <div className="space-y-3 text-sm text-slate-600"><p>No linked pre-sales request.</p><Link href={`/presales/new?opportunityId=${project.opportunityId}`}><Button variant="secondary">Create Pre-Sales Request</Button></Link></div>;
  return <div className="space-y-3 text-sm"><p>Request: <Link href={`/presales/${project.presalesRequest.id}`} className="font-medium text-brand-700">{project.presalesRequest.requestNumber}</Link></p><p>Engineer: {project.presalesRequest.assignedTo?.displayName ?? "Unassigned"}</p><p>Type: {projectLabel(project.presalesRequest.requestType)}</p><p>Priority: {projectLabel(project.presalesRequest.priority)}</p><p className="whitespace-pre-wrap">Description: {project.presalesRequest.description}</p><div><p className="font-medium">Deliverables</p>{project.presalesRequest.deliverables.length ? project.presalesRequest.deliverables.map((deliverable) => <p key={deliverable.id}>{deliverable.title} - {projectLabel(deliverable.status)}{deliverable.document ? ` - ${deliverable.document.fileName}` : ""}</p>) : <p className="text-slate-500">No deliverables recorded.</p>}</div><Link href={`/quotes/${project.quoteId}/versions/${project.quoteVersionId}`}><Button variant="secondary">Open Quote Builder</Button></Link></div>;
}

function ResourcesTable({ resources }: { resources: SerializedProject["resourceAssignments"] }) {
  return <Table><TableHeader><TableRow><TableHead>Resource</TableHead><TableHead>Role</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Scheduled</TableHead><TableHead>Used</TableHead><TableHead>Remaining</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{resources.map((resource) => <TableRow key={resource.id}><TableCell>{projectResourceDisplayName(resource)}</TableCell><TableCell>{projectLabel(resource.role)}</TableCell><TableCell>{formatProjectDate(resource.startDate)}</TableCell><TableCell>{formatProjectDate(resource.endDate)}</TableCell><TableCell>{formatProjectNumber(resource.scheduledDays)}</TableCell><TableCell>{formatProjectNumber(resource.usedDays)}</TableCell><TableCell>{formatProjectNumber(Number(resource.scheduledDays) - Number(resource.usedDays))}</TableCell><TableCell><ProjectResourceDeleteButton resourceId={resource.id} /></TableCell></TableRow>)}</TableBody></Table>;
}

function BudgetSummary({ project, planBaselinedAt }: { project: Awaited<ReturnType<typeof getProject>>; planBaselinedAt?: Date | null }) {
  const resourceMetrics = projectResourceDayMetrics({ allocatedDays: project.totalResourceDaysBudget, scheduledDays: project.totalResourceDaysScheduled, actualDaysUsed: project.totalResourceDaysUsed });
  const taskDayMetrics = projectTaskDayMetrics(project);
  const variance = calculateProjectBudgetVariance({ contractValue: Number(project.commercialValue), budgetCost: Number(project.budgetCost), invoicedAmount: Number(project.invoicedAmount), collectedAmount: Number(project.collectedAmount), resourceAssignments: project.resourceAssignments, financialEntries: project.financialEntries });
  return <div className="space-y-3"><div className="grid gap-3 md:grid-cols-4"><Metric label="Contract value" value={formatProjectMoney(variance.contractValue)} /><Metric label="Invoiced" value={formatProjectMoney(variance.invoicedAmount)} /><Metric label="Collected" value={formatProjectMoney(variance.collectedAmount)} /><Metric label="Outstanding" value={formatProjectMoney(variance.outstandingAmount)} /></div><div className="grid gap-3 md:grid-cols-6"><Metric label="Estimated task days" value={formatProjectNumber(taskDayMetrics.estimatedDays)} /><Metric label="Actual task days" value={formatProjectNumber(taskDayMetrics.actualDays)} /><Metric label="Task days variance" value={formatProjectNumber(taskDayMetrics.variance)} /><Metric label="Resource scheduled days" value={formatProjectNumber(resourceMetrics.scheduledDays)} /><Metric label="Resource actual days" value={formatProjectNumber(resourceMetrics.actualDaysUsed)} /><Metric label="Resource remaining days" value={formatProjectNumber(resourceMetrics.remainingDays)} /></div><div className="grid gap-3 md:grid-cols-4"><Metric label="Resource cost" value={formatProjectMoney(variance.resourceCost)} /><Metric label="PO placeholder cost" value={formatProjectMoney(variance.poPlaceholderCost)} /><Metric label="Forecast margin" value={formatProjectMoney(variance.currentForecastMargin)} /><Metric label="Margin variance" value={formatProjectMoney(variance.marginVariance)} /></div>{planBaselinedAt ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Project plan locked on {formatProjectDate(planBaselinedAt)}</p> : null}{taskDayMetrics.overEstimate ? <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">Task effort over estimate</p> : null}{variance.marginAtRisk ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">Margin at risk</p> : null}<p className="text-sm text-slate-500">Task actual days track delivery effort logged against project tasks. Resource actual days track resource-assignment usage and are not double-counted into the resource rollup.</p><Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead>Amount</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader><TableBody>{project.financialEntries.map((entry) => <TableRow key={entry.id}><TableCell>{projectLabel(entry.type)}</TableCell><TableCell>{entry.description}</TableCell><TableCell>{projectLabel(entry.status)}</TableCell><TableCell>{formatProjectMoney(entry.amount)}</TableCell><TableCell>{entry.reference ?? "-"}</TableCell></TableRow>)}</TableBody></Table>{project.equipmentItems.length ? <div className="space-y-2"><p className="font-medium text-sm">Equipment / hardware from approved change requests</p><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Description</TableHead><TableHead>Qty</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{project.equipmentItems.map((item) => <TableRow key={item.id}><TableCell>{item.sku ?? "-"}</TableCell><TableCell>{item.description}</TableCell><TableCell>{formatProjectNumber(item.quantity)}</TableCell><TableCell>{projectLabel(item.status)}</TableCell></TableRow>)}</TableBody></Table></div> : null}<p className="text-sm text-slate-500">Task actual days track delivery effort logged against project tasks. Resource actual days track resource-assignment usage and are not double-counted into the resource rollup.</p><p className="text-sm text-slate-500">Task days variance compares actual logged task effort against estimated task effort only.</p><p className="text-sm text-slate-500">Purchase order placeholders are tracked as project financial entries until the procurement module is built.</p></div>;
}

function IssuesTable({ items, projectId }: { items: Awaited<ReturnType<typeof getProject>>["issueActions"]; projectId: string }) {
  return <div className="space-y-3"><Link href={`/api/v1/projects/${projectId}/exports/issues-actions/excel`}><Button>Export Issues & Actions</Button></Link><Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Title</TableHead><TableHead>Owner</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Due</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={item.id}><TableCell>{projectLabel(item.type)}</TableCell><TableCell>{item.title}</TableCell><TableCell>{item.owner?.displayName ?? "-"}</TableCell><TableCell>{projectLabel(item.priority)}</TableCell><TableCell><ProjectBadge value={item.status} /></TableCell><TableCell>{formatProjectDate(item.dueDate)}</TableCell></TableRow>)}</TableBody></Table></div>;
}

function FormsList({ projectId, forms, exportBase }: { projectId: string; forms: Awaited<ReturnType<typeof getProject>>["forms"]; exportBase: string }) {
  return <div className="space-y-2">{forms.map((form) => {
    const content = plainObject(form.content);
    const isChangeRequest = exportBase === "change-request";
    const linkedQuoteId = typeof content.linkedQuoteId === "string" ? content.linkedQuoteId : null;
    const linkedQuoteVersionId = typeof content.linkedQuoteVersionId === "string" ? content.linkedQuoteVersionId : null;
    const linkedQuoteNumber = typeof content.linkedQuoteNumber === "string" ? content.linkedQuoteNumber : null;
    const valueImpact = content.valueImpact ?? content.difference ?? 0;
    const hardwareCount = Array.isArray(content.hardwareItems) ? content.hardwareItems.length : content.hardwareItemCount ?? 0;
    return <div key={form.id} className="space-y-3 rounded-md border border-slate-200 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span>{form.title} - {formatProjectDate(form.formDate)}</span><Link href={`/api/v1/projects/${projectId}/exports/${exportBase}/${form.id}/pdf`}><Button>{isChangeRequest ? "Export Change Request PDF" : "Export PDF"}</Button></Link></div>{isChangeRequest ? <div className="grid gap-2 md:grid-cols-4"><Metric label="Status" value={projectLabel(String(content.status ?? "pending_review"))} /><Metric label="Value impact" value={formatProjectMoney(valueImpact)} /><Metric label="Resource days" value={formatProjectNumber(content.resourceDayImpact ?? 0)} /><Metric label="Hardware items" value={String(hardwareCount)} /></div> : null}{isChangeRequest ? <div className="flex flex-wrap items-center gap-2">{linkedQuoteId && linkedQuoteVersionId ? <Link href={`/quotes/${linkedQuoteId}/versions/${linkedQuoteVersionId}`}><Button variant="secondary">Open Change Quote</Button></Link> : <CreateChangeQuoteButton changeRequestId={form.id} />}{linkedQuoteNumber ? <span className="text-xs text-slate-500">Linked quote: {linkedQuoteNumber}</span> : <span className="text-xs text-slate-500">No change quote linked yet.</span>}</div> : null}{isChangeRequest ? <ProjectChangeRequestActionButtons changeRequestId={form.id} status={String(content.status ?? "pending_review")} /> : null}</div>;
  })}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">{label}</p><p className="text-lg font-semibold text-brand-900">{value}</p></div>;
}

function slug(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function plainObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stageGateLinkedSource(stage: string) {
  switch (stage) {
    case "initiation":
      return "Customer Kick Off milestone";
    case "planning":
      return "Resource Scheduling and Equipment Order tasks";
    case "delivery":
      return "Deployment Commenced task";
    case "validation":
      return "UAT Complete milestone or manual approval";
    case "handover":
      return "Handover milestone";
    case "closure":
      return "Closure milestone and Closure form";
    default:
      return "Manual governance check";
  }
}
