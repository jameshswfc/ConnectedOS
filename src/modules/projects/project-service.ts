import {
  OpportunityStage,
  OpportunityStatus,
  OpportunityType,
  ProjectActivityType,
  ProjectDependencyType,
  ProjectDeliveryStage,
  ProjectEquipmentItemStatus,
  ProjectFinancialEntryType,
  ProjectFormType,
  ProjectIssueActionStatus,
  ProjectMilestoneStatus,
  ProjectRagStatus,
  ProjectResourceRole,
  ProjectStatus,
  ProjectTaskStatus,
  QuoteApprovalStatus,
  QuoteStatus,
  StageGateStatus,
  type Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit/audit-service";
import { sendTemplatedEmail, sendTemplatedEmailToUserIds } from "@/services/email/email-service";
import { createNotification } from "@/services/notifications/notification-service";
import { calculateOutstanding } from "@/modules/projects/project-budget";
import { formatProjectNumber } from "@/modules/projects/project-numbering";
import { assertAnyProjectPermission, assertCanEditProject, assertProjectPermission, projectVisibilityWhere } from "@/modules/projects/project-permissions";
import { calculateProjectRag } from "@/modules/projects/project-rag";
import { calculateLabResourceDays, calculateTaskCompletionPercent, defaultProjectTaskInputs, getDefaultProjectTaskDependencies, getDefaultProjectTaskTitles } from "@/modules/projects/project-default-tasks";
import { calculateWorkingDays } from "@/modules/projects/project-working-calendar";
import { detectResourceConflicts } from "@/modules/projects/project-resource-conflict-service";
import { createMissingDefaultMilestones } from "@/modules/projects/project-milestone-service";
import { createMissingDefaultStageGates } from "@/modules/projects/project-stage-gates";
import { calculateProjectScheduleVariance } from "@/modules/projects/project-baseline-service";
import { calculateProjectBudgetVariance } from "@/modules/projects/project-budget-variance";
import { nextAutomatedProjectStatus } from "@/modules/projects/project-status-automation";
import { buildProjectGanttData } from "@/modules/projects/project-gantt-service";
import { buildProjectCalendarData } from "@/modules/projects/project-calendar-service";
import { isMilestoneCompleteFromTasks, nextStageGateStatus } from "@/modules/projects/project-stage-automation";
import { assertNoCircularDependency, cascadeDependencySchedule } from "@/modules/projects/project-dependency-scheduling";
import { DEFAULT_QUOTE_TERMS } from "@/modules/quoting/quotes/quote-terms";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { detectResourceBookingConflicts, ensureResourceForUser, syncActiveUsersToResources } from "@/modules/field-services/field-services-service";
import type {
  ProjectCreateFromQuoteInput,
  ProjectFinancialEntryInput,
  ProjectFormCreateInput,
  ProjectIssueActionCreateInput,
  ProjectIssueActionUpdateInput,
  ProjectMilestoneCreateInput,
  ProjectMilestoneUpdateInput,
  ProjectResourceCreateInput,
  ProjectResourceUpdateInput,
  ProjectStageGateUpdateInput,
  ProjectTaskCreateInput,
  ProjectTaskUpdateInput,
  ProjectUpdateInput
} from "@/modules/projects/project-schemas";

const eligibleQuoteStatuses: QuoteStatus[] = [QuoteStatus.approved, QuoteStatus.sent, QuoteStatus.accepted];
const projectCreationQuoteVersionStatuses: QuoteStatus[] = [QuoteStatus.approved, QuoteStatus.sent, QuoteStatus.accepted];
export const activeProjectStatuses: ProjectStatus[] = [
  ProjectStatus.draft,
  ProjectStatus.initiation,
  ProjectStatus.planning,
  ProjectStatus.active,
  ProjectStatus.on_hold,
  ProjectStatus.at_risk
];
export type ProjectDashboardView = "active" | "completed" | "closed" | "cancelled" | "all";

const projectInclude = {
  account: true,
  opportunity: { include: { owner: true } },
  quote: { include: { contact: true } },
  quoteVersion: { include: { lines: { where: { deletedAt: null }, include: { product: true }, orderBy: { sortOrder: "asc" } } } },
  presalesRequest: { include: { assignedTo: true, deliverables: { include: { document: true } } } },
  projectManager: true,
  planBaselinedBy: true,
  milestones: { where: { deletedAt: null }, include: { owner: true }, orderBy: [{ milestoneDate: "asc" }, { sortOrder: "asc" }, { title: "asc" }] },
  stageGates: { include: { completedBy: true }, orderBy: { createdAt: "asc" } },
  tasks: { where: { deletedAt: null }, include: { owner: true, assignedTo: true, successors: true, predecessors: true }, orderBy: [{ startDate: "asc" }, { endDate: "asc" }, { sortOrder: "asc" }, { title: "asc" }] },
  resourceAssignments: { where: { deletedAt: null }, include: { user: true, resource: { include: { user: true } } }, orderBy: [{ startDate: "asc" }] },
  issueActions: { where: { deletedAt: null }, include: { owner: true }, orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }] },
  financialEntries: { orderBy: [{ expectedDate: "asc" }, { createdAt: "desc" }] },
  forms: {
    where: { deletedAt: null },
    include: {
      preparedBy: true,
      changeQuotes: {
        include: {
          versions: { include: { lines: { where: { deletedAt: null }, include: { product: true } } }, orderBy: { versionNumber: "desc" } }
        },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: [{ formDate: "desc" }, { createdAt: "desc" }]
  },
  documentRecords: { include: { document: true }, orderBy: { createdAt: "desc" } },
  equipmentItems: { orderBy: { createdAt: "desc" } }
} satisfies Prisma.ProjectInclude;

export async function listProjects(context: CrmAccessContext, filters: ProjectListFilters = {}) {
  assertAnyProjectPermission(context, ["projects.read_all", "projects.read_assigned"]);
  return prisma.project.findMany({
    where: {
      AND: [
        projectVisibilityWhere(context),
        filters.status ? { status: filters.status } : {},
        filters.ragStatus ? { ragStatus: filters.ragStatus } : {},
        filters.projectManagerId ? { projectManagerId: filters.projectManagerId } : {},
        filters.accountId ? { accountId: filters.accountId } : {},
        filters.dueToStart ? { startDate: { gte: startOfToday(), lt: addDays(startOfToday(), 7) } } : {},
        filters.dueToEnd ? { targetEndDate: { gte: startOfToday(), lt: addDays(startOfToday(), 7) } } : {},
        filters.overdue ? { targetEndDate: { lt: startOfToday() }, status: { notIn: [ProjectStatus.completed, ProjectStatus.closed, ProjectStatus.cancelled] } } : {}
      ]
    },
    include: { account: true, projectManager: true, tasks: { where: { deletedAt: null }, select: { status: true, actualDays: true, estimatedDays: true } }, milestones: { where: { deletedAt: null }, select: { status: true, milestoneDate: true } }, issueActions: { where: { deletedAt: null }, select: { status: true } }, resourceAssignments: { where: { deletedAt: null }, select: { scheduledDays: true, usedDays: true } } },
    orderBy: [{ targetEndDate: "asc" }, { updatedAt: "desc" }]
  });
}

export async function getProjectsDashboard(context: CrmAccessContext, filters: ProjectListFilters = {}) {
  let projects = await listProjects(context, filters);
  const now = startOfToday();
  const weekEnd = addDays(now, 7);
  const closedStatuses: ProjectStatus[] = [ProjectStatus.completed, ProjectStatus.closed, ProjectStatus.cancelled];
  const closedIssueStatuses: ProjectIssueActionStatus[] = [ProjectIssueActionStatus.closed, ProjectIssueActionStatus.cancelled];
  const view = filters.view ?? "active";
  projects = projects.filter((project) => matchesProjectDashboardView(project.status, view));
  projects = projects.filter((project) => {
    if (filters.endingNext30Days && !(project.targetEndDate && project.targetEndDate >= now && project.targetEndDate < addDays(now, 30))) return false;
    if (filters.overResourceBudget && !(Number(project.totalResourceDaysBudget) > 0 && Number(project.totalResourceDaysUsed) > Number(project.totalResourceDaysBudget))) return false;
    if (filters.openIssues && !project.issueActions.some((item) => !closedIssueStatuses.includes(item.status))) return false;
    return true;
  });
  return {
    activeProjects: projects.filter((project) => activeProjectStatuses.includes(project.status)).length,
    startingThisWeek: projects.filter((project) => project.startDate && project.startDate >= now && project.startDate < weekEnd).length,
    endingThisWeek: projects.filter((project) => project.targetEndDate && project.targetEndDate >= now && project.targetEndDate < weekEnd).length,
    overdueProjects: projects.filter((project) => project.targetEndDate && project.targetEndDate < now && !closedStatuses.includes(project.status)).length,
    redProjects: projects.filter((project) => project.ragStatus === ProjectRagStatus.red).length,
    ragSummary: {
      green: projects.filter((project) => project.ragStatus === ProjectRagStatus.green).length,
      amber: projects.filter((project) => project.ragStatus === ProjectRagStatus.amber).length,
      red: projects.filter((project) => project.ragStatus === ProjectRagStatus.red).length
    },
    averageCompletionPercent: projects.length ? Math.round(projects.reduce((sum, project) => sum + projectCompletionPercent(project), 0) / projects.length) : 0,
    resourceDaysRemaining: projects.reduce((sum, project) => sum + (Number(project.totalResourceDaysBudget) - Math.max(Number(project.totalResourceDaysScheduled), Number(project.totalResourceDaysUsed))), 0),
    budgetOutstanding: projects.reduce((sum, project) => sum + Number(project.outstandingAmount), 0),
    totalContractValue: projects.reduce((sum, project) => sum + Number(project.commercialValue), 0),
    outstandingBilling: projects.reduce((sum, project) => sum + Number(project.outstandingAmount), 0),
    endingNext30Days: projects.filter((project) => project.targetEndDate && project.targetEndDate >= now && project.targetEndDate < addDays(now, 30)).length,
    overResourceBudget: projects.filter((project) => Number(project.totalResourceDaysBudget) > 0 && Number(project.totalResourceDaysUsed) > Number(project.totalResourceDaysBudget)).length,
    awaitingClosure: projects.filter((project) => project.status === ProjectStatus.completed).length,
    projectsByProjectManager: projects.reduce<Record<string, number>>((totals, project) => {
      const key = project.projectManager?.displayName ?? "Unassigned";
      totals[key] = (totals[key] ?? 0) + 1;
      return totals;
    }, {}),
    marginAtRisk: projects.filter((project) => calculateProjectBudgetVariance({ contractValue: Number(project.commercialValue), budgetCost: Number(project.budgetCost), invoicedAmount: Number(project.invoicedAmount), collectedAmount: Number(project.collectedAmount), resourceAssignments: [], financialEntries: [] }).marginAtRisk).length,
    openIssuesActions: await prisma.projectIssueAction.count({ where: { project: projectVisibilityWhere(context), deletedAt: null, status: { notIn: [ProjectIssueActionStatus.closed, ProjectIssueActionStatus.cancelled] } } }),
    projects
  };
}

export async function getProject(context: CrmAccessContext, id: string) {
  assertAnyProjectPermission(context, ["projects.read_all", "projects.read_assigned"]);
  const project = await prisma.project.findFirst({
    where: { AND: [projectVisibilityWhere(context), { id }] },
    include: projectInclude
  });
  if (!project) throw new Error("Project not found");
  return project;
}

export async function getProjectCreateOptions(context: CrmAccessContext) {
  assertProjectPermission(context, "projects.create");
  const [quotes, templates, managers] = await Promise.all([
    prisma.quote.findMany({
      where: { deletedAt: null, status: { in: eligibleQuoteStatuses }, opportunityId: { not: null } },
      include: { account: true, opportunity: true, versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" }
    }),
    listProjectTaskTemplates(context),
    listProjectManagers()
  ]);
  return {
    quotes: quotes.map((quote) => ({ id: quote.id, quoteNumber: quote.quoteNumber, title: quote.title, accountName: quote.account.name, opportunityName: quote.opportunity?.opportunityName ?? "", opportunityType: quote.opportunity?.opportunityType ?? OpportunityType.other, value: Number(quote.sellTotal) })),
    templates,
    managers: managers.map((manager) => ({ id: manager.id, name: manager.displayName, email: manager.email }))
  };
}

export async function createProjectFromQuote(context: CrmAccessContext, quoteId: string, input: ProjectCreateFromQuoteInput) {
  assertProjectPermission(context, "projects.create");
  return ProjectCreationService.createFromQuote(context, quoteId, input, { source: "manual" });
}

export async function createProjectFromAcceptedQuote(context: CrmAccessContext, quoteId: string) {
  return ProjectCreationService.createFromAcceptedQuote(context, quoteId);
}

export function shouldAutoCreateProjectForQuoteStatus(status: QuoteStatus | string) {
  return status === QuoteStatus.accepted;
}

export function shouldAutoCreateProjectForOpportunityStage(stage: OpportunityStage | string) {
  return stage === OpportunityStage.closed_won_po_received;
}

export function projectResourceDayMetrics(input: { allocatedDays: unknown; scheduledDays: unknown; actualDaysUsed: unknown }) {
  const allocatedDays = Number(input.allocatedDays) || 0;
  const scheduledDays = Number(input.scheduledDays) || 0;
  const actualDaysUsed = Number(input.actualDaysUsed) || 0;
  return {
    allocatedDays,
    scheduledDays,
    actualDaysUsed,
    remainingDays: allocatedDays - actualDaysUsed,
    utilisationPercent: allocatedDays > 0 ? Math.round((actualDaysUsed / allocatedDays) * 100) : 0
  };
}

export const ProjectCreationService = {
  async createFromQuote(context: CrmAccessContext, quoteId: string, input: ProjectCreateFromQuoteInput, options: ProjectCreationOptions = {}) {
    return createProjectFromQuoteInternal(context, quoteId, input, options);
  },

  async createFromAcceptedQuote(context: CrmAccessContext, quoteId: string) {
    return createProjectFromQuoteInternal(context, quoteId, { status: ProjectStatus.initiation }, { source: "auto_acceptance" });
  },

  async syncClosedWonOpportunity(context: CrmAccessContext, opportunityId: string) {
    const quote = await findLatestProjectableQuoteForOpportunity(opportunityId);
    if (!quote) return null;
    const quoteVersion = latestProjectableQuoteVersion(quote);
    if (!quoteVersion) return null;

    if (quote.status !== QuoteStatus.accepted || quoteVersion.status !== QuoteStatus.accepted) {
      const now = new Date();
      await prisma.$transaction(async (transaction) => {
        await transaction.quote.update({
          where: { id: quote.id },
          data: {
            status: QuoteStatus.accepted,
            currentVersionNumber: quoteVersion.versionNumber,
            acceptedAt: quote.acceptedAt ?? now,
            updatedById: context.userId
          }
        });
        await transaction.quoteVersion.update({
          where: { id: quoteVersion.id },
          data: {
            status: QuoteStatus.accepted,
            isLocked: true,
            updatedById: context.userId
          }
        });
        await transaction.quoteApprovalRequest.updateMany({
          where: {
            quoteId: quote.id,
            quoteVersionId: quoteVersion.id,
            status: QuoteApprovalStatus.pending
          },
          data: {
            status: QuoteApprovalStatus.approved,
            approverId: context.userId,
            decidedAt: now
          }
        });
        await transaction.salesActivity.create({
          data: {
            accountId: quote.accountId,
            opportunityId,
            ownerId: context.userId,
            activityType: "note",
            subject: `Quote ${quote.quoteNumber} accepted from Closed Won opportunity`,
            description: `Opportunity moved to Closed Won (PO Received), so quote ${quote.quoteNumber} was marked accepted. Link: /quotes/${quote.id}`,
            completedAt: now,
            outcome: `Quote accepted from Closed Won opportunity: /quotes/${quote.id}`,
            createdById: context.userId,
            updatedById: context.userId
          }
        });
      });
      await createAuditLog({
        userId: context.userId,
        module: "quoting",
        entityType: "Quote",
        entityId: quote.id,
        action: "accepted_from_closed_won_opportunity",
        previousValue: { status: quote.status, quoteVersionStatus: quoteVersion.status },
        newValue: { status: QuoteStatus.accepted, quoteVersionId: quoteVersion.id, opportunityId }
      });
    }

    return createProjectFromQuoteInternal(context, quote.id, { status: ProjectStatus.initiation }, { source: "auto_closed_won", quoteVersionId: quoteVersion.id });
  }
};

type ProjectCreationOptions = {
  source?: "manual" | "auto_acceptance" | "auto_closed_won";
  quoteVersionId?: string;
};

async function createProjectFromQuoteInternal(context: CrmAccessContext, quoteId: string, input: ProjectCreateFromQuoteInput, options: ProjectCreationOptions = {}) {
  const existing = await prisma.project.findFirst({ where: { quoteId, deletedAt: null } });
  if (existing) return getCreatedProjectForSource(context, existing.id, options.source ?? "manual");
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, deletedAt: null },
    include: {
      account: true,
      opportunity: true,
      contact: true,
      versions: { include: { lines: { where: { deletedAt: null }, include: { product: true } } }, orderBy: { versionNumber: "desc" } },
      presalesRequests: { where: { deletedAt: null }, include: { assignedTo: true, deliverables: true }, orderBy: { updatedAt: "desc" }, take: 1 }
    }
  });
  if (!quote) throw new Error("Quote not found");
  if (!eligibleQuoteStatuses.includes(quote.status)) throw new Error("Project can only be created from an approved, sent or accepted quote.");
  if (!quote.opportunityId || !quote.opportunity) throw new Error("Project creation requires a quote linked to an opportunity.");
  const quoteVersion = options.quoteVersionId
    ? quote.versions.find((version) => version.id === options.quoteVersionId)
    : quote.versions.find((version) => version.versionNumber === quote.currentVersionNumber) ?? quote.versions[0];
  if (!quoteVersion) throw new Error("Quote version not found");
  const projectType = input.projectType ?? quote.opportunity.opportunityType ?? OpportunityType.other;
  const totalResourceDaysBudget = input.totalResourceDaysBudget ?? calculateLabResourceDays(quoteVersion.lines);
  const presalesRequest = quote.presalesRequests[0];
  const description = input.description ?? projectDescriptionFromSource(quote, presalesRequest);
  const scopeSummary = input.scopeSummary ?? quote.highLevelScope;
  const startDate = input.startDate ?? undefined;
  const targetEndDate = input.targetEndDate ?? quote.opportunity.expectedCloseDate ?? undefined;
  const projectManagerResource = input.projectManagerId ? await ensureResourceForUser(input.projectManagerId) : null;

  const project = await prisma.$transaction(async (transaction) => {
    const projectNumber = await nextProjectNumber(transaction);
    const created = await transaction.project.create({
      data: {
        projectNumber,
        name: quote.projectName || quote.title || quote.opportunity?.opportunityName || quote.quoteNumber,
        projectType,
        accountId: quote.accountId,
        opportunityId: quote.opportunityId as string,
        quoteId: quote.id,
        quoteVersionId: quoteVersion.id,
        presalesRequestId: presalesRequest?.id,
        projectManagerId: input.projectManagerId ?? null,
        status: input.status && input.status !== ProjectStatus.draft ? input.status : ProjectStatus.initiation,
        startDate,
        targetEndDate,
        baselineStartDate: input.baselineStartDate ?? startDate,
        baselineEndDate: input.baselineEndDate ?? targetEndDate,
        description,
        scopeSummary,
        commercialValue: quote.sellTotal,
        budgetCost: quote.costTotal,
        budgetSell: quote.sellTotal,
        paymentTerms: quoteVersion.terms,
        outstandingAmount: quote.sellTotal,
        totalResourceDaysBudget,
        createdById: context.userId,
        updatedById: context.userId
      }
    });
    await copyTemplateTasks(transaction, created.id, input.templateId ?? undefined, created.startDate ?? new Date(), context.userId);
    await createMissingDefaultProjectTasks(transaction, created.id, projectType, created.startDate ?? new Date(), context.userId);
    await createMissingDefaultProjectDependencies(transaction, created.id, projectType, context.userId);
    await createMissingDefaultMilestones(transaction, created.id, created.startDate ?? new Date());
    await createMissingDefaultStageGates(transaction, created.id);
    if (input.projectManagerId) {
      await transaction.projectResourceAssignment.create({
        data: {
          projectId: created.id,
          resourceId: projectManagerResource?.id ?? null,
          userId: input.projectManagerId,
          role: ProjectResourceRole.project_manager,
          startDate: created.startDate ?? new Date(),
          endDate: created.targetEndDate ?? created.startDate ?? new Date(),
          scheduledDays: 0
        }
      });
    }
    await transaction.projectActivity.create({
      data: {
        projectId: created.id,
        activityType: ProjectActivityType.note,
        subject: "Project created from quote",
        description: `Project ${projectNumber} created from quote ${quote.quoteNumber}.`,
        ownerId: context.userId,
        completedAt: new Date()
      }
    });
    return created;
  });

  await recalculateProjectRollups(project.id);
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "Project", entityId: project.id, action: projectCreationAuditAction(options.source ?? "manual"), newValue: project as unknown as Prisma.InputJsonValue });
  await createNotification({ userId: context.userId, title: `Project ${project.projectNumber} created`, body: `${project.name} was created from quote ${quote.quoteNumber}.`, metadata: { module: "projects", link: `/projects/${project.id}` } });
  await sendTemplatedEmailToUserIds(project.projectManagerId ? [project.projectManagerId] : [], () => ({
    title: `Project created: ${project.projectNumber}`,
    summary: `${project.name} has been created and assigned.`,
    details: [
      { label: "Project", value: `${project.projectNumber} ${project.name}` },
      { label: "Account", value: quote.account.name },
      { label: "Quote", value: quote.quoteNumber }
    ],
    actionLabel: "Open project",
    actionHref: `/projects/${project.id}`
  }));
  if (project.projectManagerId) await notifyProjectUser(project.projectManagerId, `Project ${project.projectNumber} assigned`, `${project.name} has been assigned to you.`, `/projects/${project.id}`);
  return getCreatedProjectForSource(context, project.id, options.source ?? "manual");
}

export async function updateProject(context: CrmAccessContext, id: string, input: ProjectUpdateInput) {
  const previous = await getProject(context, id);
  assertCanEditProject(context, previous);
  const invoicedAmount = input.invoicedAmount ?? Number(previous.invoicedAmount);
  const collectedAmount = input.collectedAmount ?? Number(previous.collectedAmount);
  const updateInput = { ...input };
  if (!canEditProjectBaseline(context)) {
    delete updateInput.baselineStartDate;
    delete updateInput.baselineEndDate;
  }
  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...updateInput,
      outstandingAmount: calculateOutstanding(invoicedAmount, collectedAmount),
      updatedById: context.userId
    }
  });
  await recalculateProjectRollups(id);
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "Project", entityId: id, action: "update", previousValue: previous as unknown as Prisma.InputJsonValue, newValue: updated as unknown as Prisma.InputJsonValue });
  return getProject(context, id);
}

export async function softDeleteProject(context: CrmAccessContext, id: string) {
  assertProjectPermission(context, "projects.delete");
  const previous = await getProject(context, id);
  const deleted = await prisma.project.update({ where: { id }, data: { deletedAt: new Date(), deletedById: context.userId, updatedById: context.userId } });
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "Project", entityId: id, action: "soft_delete", previousValue: previous as unknown as Prisma.InputJsonValue, newValue: deleted as unknown as Prisma.InputJsonValue });
  return deleted;
}

export async function createProjectTask(context: CrmAccessContext, projectId: string, input: ProjectTaskCreateInput) {
  const project = await getProject(context, projectId);
  assertCanEditProject(context, project);
  validateDateRange(input.startDate, input.endDate);
  const estimatedDays = input.estimatedDays ?? calculateWorkingDays(input.startDate, input.endDate);
  const task = await prisma.projectTask.create({
    data: {
      projectId,
      ...input,
      estimatedDays,
      ownerId: input.ownerId ?? context.userId
    }
  });
  await recalculateProjectRollups(projectId);
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "ProjectTask", entityId: projectId, action: "task_create", newValue: task as unknown as Prisma.InputJsonValue });
  if (task.assignedToId) await notifyProjectUser(task.assignedToId, `Project task assigned: ${task.title}`, project.name, `/projects/${projectId}`);
  await notifyProjectTaskTiming(task, project.name, `/projects/${projectId}`);
  return task;
}

export async function updateProjectTask(context: CrmAccessContext, taskId: string, input: ProjectTaskUpdateInput) {
  const previous = await prisma.projectTask.findFirst({
    where: { id: taskId, deletedAt: null },
    include: {
      project: {
        include: {
          tasks: { where: { deletedAt: null } },
          resourceAssignments: true,
          milestones: { where: { deletedAt: null } }
        }
      }
    }
  });
  if (!previous) throw new Error("Project task not found");
  await getProject(context, previous.projectId);
  assertCanEditProject(context, previous.project);
  if (input.startDate && input.endDate) validateDateRange(input.startDate, input.endDate);
  const nextStartDate = input.startDate ?? previous.startDate;
  const nextEndDate = input.endDate ?? previous.endDate;
  if (nextEndDate < nextStartDate) {
    throw new Error("Unable to update task dates. Please check the dates and try again.");
  }
  const estimatedDays = input.estimatedDays ?? (input.startDate || input.endDate ? calculateWorkingDays(nextStartDate, nextEndDate) : undefined);
  validateProjectTaskCompletion({
    previousStatus: previous.status,
    nextStatus: input.status ?? previous.status,
    previousActualDays: previous.actualDays,
    nextActualDays: input.actualDays ?? previous.actualDays,
    estimatedDays: estimatedDays ?? previous.estimatedDays
  });
  const task = await prisma.projectTask.update({
    where: { id: taskId },
    data: {
      ...input,
      estimatedDays,
      actualDays: input.actualDays ?? undefined
    }
  });
  let dependencyScheduleChanges;
  try {
    dependencyScheduleChanges = await applyDependencyScheduleChanges({
      context,
      projectId: previous.projectId,
      projectType: previous.project.projectType,
      changedTaskId: taskId,
      tasks: previous.project.tasks.map((item) => ({
        id: item.id,
        title: item.title,
        startDate: item.id === taskId ? task.startDate : item.startDate,
        endDate: item.id === taskId ? task.endDate : item.endDate,
        deletedAt: item.deletedAt
      })),
      milestones: previous.project.milestones,
      reasonPrefix: `Task ${task.title} date change cascaded`
    });
  } catch (error) {
    console.error("Project task dependency cascade failed", {
      projectId: previous.projectId,
      taskId,
      userId: context.userId,
      submittedPayload: serialiseProjectTaskUpdateInput(input),
      exceptionMessage: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
  await recalculateProjectRollups(previous.projectId);
  await createAuditLog({
    userId: context.userId,
    module: "projects",
    entityType: "ProjectTask",
    entityId: previous.projectId,
    action: "task_update",
    previousValue: previous as unknown as Prisma.InputJsonValue,
    newValue: { task, dependencyScheduleChanges } as unknown as Prisma.InputJsonValue
  });
  await notifyProjectTaskTiming(task, previous.project.name, `/projects/${previous.projectId}`);
  return {
    ...task,
    dependencyScheduleChanges,
    rescheduleMessage: dependencyScheduleChanges.taskUpdates.length || dependencyScheduleChanges.milestoneUpdates.length ? "Dependent tasks were rescheduled." : null
  };
}

export async function softDeleteProjectTask(context: CrmAccessContext, taskId: string) {
  const previous = await prisma.projectTask.findFirst({ where: { id: taskId, deletedAt: null }, include: { project: { include: { tasks: true, resourceAssignments: true } } } });
  if (!previous) throw new Error("Project task not found");
  await getProject(context, previous.projectId);
  assertCanEditProject(context, previous.project);
  const task = await prisma.projectTask.update({ where: { id: taskId }, data: { deletedAt: new Date() } });
  await recalculateProjectRollups(previous.projectId);
  return task;
}

export async function createProjectTaskDependency(context: CrmAccessContext, predecessorTaskId: string, input: { successorTaskId: string; dependencyType?: ProjectDependencyType; lagDays?: number }) {
  const predecessor = await prisma.projectTask.findFirst({
    where: { id: predecessorTaskId, deletedAt: null },
    include: {
      project: {
        include: {
          tasks: { where: { deletedAt: null } },
          resourceAssignments: true,
          milestones: { where: { deletedAt: null } },
          dependencies: true
        }
      }
    }
  });
  const successor = await prisma.projectTask.findFirst({ where: { id: input.successorTaskId, deletedAt: null } });
  if (!predecessor || !successor || predecessor.projectId !== successor.projectId) throw new Error("Project task dependency not found");
  await getProject(context, predecessor.projectId);
  assertCanEditProject(context, predecessor.project);
  if (predecessorTaskId === input.successorTaskId) throw new Error("Invalid project task dependency");
  assertNoCircularDependency(predecessor.project.tasks, predecessor.project.dependencies, predecessorTaskId, input.successorTaskId);
  const dependency = await prisma.projectTaskDependency.create({
    data: {
      projectId: predecessor.projectId,
      predecessorTaskId,
      successorTaskId: input.successorTaskId,
      dependencyType: input.dependencyType ?? ProjectDependencyType.finish_to_start,
      lagDays: input.lagDays ?? 0
    }
  });
  const dependencyScheduleChanges = await applyDependencyScheduleChanges({
    context,
    projectId: predecessor.projectId,
    projectType: predecessor.project.projectType,
    changedTaskId: predecessorTaskId,
    tasks: predecessor.project.tasks,
    milestones: predecessor.project.milestones,
    dependencies: [...predecessor.project.dependencies, dependency],
    reasonPrefix: `Dependency created from ${predecessor.title}`
  });
  await recalculateProjectRollups(predecessor.projectId);
  await createAuditLog({
    userId: context.userId,
    module: "projects",
    entityType: "ProjectTaskDependency",
    entityId: predecessor.projectId,
    action: "task_dependency_create",
    newValue: { dependency, dependencyScheduleChanges } as unknown as Prisma.InputJsonValue
  });
  return dependency;
}

export async function deleteProjectTaskDependency(context: CrmAccessContext, id: string) {
  const dependency = await prisma.projectTaskDependency.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          tasks: { where: { deletedAt: null } },
          resourceAssignments: true,
          milestones: { where: { deletedAt: null } },
          dependencies: true
        }
      }
    }
  });
  if (!dependency) throw new Error("Project task dependency not found");
  await getProject(context, dependency.projectId);
  assertCanEditProject(context, dependency.project);
  const deleted = await prisma.projectTaskDependency.delete({ where: { id } });
  await createAuditLog({
    userId: context.userId,
    module: "projects",
    entityType: "ProjectTaskDependency",
    entityId: dependency.projectId,
    action: "task_dependency_delete",
    previousValue: dependency as unknown as Prisma.InputJsonValue,
    newValue: deleted as unknown as Prisma.InputJsonValue
  });
  return deleted;
}

export async function createProjectResource(context: CrmAccessContext, projectId: string, input: ProjectResourceCreateInput) {
  const project = await getProject(context, projectId);
  assertCanEditProject(context, project);
  validateDateRange(input.startDate, input.endDate);
  const linkedResource = await prisma.resource.findFirst({
    where: { id: input.resourceId, deletedAt: null },
    include: { user: true }
  });
  if (!linkedResource) throw new Error("Resource not found");
  if (!linkedResource.active || (linkedResource.user && (!linkedResource.user.isActive || linkedResource.user.deletedAt || linkedResource.user.deactivatedAt))) {
    throw new Error("Selected resource is not available for project scheduling.");
  }
  const scheduledDays = input.scheduledDays ?? calculateWorkingDays(input.startDate, input.endDate);
  const projectConflicts = await detectResourceConflicts(linkedResource.id, input.startDate, input.endDate, projectId, linkedResource.userId);
  const bookingConflicts = await detectResourceBookingConflicts(linkedResource.id, input.startDate, input.endDate, linkedResource.userId ?? undefined);
  const conflicts = [
    ...projectConflicts.map((conflict) => `Project conflict: ${conflict.projectNumber} ${conflict.projectName}`),
    ...bookingConflicts.map((conflict) => conflict.message)
  ];
  if (conflicts.length && !input.conflictOverride) {
    throw new Error(conflicts[0] ?? "Resource conflict detected");
  }
  const resource = await prisma.projectResourceAssignment.create({
    data: {
      projectId,
      resourceId: linkedResource.id,
      userId: linkedResource.userId,
      role: input.role,
      startDate: input.startDate,
      endDate: input.endDate,
      scheduledDays,
      usedDays: input.usedDays,
      notes: input.notes,
      conflictOverride: input.conflictOverride,
      conflictOverrideNote: input.conflictOverrideNote
    }
  });
  await recalculateProjectRollups(projectId);
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "ProjectResourceAssignment", entityId: projectId, action: "resource_assign", newValue: resource as unknown as Prisma.InputJsonValue });
  if (conflicts.length && input.conflictOverride) {
    await createAuditLog({ userId: context.userId, module: "projects", entityType: "ProjectResourceAssignment", entityId: projectId, action: "resource_conflict_override", newValue: { resource, conflicts } as unknown as Prisma.InputJsonValue });
    if (project.projectManagerId) await notifyProjectUser(project.projectManagerId, "Resource conflict override recorded", `${linkedResource.displayName} was booked despite a conflict.`, `/projects/${projectId}#resources`);
  }
  if (linkedResource.userId) {
    await notifyProjectUser(linkedResource.userId, `Project resource assigned: ${project.projectNumber}`, project.name, `/projects/${projectId}`);
  }
  return resource;
}

export async function updateProjectResource(context: CrmAccessContext, resourceId: string, input: ProjectResourceUpdateInput) {
  const previous = await prisma.projectResourceAssignment.findFirst({
    where: { id: resourceId, deletedAt: null },
    include: { project: { include: { tasks: true, resourceAssignments: true } }, resource: { include: { user: true } } }
  });
  if (!previous) throw new Error("Project resource not found");
  await getProject(context, previous.projectId);
  assertCanEditProject(context, previous.project);
  const linkedResource = input.resourceId
    ? await prisma.resource.findFirst({ where: { id: input.resourceId, deletedAt: null }, include: { user: true } })
    : previous.resource ?? (previous.userId ? await ensureResourceForUser(previous.userId) : null);
  if (!linkedResource) throw new Error("Resource not found");
  if (!linkedResource.active || (linkedResource.user && (!linkedResource.user.isActive || linkedResource.user.deletedAt || linkedResource.user.deactivatedAt))) {
    throw new Error("Selected resource is not available for project scheduling.");
  }
  const startDate = input.startDate ?? previous.startDate;
  const endDate = input.endDate ?? previous.endDate;
  const scheduledDays = input.scheduledDays ?? (input.startDate || input.endDate ? calculateWorkingDays(startDate, endDate) : undefined);
  const projectConflicts = input.startDate || input.endDate || input.resourceId
    ? await detectResourceConflicts(linkedResource.id, startDate, endDate, previous.projectId, linkedResource.userId)
    : [];
  const bookingConflicts = input.startDate || input.endDate || input.resourceId
    ? await detectResourceBookingConflicts(linkedResource.id, startDate, endDate, linkedResource.userId ?? undefined)
    : [];
  const conflicts = [
    ...projectConflicts.map((conflict) => `Project conflict: ${conflict.projectNumber} ${conflict.projectName}`),
    ...bookingConflicts.map((conflict) => conflict.message)
  ];
  if (conflicts.length && !input.conflictOverride && !previous.conflictOverride) {
    throw new Error(conflicts[0] ?? "Resource conflict detected");
  }
  const updated = await prisma.projectResourceAssignment.update({
    where: { id: resourceId },
    data: {
      resourceId: linkedResource.id,
      userId: linkedResource.userId,
      role: input.role,
      startDate: input.startDate,
      endDate: input.endDate,
      scheduledDays,
      usedDays: input.usedDays,
      notes: input.notes,
      conflictOverride: input.conflictOverride,
      conflictOverrideNote: input.conflictOverrideNote
    }
  });
  await recalculateProjectRollups(previous.projectId);
  return updated;
}

export async function softDeleteProjectResource(context: CrmAccessContext, resourceId: string) {
  const previous = await prisma.projectResourceAssignment.findFirst({ where: { id: resourceId, deletedAt: null }, include: { project: { include: { tasks: true, resourceAssignments: true } } } });
  if (!previous) throw new Error("Project resource not found");
  await getProject(context, previous.projectId);
  assertCanEditProject(context, previous.project);
  const updated = await prisma.projectResourceAssignment.update({ where: { id: resourceId }, data: { deletedAt: new Date() } });
  await recalculateProjectRollups(previous.projectId);
  return updated;
}

export async function createProjectIssueAction(context: CrmAccessContext, projectId: string, input: ProjectIssueActionCreateInput) {
  const project = await getProject(context, projectId);
  assertCanEditProject(context, project);
  const item = await prisma.projectIssueAction.create({ data: { projectId, ...input } });
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "ProjectIssueAction", entityId: projectId, action: "issue_action_create", newValue: item as unknown as Prisma.InputJsonValue });
  return item;
}

export async function createProjectFinancialEntry(context: CrmAccessContext, projectId: string, input: ProjectFinancialEntryInput) {
  const project = await getProject(context, projectId);
  assertProjectPermission(context, "projects.manage_budget");
  if (!canUserEditProjectBudget(context, project)) throw new Error("Missing permission: projects.manage_budget");
  const entry = await prisma.projectFinancialEntry.create({ data: { projectId, ...input } });
  await recalculateProjectRollups(projectId);
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "ProjectFinancialEntry", entityId: projectId, action: "financial_entry_create", newValue: entry as unknown as Prisma.InputJsonValue });
  return entry;
}

function canUserEditProjectBudget(context: CrmAccessContext, project: { projectManagerId?: string | null }) {
  return context.permissionLevel === "administrator" || context.role === "Business Operations" || context.permissions.includes("admin.users") || project.projectManagerId === context.userId;
}

function canEditProjectBaseline(context: CrmAccessContext) {
  return context.permissionLevel === "administrator" || context.role === "Business Operations" || context.permissions.includes("admin.users");
}

export async function updateProjectIssueAction(context: CrmAccessContext, itemId: string, input: ProjectIssueActionUpdateInput) {
  const previous = await prisma.projectIssueAction.findFirst({ where: { id: itemId, deletedAt: null }, include: { project: { include: { tasks: true, resourceAssignments: true } } } });
  if (!previous) throw new Error("Project issue/action not found");
  await getProject(context, previous.projectId);
  assertCanEditProject(context, previous.project);
  return prisma.projectIssueAction.update({ where: { id: itemId }, data: { ...input, closedAt: input.status === ProjectIssueActionStatus.closed ? new Date() : undefined } });
}

export async function createProjectForm(context: CrmAccessContext, projectId: string, input: ProjectFormCreateInput) {
  const project = await getProject(context, projectId);
  assertCanEditProject(context, project);
  const content = input.formType === ProjectFormType.change_request
    ? {
        status: "pending_review",
        summary: typeof input.content.summary === "string" ? input.content.summary : "",
        linkedQuoteId: null,
        linkedQuoteNumber: null,
        linkedQuoteVersionId: null,
        linkedQuoteVersionNumber: null,
        valueImpact: 0,
        resourceDayImpact: 0,
        hardwareItems: []
      }
    : input.content;
  const form = await prisma.projectForm.create({
    data: {
      projectId,
      formType: input.formType,
      title: input.title,
      formDate: input.formDate ?? new Date(),
      preparedById: context.userId,
      content: content as Prisma.InputJsonObject
    }
  });
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "ProjectForm", entityId: projectId, action: `${input.formType}_create`, newValue: form as unknown as Prisma.InputJsonValue });
  await recalculateProjectRollups(projectId);
  return form;
}

export async function createProjectChangeQuote(context: CrmAccessContext, formId: string) {
  const form = await prisma.projectForm.findFirst({
    where: { id: formId, formType: ProjectFormType.change_request, deletedAt: null },
    include: {
      changeQuotes: { include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } } },
      project: { include: { account: true, opportunity: true, quote: { include: { contact: true, owner: true } } } }
    }
  });
  if (!form) throw new Error("Project change request not found");
  await getProject(context, form.projectId);
  assertCanEditProject(context, form.project);
  const existingQuote = form.changeQuotes[0];
  if (existingQuote) {
    const version = existingQuote.versions[0];
    return { quoteId: existingQuote.id, versionId: version?.id ?? null };
  }

  const sequence = await prisma.quote.count({
    where: { quoteNumber: { startsWith: `CR-${form.project.projectNumber}-` } }
  }) + 1;
  const quoteNumber = `CR-${form.project.projectNumber}-${String(sequence).padStart(2, "0")}`;
  const quote = await prisma.$transaction(async (transaction) => {
    const createdQuote = await transaction.quote.create({
      data: {
        quoteNumber,
        title: `${form.project.name} Change Request ${sequence}`,
        customerName: form.project.account.name,
        hotelName: form.project.account.name,
        projectName: form.project.name,
        highLevelScope: form.title,
        preparedDate: new Date(),
        accountId: form.project.accountId,
        opportunityId: form.project.opportunityId,
        contactId: form.project.quote.contactId,
        projectChangeRequestId: form.id,
        ownerId: form.project.quote.ownerId,
        status: QuoteStatus.draft,
        notes: typeof (form.content as Record<string, unknown>).summary === "string" ? String((form.content as Record<string, unknown>).summary) : form.title,
        createdById: context.userId,
        updatedById: context.userId
      }
    });
    const version = await transaction.quoteVersion.create({
      data: {
        quoteId: createdQuote.id,
        versionNumber: 1,
        status: QuoteStatus.draft,
        isLocked: false,
        notes: form.title,
        terms: DEFAULT_QUOTE_TERMS,
        createdById: context.userId,
        updatedById: context.userId
      }
    });
    await transaction.projectForm.update({
      where: { id: form.id },
      data: {
        content: {
          ...changeRequestContent(form.content),
          linkedQuoteId: createdQuote.id,
          linkedQuoteNumber: createdQuote.quoteNumber,
          linkedQuoteVersionId: version.id,
          linkedQuoteVersionNumber: 1
        } as Prisma.InputJsonObject
      }
    });
    return { createdQuote, version };
  });
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "Quote", entityId: quote.createdQuote.id, action: "create_change_quote", newValue: { quoteNumber, projectChangeRequestId: form.id } });
  return { quoteId: quote.createdQuote.id, versionId: quote.version.id };
}

export async function approveProjectChangeRequest(context: CrmAccessContext, formId: string) {
  const form = await prisma.projectForm.findFirst({
    where: { id: formId, formType: ProjectFormType.change_request, deletedAt: null },
    include: { project: { include: { tasks: { where: { deletedAt: null } }, resourceAssignments: { where: { deletedAt: null } } } } }
  });
  if (!form) throw new Error("Project change request not found");
  await getProject(context, form.projectId);
  assertCanEditProject(context, form.project);
  const content = changeRequestContent(form.content);
  if (content.status === "approved") throw new Error("Project change request has already been approved.");
  if (content.status === "cancelled" || content.status === "rejected") throw new Error("Project change request is not pending review.");
  if (!content.linkedQuoteId && !numberFromContent(content.difference) && !numberFromContent(content.valueImpact)) {
    throw new Error("Project change request must be priced in a linked change quote before approval.");
  }

  const valueImpact = numberFromContent(content.valueImpact || content.difference);
  const resourceDayImpact = numberFromContent(content.resourceDayImpact);
  const hardwareItems = Array.isArray(content.hardwareItems) ? content.hardwareItems : [];
  const equipmentAlreadyApplied = await prisma.projectEquipmentItem.count({ where: { sourceChangeRequestId: form.id } });

  await prisma.$transaction(async (transaction) => {
    await transaction.project.update({
      where: { id: form.projectId },
      data: {
        commercialValue: { increment: valueImpact },
        budgetSell: { increment: valueImpact },
        outstandingAmount: { increment: valueImpact },
        totalResourceDaysBudget: { increment: resourceDayImpact },
        updatedById: context.userId
      }
    });

    if (!equipmentAlreadyApplied && hardwareItems.length) {
      for (const item of hardwareItems) {
        const hardware = normaliseHardwareImpact(item);
        if (!hardware.description) continue;
        await transaction.projectEquipmentItem.create({
          data: {
            projectId: form.projectId,
            sourceChangeRequestId: form.id,
            sku: hardware.sku,
            manufacturer: hardware.manufacturer,
            supplier: hardware.supplier,
            description: hardware.description,
            quantity: hardware.quantity,
            unitCost: hardware.unitCost,
            unitSell: hardware.unitSell,
            status: ProjectEquipmentItemStatus.required
          }
        });
      }
      const existingTask = await transaction.projectTask.findFirst({ where: { projectId: form.projectId, title: "Order Additional Hardware", deletedAt: null } });
      if (!existingTask) {
        const startDate = new Date();
        await transaction.projectTask.create({
          data: {
            projectId: form.projectId,
            title: "Order Additional Hardware",
            description: "Created when a quote change request with additional hardware was approved.",
            ownerId: context.userId,
            startDate,
            endDate: startDate,
            estimatedDays: 1,
            sortOrder: 999
          }
        });
      }
    }

    await transaction.projectForm.update({
      where: { id: form.id },
      data: {
        content: {
          ...content,
          status: "approved",
          approvedAt: new Date().toISOString(),
          approvedById: context.userId,
          appliedAt: new Date().toISOString(),
          valueImpact,
          resourceDayImpact,
          hardwareItemCount: hardwareItems.length
        } as Prisma.InputJsonObject
      }
    });
  });

  await recalculateProjectRollups(form.projectId);
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "ProjectForm", entityId: form.projectId, action: "change_request_approved", previousValue: form.content as Prisma.InputJsonValue, newValue: { formId, valueImpact, resourceDayImpact, hardwareItemCount: hardwareItems.length } });
  await notifyProjectChangeRequestDecision(form.projectId, form.project.projectManagerId, "Project Change Request Approved", "A project change request has been approved and applied.");
  return getProject(context, form.projectId);
}

export async function rejectProjectChangeRequest(context: CrmAccessContext, formId: string, reason?: string) {
  const form = await prisma.projectForm.findFirst({
    where: { id: formId, formType: ProjectFormType.change_request, deletedAt: null },
    include: { project: { include: { tasks: { where: { deletedAt: null } }, resourceAssignments: { where: { deletedAt: null } } } } }
  });
  if (!form) throw new Error("Project change request not found");
  await getProject(context, form.projectId);
  assertCanEditProject(context, form.project);
  const content = changeRequestContent(form.content);
  if (content.status === "approved") throw new Error("Approved change requests cannot be rejected.");
  if (content.status === "rejected") throw new Error("Project change request has already been rejected.");
  const updated = await prisma.projectForm.update({
    where: { id: form.id },
    data: {
      content: {
        ...content,
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectedById: context.userId,
        rejectionReason: reason ?? "Rejected"
      } as Prisma.InputJsonObject
    }
  });
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "ProjectForm", entityId: form.projectId, action: "change_request_rejected", previousValue: form.content as Prisma.InputJsonValue, newValue: updated.content as Prisma.InputJsonValue });
  await notifyProjectChangeRequestDecision(form.projectId, form.project.projectManagerId, "Project Change Request Rejected", "A project change request has been rejected.");
  return getProject(context, form.projectId);
}

export async function syncProjectChangeRequestFromQuote(quoteId: string) {
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, deletedAt: null, projectChangeRequestId: { not: null } },
    include: {
      versions: {
        include: { lines: { where: { deletedAt: null }, include: { product: true } } },
        orderBy: { versionNumber: "desc" }
      }
    }
  });
  if (!quote?.projectChangeRequestId) return null;
  const version = quote.versions.find((item) => item.versionNumber === quote.currentVersionNumber) ?? quote.versions[0];
  if (!version) return null;
  const hardwareItems = version.lines
    .filter((line) => line.lineType === "product" && !(line.product?.sku ?? "").toUpperCase().startsWith("LAB"))
    .map((line) => ({
      sku: line.product?.sku ?? null,
      manufacturer: line.product?.manufacturer ?? null,
      supplier: line.product?.supplier ?? null,
      description: line.description,
      quantity: Number(line.quantity),
      unitCost: Number(line.unitCost),
      unitSell: Number(line.unitSell)
    }));
  const form = await prisma.projectForm.findUnique({ where: { id: quote.projectChangeRequestId } });
  if (!form) return null;
  const previous = changeRequestContent(form.content);
  const nextContent = {
    ...previous,
    linkedQuoteId: quote.id,
    linkedQuoteNumber: quote.quoteNumber,
    linkedQuoteVersionId: version.id,
    linkedQuoteVersionNumber: version.versionNumber,
    valueImpact: Number(version.sellTotal),
    difference: Number(version.sellTotal),
    resourceDayImpact: calculateLabResourceDays(version.lines),
    hardwareItems,
    pricingStatus: quote.status
  } satisfies Record<string, unknown>;
  await prisma.projectForm.update({
    where: { id: form.id },
    data: { content: nextContent as Prisma.InputJsonObject }
  });
  return nextContent;
}

export async function checkProjectResourceConflicts(context: CrmAccessContext, projectId: string, input: { resourceId: string; startDate: Date; endDate: Date }) {
  const project = await getProject(context, projectId);
  assertCanEditProject(context, project);
  const linkedResource = await prisma.resource.findFirst({
    where: { id: input.resourceId, deletedAt: null },
    include: { user: true }
  });
  if (!linkedResource) throw new Error("Resource not found");
  const projectConflicts = await detectResourceConflicts(linkedResource.id, input.startDate, input.endDate, projectId, linkedResource.userId);
  const bookingConflicts = await detectResourceBookingConflicts(linkedResource.id, input.startDate, input.endDate, linkedResource.userId ?? undefined);
  return [
    ...projectConflicts,
    ...bookingConflicts.map((conflict, index) => ({
      assignmentId: `booking-${index}`,
      projectId,
      projectNumber: project.projectNumber,
      projectName: conflict.message,
      startDate: input.startDate,
      endDate: input.endDate,
      role: "availability",
      scheduledDays: 0,
      conflictType: "leave"
    }))
  ];
}

export async function createProjectMilestone(context: CrmAccessContext, projectId: string, input: ProjectMilestoneCreateInput) {
  const project = await getProject(context, projectId);
  assertCanEditProject(context, project);
  const milestone = await prisma.projectMilestone.create({
    data: {
      projectId,
      ...input,
      baselineDate: input.baselineDate ?? null,
      manualDateOverride: input.manualDateOverride ?? false,
      completedAt: input.status === ProjectMilestoneStatus.complete ? new Date() : null
    }
  });
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "ProjectMilestone", entityId: projectId, action: "milestone_create", newValue: milestone as unknown as Prisma.InputJsonValue });
  return milestone;
}

export async function updateProjectMilestone(context: CrmAccessContext, milestoneId: string, input: ProjectMilestoneUpdateInput) {
  const previous = await prisma.projectMilestone.findFirst({ where: { id: milestoneId, deletedAt: null }, include: { project: { include: { tasks: true, resourceAssignments: true, forms: true } } } });
  if (!previous) throw new Error("Project milestone not found");
  await getProject(context, previous.projectId);
  assertCanEditProject(context, previous.project);
  const milestone = await prisma.projectMilestone.update({
    where: { id: milestoneId },
    data: {
      ...input,
      manualDateOverride: input.manualDateOverride ?? (input.milestoneDate ? true : previous.manualDateOverride),
      completedAt: input.status === ProjectMilestoneStatus.complete ? input.completedAt ?? new Date() : input.completedAt
    }
  });
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "ProjectMilestone", entityId: previous.projectId, action: "milestone_update", previousValue: previous as unknown as Prisma.InputJsonValue, newValue: milestone as unknown as Prisma.InputJsonValue });
  return milestone;
}

export async function updateProjectStageGate(context: CrmAccessContext, stageGateId: string, input: ProjectStageGateUpdateInput) {
  const previous = await prisma.projectStageGate.findUnique({ where: { id: stageGateId }, include: { project: { include: { tasks: true, resourceAssignments: true, forms: true } } } });
  if (!previous) throw new Error("Project stage gate not found");
  await getProject(context, previous.projectId);
  assertCanEditProject(context, previous.project);
  const status = input.status ?? previous.status;
  const gate = await prisma.projectStageGate.update({
    where: { id: stageGateId },
    data: {
      status,
      notes: input.notes,
      completedAt: status === "complete" ? new Date() : undefined,
      completedById: status === "complete" ? context.userId : undefined
    }
  });
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "ProjectStageGate", entityId: previous.projectId, action: "stage_gate_update", previousValue: previous as unknown as Prisma.InputJsonValue, newValue: gate as unknown as Prisma.InputJsonValue });
  if (status === "blocked" && previous.project.projectManagerId) await notifyProjectUser(previous.project.projectManagerId, "Project stage gate blocked", `${previous.stage} is blocked.`, `/projects/${previous.projectId}#overview`);
  return gate;
}

export async function lockProjectPlan(context: CrmAccessContext, projectId: string) {
  const project = await getProject(context, projectId);
  assertCanEditProject(context, project);
  await prisma.$transaction(async (transaction) => {
    await transaction.project.update({
      where: { id: projectId },
      data: {
        baselineStartDate: project.baselineStartDate ?? project.startDate,
        baselineEndDate: project.baselineEndDate ?? project.targetEndDate,
        planBaselinedAt: new Date(),
        planBaselinedById: context.userId,
        updatedById: context.userId
      }
    });
    for (const task of project.tasks) {
      await transaction.projectTask.update({
        where: { id: task.id },
        data: {
          baselineStartDate: task.startDate,
          baselineEndDate: task.endDate,
          baselineEstimatedDays: task.estimatedDays
        }
      });
    }
    for (const milestone of project.milestones) {
      await transaction.projectMilestone.update({
        where: { id: milestone.id },
        data: {
          baselineDate: milestone.milestoneDate
        }
      });
    }
  });
  await createAuditLog({
    userId: context.userId,
    module: "projects",
    entityType: "Project",
    entityId: projectId,
    action: "project_plan_lock",
    newValue: {
      planBaselinedAt: new Date().toISOString(),
      taskCount: project.tasks.length,
      milestoneCount: project.milestones.length
    } as Prisma.InputJsonValue
  });
  return getProject(context, projectId);
}

export async function addMissingDefaultProjectTasks(context: CrmAccessContext, projectId: string) {
  const project = await getProject(context, projectId);
  assertCanEditProject(context, project);
  await prisma.$transaction(async (transaction) => {
    await createMissingDefaultProjectTasks(transaction, project.id, project.projectType, project.startDate ?? new Date(), context.userId);
    await createMissingDefaultProjectDependencies(transaction, project.id, project.projectType, context.userId);
  });
  await recalculateProjectRollups(projectId);
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "Project", entityId: projectId, action: "add_missing_default_tasks" });
  return getProject(context, projectId);
}

export async function addMissingDefaultProjectDependencies(context: CrmAccessContext, projectId: string) {
  const project = await getProject(context, projectId);
  assertCanEditProject(context, project);
  await prisma.$transaction(async (transaction) => {
    await createMissingDefaultProjectDependencies(transaction, project.id, project.projectType, context.userId);
  });
  await createAuditLog({ userId: context.userId, module: "projects", entityType: "Project", entityId: projectId, action: "add_missing_default_dependencies" });
  return getProject(context, projectId);
}

export async function listProjectTaskTemplates(context: CrmAccessContext) {
  assertAnyProjectPermission(context, ["projects.create", "projects.update", "projects.read_all"]);
  return prisma.projectTaskTemplate.findMany({ include: { items: { orderBy: { sortOrder: "asc" } } }, orderBy: [{ projectType: "asc" }, { name: "asc" }] });
}

export async function createProjectTaskTemplate(context: CrmAccessContext, input: { name: string; projectType: string; isActive: boolean; items: { title: string; description?: string | null; defaultOwnerRole?: ProjectResourceRole | null; offsetDaysFromStart: number; defaultDurationDays: number; sortOrder: number }[] }) {
  if (!(context.permissionLevel === "administrator" || context.role === "Business Operations" || context.permissions.includes("admin.users"))) throw new Error("Missing permission: projects.update");
  return prisma.projectTaskTemplate.create({
    data: {
      name: input.name,
      projectType: input.projectType,
      isActive: input.isActive,
      items: { create: input.items }
    },
    include: { items: true }
  });
}

export async function listProjectManagers() {
  return prisma.user.findMany({ where: { isActive: true, deletedAt: null, deactivatedAt: null, role: { name: "Project Manager" } }, orderBy: { displayName: "asc" } });
}

export async function listProjectUsers() {
  return prisma.user.findMany({ where: { isActive: true, deletedAt: null, deactivatedAt: null, role: { name: { in: ["Project Manager", "Project Engineer", "Field Engineer", "Business Operations", "Pre-Sales", "Pre-Sales Engineer", "Administrator"] } } }, orderBy: { displayName: "asc" } });
}

export async function listProjectResources(context: CrmAccessContext) {
  assertAnyProjectPermission(context, ["projects.read_all", "projects.read_assigned", "projects.update"]);
  await syncActiveUsersToResources();
  return prisma.resource.findMany({
    where: {
      deletedAt: null,
      active: true,
      OR: [
        { userId: null },
        { user: { isActive: true, deletedAt: null, deactivatedAt: null } }
      ]
    },
    include: { user: true },
    orderBy: [{ displayName: "asc" }]
  });
}

async function nextProjectNumber(transaction: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;
  const latest = await transaction.project.findFirst({ where: { projectNumber: { startsWith: prefix } }, orderBy: { projectNumber: "desc" } });
  const sequence = latest ? Number(latest.projectNumber.replace(prefix, "")) + 1 : 1;
  return formatProjectNumber(year, sequence);
}

async function copyTemplateTasks(transaction: Prisma.TransactionClient, projectId: string, templateId: string | undefined, startDate: Date, userId: string) {
  if (!templateId) return;
  const template = await transaction.projectTaskTemplate.findFirst({ where: { id: templateId, isActive: true }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!template) return;
  for (const item of template.items) {
    const taskStart = addDays(startDate, item.offsetDaysFromStart);
    const taskEnd = addDays(taskStart, Math.max(0, item.defaultDurationDays - 1));
    await transaction.projectTask.create({
      data: {
        projectId,
        title: item.title,
        description: item.description,
        ownerId: userId,
        startDate: taskStart,
        endDate: taskEnd,
        estimatedDays: item.defaultDurationDays,
        sortOrder: item.sortOrder
      }
    });
  }
}

async function createMissingDefaultProjectTasks(transaction: Prisma.TransactionClient, projectId: string, projectType: OpportunityType | string | null | undefined, startDate: Date, userId: string) {
  const existing = await transaction.projectTask.findMany({ where: { projectId, deletedAt: null }, select: { title: true } });
  const existingTitles = new Set(existing.map((task) => task.title.trim().toLowerCase()));
  const taskInputs = defaultProjectTaskInputs(startDate, projectType);
  for (const [index, taskInput] of taskInputs.entries()) {
    if (existingTitles.has(taskInput.title.toLowerCase())) continue;
    await transaction.projectTask.create({
      data: {
        projectId,
        title: taskInput.title,
        ownerId: userId,
        startDate: taskInput.startDate,
        endDate: taskInput.endDate,
        estimatedDays: taskInput.estimatedDays,
        sortOrder: taskInput.sortOrder ?? index + 1
      }
    });
  }
  if (taskInputs.length) {
    await createNotification({ userId, title: "Default project tasks created", body: `${taskInputs.length} standard project tasks are available.`, metadata: { module: "projects", link: `/projects/${projectId}` } });
  }
}

async function createMissingDefaultProjectDependencies(
  transaction: Prisma.TransactionClient,
  projectId: string,
  projectType: OpportunityType | string | null | undefined,
  userId: string
) {
  const tasks = await transaction.projectTask.findMany({
    where: { projectId, deletedAt: null },
    select: { id: true, title: true, startDate: true, endDate: true, deletedAt: true },
    orderBy: [{ sortOrder: "asc" }, { startDate: "asc" }, { title: "asc" }]
  });
  const existingDependencies = await transaction.projectTaskDependency.findMany({
    where: { projectId },
    select: { predecessorTaskId: true, successorTaskId: true, dependencyType: true, lagDays: true }
  });
  const dependencies = getDefaultProjectTaskDependencies(projectType);
  const taskByTitle = new Map(tasks.map((task) => [task.title.trim().toLowerCase(), task]));
  const existingPairs = new Set(existingDependencies.map((dependency) => `${dependency.predecessorTaskId}:${dependency.successorTaskId}`));
  let createdCount = 0;

  for (const dependency of dependencies) {
    const predecessor = taskByTitle.get(dependency.predecessorTitle.trim().toLowerCase());
    const successor = taskByTitle.get(dependency.successorTitle.trim().toLowerCase());
    if (!predecessor || !successor) continue;
    const key = `${predecessor.id}:${successor.id}`;
    if (existingPairs.has(key)) continue;
    await transaction.projectTaskDependency.create({
      data: {
        projectId,
        predecessorTaskId: predecessor.id,
        successorTaskId: successor.id,
        dependencyType: dependency.dependencyType,
        lagDays: dependency.lagDays
      }
    });
    existingPairs.add(key);
    existingDependencies.push({
      predecessorTaskId: predecessor.id,
      successorTaskId: successor.id,
      dependencyType: dependency.dependencyType,
      lagDays: dependency.lagDays
    });
    createdCount += 1;
  }

  if (!createdCount || !dependencies.length) return;

  const rootTaskTitles = new Set(dependencies.map((dependency) => dependency.predecessorTitle.trim().toLowerCase()));
  dependencies.forEach((dependency) => rootTaskTitles.delete(dependency.successorTitle.trim().toLowerCase()));
  const rootTasks = [...rootTaskTitles]
    .map((title) => taskByTitle.get(title))
    .filter((task): task is NonNullable<typeof task> => Boolean(task));

  for (const rootTask of rootTasks) {
    const scheduleChanges = cascadeDependencySchedule({
      projectType,
      changedTaskId: rootTask.id,
      tasks,
      dependencies: existingDependencies,
      milestones: []
    });

    for (const update of scheduleChanges.taskUpdates) {
      await transaction.projectTask.update({
        where: { id: update.taskId },
        data: {
          startDate: update.startDate,
          endDate: update.endDate,
          estimatedDays: calculateWorkingDays(update.startDate, update.endDate)
        }
      });
      const current = tasks.find((task) => task.id === update.taskId);
      if (current) {
        current.startDate = update.startDate;
        current.endDate = update.endDate;
      }
      await createAuditLog({
        userId,
        module: "projects",
        entityType: "ProjectTask",
        entityId: projectId,
        action: "default_task_dependency_reschedule",
        newValue: {
          taskId: update.taskId,
          startDate: update.startDate,
          endDate: update.endDate,
          reason: update.reason
        } as Prisma.InputJsonValue
      });
    }
  }

  await createNotification({
    userId,
    title: "Default project dependencies created",
    body: `${createdCount} default task dependencies are now in place.`,
    metadata: { module: "projects", link: `/projects/${projectId}` }
  });
}

async function findLatestProjectableQuoteForOpportunity(opportunityId: string) {
  const quotes = await prisma.quote.findMany({
    where: {
      opportunityId,
      deletedAt: null,
      status: { in: eligibleQuoteStatuses }
    },
    include: {
      versions: {
        where: { status: { in: projectCreationQuoteVersionStatuses } },
        include: { lines: { where: { deletedAt: null }, include: { product: true } } },
        orderBy: { versionNumber: "desc" }
      }
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
  });
  return quotes.find((quote) => latestProjectableQuoteVersion(quote)) ?? null;
}

function latestProjectableQuoteVersion<TVersion extends { status: QuoteStatus; versionNumber: number }>(quote: { versions: TVersion[] }) {
  return quote.versions
    .filter((version) => projectCreationQuoteVersionStatuses.includes(version.status))
    .sort((a, b) => b.versionNumber - a.versionNumber)[0] ?? null;
}

function projectDescriptionFromSource(
  quote: { highLevelScope: string; opportunity?: { notes?: string | null; expectedCloseDate?: Date | null; ownerId?: string | null } | null },
  presalesRequest?: { requestNumber: string; requestType: string; assignedTo?: { displayName: string } | null; estimatedHours?: unknown; actualHours?: unknown; description?: string | null; deliverables: { title: string; status: string }[] } | null
) {
  const lines = [`Scope: ${quote.highLevelScope}`];
  if (quote.opportunity?.notes) lines.push(`Opportunity notes: ${quote.opportunity.notes}`);
  if (quote.opportunity?.expectedCloseDate) lines.push(`Expected close date: ${quote.opportunity.expectedCloseDate.toLocaleDateString("en-GB")}`);
  if (presalesRequest) {
    lines.push(`Pre-Sales request: ${presalesRequest.requestNumber}`);
    lines.push(`Pre-Sales type: ${presalesRequest.requestType}`);
    if (presalesRequest.assignedTo) lines.push(`Pre-Sales engineer: ${presalesRequest.assignedTo.displayName}`);
    if (presalesRequest.estimatedHours != null) lines.push(`Estimated pre-sales hours: ${presalesRequest.estimatedHours}`);
    if (presalesRequest.actualHours != null) lines.push(`Actual pre-sales hours: ${presalesRequest.actualHours}`);
    if (presalesRequest.description) lines.push(`Pre-Sales notes: ${presalesRequest.description}`);
    if (presalesRequest.deliverables.length) lines.push(`Pre-Sales deliverables: ${presalesRequest.deliverables.map((deliverable) => `${deliverable.title} (${deliverable.status})`).join(", ")}`);
  }
  return lines.join("\n");
}

function projectCreationAuditAction(source: NonNullable<ProjectCreationOptions["source"]>) {
  switch (source) {
    case "auto_acceptance":
      return "auto_create_from_accepted_quote";
    case "auto_closed_won":
      return "auto_create_from_closed_won_opportunity";
    default:
      return "create_from_quote";
  }
}

async function getCreatedProjectForSource(context: CrmAccessContext, projectId: string, source: NonNullable<ProjectCreationOptions["source"]>) {
  if (source === "manual") return getProject(context, projectId);
  return prisma.project.findUniqueOrThrow({ where: { id: projectId }, include: projectInclude });
}

async function recalculateProjectRollups(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { tasks: { where: { deletedAt: null } }, milestones: { where: { deletedAt: null } }, stageGates: true, resourceAssignments: { where: { deletedAt: null } }, financialEntries: true, forms: { where: { deletedAt: null } } }
  });
  await automateMilestonesAndStageGates(project);
  const refreshed = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { tasks: { where: { deletedAt: null } }, milestones: { where: { deletedAt: null } }, stageGates: true, resourceAssignments: { where: { deletedAt: null } }, financialEntries: true, forms: { where: { deletedAt: null } } }
  });
  const totalResourceDaysScheduled = refreshed.resourceAssignments.reduce((sum, resource) => sum + Number(resource.scheduledDays), 0);
  const totalResourceDaysUsed = refreshed.resourceAssignments.reduce((sum, resource) => sum + Number(resource.usedDays), 0);
  const invoiceEntries = refreshed.financialEntries.filter((entry) => entry.type === ProjectFinancialEntryType.invoice && entry.status !== "cancelled");
  const paymentEntries = refreshed.financialEntries.filter((entry) => entry.type === ProjectFinancialEntryType.payment && entry.status !== "cancelled");
  const invoicedAmount = invoiceEntries.length ? invoiceEntries.reduce((sum, entry) => sum + Number(entry.amount), 0) : Number(refreshed.invoicedAmount);
  const collectedAmount = paymentEntries.length ? paymentEntries.reduce((sum, entry) => sum + Number(entry.amount), 0) : Number(refreshed.collectedAmount);
  const ragStatus = calculateProjectRag({
    status: refreshed.status,
    targetEndDate: refreshed.targetEndDate,
    totalResourceDaysBudget: Number(refreshed.totalResourceDaysBudget),
    totalResourceDaysScheduled,
    totalResourceDaysUsed,
    tasks: refreshed.tasks
  });
  const previousRag = refreshed.ragStatus;
  const nextStatus = nextAutomatedProjectStatus({
    currentStatus: refreshed.status,
    tasks: refreshed.tasks,
    closureFormExists: refreshed.forms.some((form) => form.formType === ProjectFormType.closure)
  });
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: nextStatus,
      totalResourceDaysScheduled,
      totalResourceDaysUsed,
      invoicedAmount,
      collectedAmount,
      outstandingAmount: calculateOutstanding(invoicedAmount, collectedAmount),
      ragStatus
    }
  });
  if (previousRag !== ProjectRagStatus.red && ragStatus === ProjectRagStatus.red && refreshed.projectManagerId) {
    await notifyProjectUser(refreshed.projectManagerId, `Project ${refreshed.projectNumber} is red`, `${refreshed.name} requires attention.`, `/projects/${refreshed.id}`);
  }
}

async function automateMilestonesAndStageGates(project: {
  id: string;
  projectType: OpportunityType;
  tasks: { title: string; status: ProjectTaskStatus }[];
  milestones: { id: string; title: string; status: ProjectMilestoneStatus }[];
  stageGates: { id: string; stage: ProjectDeliveryStage; status: StageGateStatus }[];
  forms: { formType: ProjectFormType }[];
}) {
  for (const milestone of project.milestones) {
    if (milestone.status === ProjectMilestoneStatus.complete || milestone.status === ProjectMilestoneStatus.cancelled) continue;
    if (isMilestoneCompleteFromTasks(milestone.title, project.tasks, project.projectType)) {
      await prisma.projectMilestone.update({ where: { id: milestone.id }, data: { status: ProjectMilestoneStatus.complete, completedAt: new Date() } });
      milestone.status = ProjectMilestoneStatus.complete;
    }
  }
  const closureFormExists = project.forms.some((form) => form.formType === ProjectFormType.closure);
  for (const gate of project.stageGates) {
    if (gate.status === StageGateStatus.blocked || gate.status === StageGateStatus.complete) continue;
    const nextStatus = nextStageGateStatus(gate.stage, { projectType: project.projectType, tasks: project.tasks, milestones: project.milestones, closureFormExists });
    if (nextStatus !== gate.status) {
      await prisma.projectStageGate.update({ where: { id: gate.id }, data: { status: nextStatus, completedAt: nextStatus === StageGateStatus.complete ? new Date() : null } });
    }
  }
}

function changeRequestContent(content: Prisma.JsonValue): Record<string, unknown> {
  if (content && typeof content === "object" && !Array.isArray(content)) return content as Record<string, unknown>;
  return {};
}

function numberFromContent(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function normaliseHardwareImpact(item: unknown) {
  const value = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
  return {
    sku: stringOrNull(value.sku),
    manufacturer: stringOrNull(value.manufacturer),
    supplier: stringOrNull(value.supplier),
    description: String(value.description ?? ""),
    quantity: numberFromContent(value.quantity) || 1,
    unitCost: numberFromContent(value.unitCost),
    unitSell: numberFromContent(value.unitSell)
  };
}

function stringOrNull(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

async function notifyProjectChangeRequestDecision(projectId: string, projectManagerId: string | null | undefined, title: string, body: string) {
  const link = `/projects/${projectId}#change-requests`;
  const userIds = new Set<string>();
  if (projectManagerId) userIds.add(projectManagerId);
  const businessUsers = await prisma.user.findMany({ where: { isActive: true, deletedAt: null, role: { name: "Business Operations" } }, select: { id: true } });
  businessUsers.forEach((user) => userIds.add(user.id));
  await Promise.all([...userIds].map((userId) => createNotification({ userId, title, body, metadata: { module: "projects", link } })));
  await sendTemplatedEmailToUserIds(userIds, () => ({
    title,
    summary: body,
    actionLabel: "Open project",
    actionHref: link
  }));
}

async function notifyProjectUser(userId: string, title: string, body: string, link: string) {
  await createNotification({ userId, title, body, metadata: { module: "projects", link } });
  await sendTemplatedEmailToUserIds([userId], () => ({
    title,
    summary: body,
    actionLabel: "Open project",
    actionHref: link
  }));
}

async function notifyProjectTaskTiming(task: { title: string; assignedToId?: string | null; ownerId?: string | null; endDate: Date; status: ProjectTaskStatus }, projectName: string, link: string) {
  if (task.status === ProjectTaskStatus.complete || task.status === ProjectTaskStatus.cancelled) return;
  const userId = task.assignedToId ?? task.ownerId;
  if (!userId) return;
  const today = startOfToday();
  const dueSoon = addDays(today, 2);
  if (task.endDate < today) {
    await notifyProjectUser(userId, `Project task overdue: ${task.title}`, projectName, link);
  } else if (task.endDate <= dueSoon) {
    await notifyProjectUser(userId, `Project task due soon: ${task.title}`, projectName, link);
  }
}

async function applyDependencyScheduleChanges(input: {
  context: CrmAccessContext;
  projectId: string;
  projectType?: OpportunityType | string | null;
  changedTaskId: string;
  tasks: { id: string; title: string; startDate: Date; endDate: Date; deletedAt?: Date | null }[];
  milestones: { id: string; title: string; milestoneDate: Date; deletedAt?: Date | null; manualDateOverride?: boolean | null }[];
  dependencies?: { id?: string; predecessorTaskId: string; successorTaskId: string; dependencyType: ProjectDependencyType | string; lagDays?: number | null }[];
  reasonPrefix: string;
}) {
  const dependencies = input.dependencies ?? await prisma.projectTaskDependency.findMany({ where: { projectId: input.projectId } });
  const scheduleChanges = cascadeDependencySchedule({
    projectType: input.projectType,
    changedTaskId: input.changedTaskId,
    tasks: input.tasks,
    dependencies,
    milestones: input.milestones
  });
  if (!scheduleChanges.taskUpdates.length && !scheduleChanges.milestoneUpdates.length) {
    return scheduleChanges;
  }

  await prisma.$transaction(async (transaction) => {
    for (const update of scheduleChanges.taskUpdates) {
      await transaction.projectTask.update({
        where: { id: update.taskId },
        data: {
          startDate: update.startDate,
          endDate: update.endDate
        }
      });
      await createAuditLog({
        userId: input.context.userId,
        module: "projects",
        entityType: "ProjectTask",
        entityId: input.projectId,
        action: "task_dependency_reschedule",
        newValue: {
          taskId: update.taskId,
          startDate: update.startDate,
          endDate: update.endDate,
          reason: `${input.reasonPrefix}. ${update.reason}`
        } as Prisma.InputJsonValue
      });
    }
    for (const milestone of scheduleChanges.milestoneUpdates) {
      const currentMilestone = input.milestones.find((item) => item.id === milestone.milestoneId);
      if (currentMilestone?.manualDateOverride) {
        await createAuditLog({
          userId: input.context.userId,
          module: "projects",
          entityType: "ProjectMilestone",
          entityId: input.projectId,
          action: "milestone_dependency_reschedule_skipped",
          newValue: {
            milestoneId: milestone.milestoneId,
            reason: "Milestone manually set. Dependency update did not override it."
          } as Prisma.InputJsonValue
        });
        continue;
      }
      await transaction.projectMilestone.update({
        where: { id: milestone.milestoneId },
        data: {
          milestoneDate: milestone.milestoneDate
        }
      });
      await createAuditLog({
        userId: input.context.userId,
        module: "projects",
        entityType: "ProjectMilestone",
        entityId: input.projectId,
        action: "milestone_dependency_reschedule",
        newValue: {
          milestoneId: milestone.milestoneId,
          milestoneDate: milestone.milestoneDate,
          reason: `${input.reasonPrefix}. ${milestone.reason}`
        } as Prisma.InputJsonValue
      });
    }
  });

  return scheduleChanges;
}

function validateDateRange(startDate: Date, endDate: Date) {
  if (endDate < startDate) throw new Error("Invalid date range");
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export type ProjectListFilters = {
  status?: ProjectStatus;
  ragStatus?: ProjectRagStatus;
  projectManagerId?: string;
  accountId?: string;
  dueToStart?: boolean;
  dueToEnd?: boolean;
  overdue?: boolean;
  endingNext30Days?: boolean;
  overResourceBudget?: boolean;
  openIssues?: boolean;
  view?: ProjectDashboardView;
};

export function matchesProjectDashboardView(status: ProjectStatus, view: ProjectDashboardView) {
  switch (view) {
    case "completed":
      return status === ProjectStatus.completed;
    case "closed":
      return status === ProjectStatus.closed;
    case "cancelled":
      return status === ProjectStatus.cancelled;
    case "all":
      return true;
    case "active":
    default:
      return activeProjectStatuses.includes(status);
  }
}

export function projectCompletionPercent(project: { tasks: { status: ProjectTaskStatus | string; deletedAt?: Date | null }[] }) {
  return calculateTaskCompletionPercent(project.tasks);
}

export function projectTaskActualDaysUsed(project: { tasks: { actualDays?: number | Prisma.Decimal | null; deletedAt?: Date | null }[] }) {
  return project.tasks
    .filter((task) => !task.deletedAt)
    .reduce((sum, task) => sum + Number(task.actualDays ?? 0), 0);
}

export function projectTaskDayMetrics(project: { tasks: { estimatedDays?: number | Prisma.Decimal | null; actualDays?: number | Prisma.Decimal | null; deletedAt?: Date | null; status?: ProjectTaskStatus | string }[] }) {
  const activeTasks = project.tasks.filter((task) => !task.deletedAt && task.status !== ProjectTaskStatus.cancelled);
  const estimatedDays = activeTasks.reduce((sum, task) => sum + Number(task.estimatedDays ?? 0), 0);
  const actualDays = activeTasks.reduce((sum, task) => sum + Number(task.actualDays ?? 0), 0);
  const variance = actualDays - estimatedDays;
  const varianceLabel = variance > 0 ? "Over estimate" : variance < 0 ? "Under estimate" : "On estimate";
  return {
    estimatedDays,
    actualDays,
    variance,
    varianceLabel,
    overEstimate: variance > 0
  };
}

export function validateProjectTaskCompletion(input: {
  previousStatus: ProjectTaskStatus | string;
  nextStatus: ProjectTaskStatus | string;
  previousActualDays?: number | Prisma.Decimal | null;
  nextActualDays?: number | Prisma.Decimal | null;
  estimatedDays?: number | Prisma.Decimal | null;
}) {
  if (input.nextStatus !== ProjectTaskStatus.complete) return;
  const isTransitioningToComplete = input.previousStatus !== ProjectTaskStatus.complete;
  const previousActualDays = Number(input.previousActualDays ?? 0);
  const nextActualDays = Number(input.nextActualDays ?? 0);
  const actualDaysChanged = nextActualDays !== previousActualDays;
  if (!isTransitioningToComplete && !actualDaysChanged) return;
  const estimatedDays = Number(input.estimatedDays ?? 0);
  if (estimatedDays > 0 && nextActualDays <= 0) {
    throw new Error("Actual days used are required before completing this task.");
  }
}

function serialiseProjectTaskUpdateInput(input: ProjectTaskUpdateInput) {
  return {
    ...input,
    startDate: input.startDate?.toISOString(),
    endDate: input.endDate?.toISOString()
  };
}
