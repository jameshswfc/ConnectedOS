import { HelpdeskImpact, HelpdeskPriority, HelpdeskSlaStatus, HelpdeskTicketSource, HelpdeskTicketStatus, HelpdeskUrgency, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { assertAnyModulePermission, assertModulePermission, isAdminContext } from "@/modules/operations/module-permissions";
import { helpdeskCommentSchema, helpdeskQueueSchema, helpdeskTicketCreateSchema, helpdeskTicketUpdateSchema, knowledgeArticleSchema } from "@/modules/helpdesk/helpdesk-schemas";
import { createAuditLog } from "@/services/audit/audit-service";
import { sendTemplatedEmail, sendTemplatedEmailToUserIds } from "@/services/email/email-service";
import { ensureHelpdeskFolder, readStoredDocument, uploadFileToSharePointStub } from "@/services/documents/sharepoint-document-service";
import { createNotification } from "@/services/notifications/notification-service";
import { listActiveUsersByRole } from "@/services/users/user-service";
import { z } from "zod";

const ticketInclude = {
  account: true,
  contact: true,
  project: true,
  asset: true,
  raisedByUser: true,
  assignedTo: true,
  queue: true,
  resourceBookings: { where: { deletedAt: null }, include: { resource: { include: { user: true } } }, orderBy: { startDate: "asc" } },
  comments: { where: { deletedAt: null }, include: { author: true }, orderBy: { createdAt: "asc" } }
} satisfies Prisma.HelpdeskTicketInclude;

const helpdeskAccountScopeError = "Selected contact, quote, project or asset does not belong to the selected account.";
export const helpdeskActiveStatuses: HelpdeskTicketStatus[] = [
  HelpdeskTicketStatus.new,
  HelpdeskTicketStatus.triage,
  HelpdeskTicketStatus.assigned,
  HelpdeskTicketStatus.in_progress,
  HelpdeskTicketStatus.waiting_customer,
  HelpdeskTicketStatus.waiting_third_party
];
export type HelpdeskTicketListView = "active" | "resolved" | "closed" | "all";

export type HelpdeskUploadFile = {
  fileName: string;
  fileType?: string;
  buffer: Buffer;
};

export async function listHelpdeskTickets(context: CrmAccessContext, options: { view?: HelpdeskTicketListView } = {}) {
  assertAnyModulePermission(context, ["helpdesk.read_all", "helpdesk.read_assigned", "helpdesk.create", "helpdesk.update"]);
  const view = options.view ?? "active";
  const viewWhere = helpdeskViewWhere(view);
  return prisma.helpdeskTicket.findMany({
    where: {
      AND: [
        helpdeskVisibilityWhere(context),
        viewWhere
      ]
    },
    include: ticketInclude,
    orderBy: [{ createdAt: "desc" }]
  });
}

export async function getHelpdeskTicket(context: CrmAccessContext, id: string) {
  const ticket = await prisma.helpdeskTicket.findFirst({
    where: { AND: [helpdeskVisibilityWhere(context), { id }] },
    include: ticketInclude
  });
  if (!ticket) throw new Error("Helpdesk ticket not found");
  return ticket;
}

export async function createHelpdeskTicket(context: CrmAccessContext, input: z.input<typeof helpdeskTicketCreateSchema>) {
  assertModulePermission(context, "helpdesk.create");
  await validateHelpdeskAccountScope({
    accountId: input.accountId ?? null,
    contactId: input.contactId ?? null,
    projectId: input.projectId ?? null,
    assetId: input.assetId ?? null
  });
  const ticketNumber = await nextHelpdeskTicketNumber();
  const priority = input.priority ?? HelpdeskPriority.normal;
  const impact = input.impact ?? HelpdeskImpact.low;
  const urgency = input.urgency ?? HelpdeskUrgency.low;
  const source = input.source ?? HelpdeskTicketSource.manual;
  const sla = calculateSlaDueDates(priority);
  const ticket = await prisma.helpdeskTicket.create({
    data: {
      ticketNumber,
      accountId: input.accountId,
      contactId: input.contactId,
      projectId: input.projectId,
      assetId: input.assetId,
      raisedByUserId: context.userId,
      raisedByName: input.raisedByName,
      raisedByEmail: input.raisedByEmail,
      title: input.title,
      description: input.description,
      ticketType: input.ticketType,
      category: input.category,
      priority,
      impact,
      urgency,
      assignedToId: input.assignedToId,
      queueId: input.queueId,
      source,
      slaResponseDueAt: sla.responseDueAt,
      slaResolutionDueAt: sla.resolutionDueAt,
      slaStatus: HelpdeskSlaStatus.on_track
    },
    include: ticketInclude
  });
  await createAuditLog({ userId: context.userId, module: "helpdesk", entityType: "HelpdeskTicket", entityId: ticket.id, action: "create", newValue: ticket as unknown as Prisma.InputJsonValue });
  if (ticket.priority === HelpdeskPriority.urgent || ticket.priority === HelpdeskPriority.critical) {
    const admins = await listActiveUsersByRole("Administrator");
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: "Urgent helpdesk ticket",
        body: `${ticket.ticketNumber} requires attention.`,
        metadata: { href: `/helpdesk/tickets/${ticket.id}` }
      });
    }
    await sendTemplatedEmailToUserIds(admins.map((admin) => admin.id), () => ({
      title: `Urgent helpdesk ticket: ${ticket.ticketNumber}`,
      summary: `${ticket.ticketNumber} requires immediate attention.`,
      details: [
        { label: "Ticket", value: ticket.ticketNumber },
        { label: "Priority", value: ticket.priority.replaceAll("_", " ") },
        { label: "Account", value: ticket.account?.name ?? "-" },
        { label: "Title", value: ticket.title }
      ],
      actionLabel: "Open ticket",
      actionHref: `/helpdesk/tickets/${ticket.id}`
    }));
  }
  if (ticket.assignedToId) {
    await createNotification({
      userId: ticket.assignedToId,
      title: "Helpdesk ticket assigned",
      body: `${ticket.ticketNumber} was assigned to you.`,
      metadata: { href: `/helpdesk/tickets/${ticket.id}` }
    });
    await sendTemplatedEmailToUserIds([ticket.assignedToId], () => ({
      title: "Helpdesk ticket assigned",
      summary: `${ticket.ticketNumber} was assigned to you.`,
      details: [
        { label: "Ticket", value: ticket.ticketNumber },
        { label: "Priority", value: ticket.priority.replaceAll("_", " ") },
        { label: "Account", value: ticket.account?.name ?? "-" },
        { label: "Title", value: ticket.title }
      ],
      actionLabel: "Open ticket",
      actionHref: `/helpdesk/tickets/${ticket.id}`
    }));
  }
  return ticket;
}

export async function updateHelpdeskTicket(context: CrmAccessContext, id: string, input: z.input<typeof helpdeskTicketUpdateSchema>) {
  assertAnyModulePermission(context, ["helpdesk.update", "helpdesk.read_assigned"]);
  const previous = await getHelpdeskTicket(context, id);
  const nextStatus = input.status ?? previous.status;
  const resolutionNote = input.resolutionNote?.trim() || null;
  const lifecycleAction = resolveHelpdeskLifecycleAction(previous.status, nextStatus);
  logHelpdeskAction("attempt", {
    action: lifecycleAction,
    ticketId: id,
    userId: context.userId,
    previousStatus: previous.status,
    nextStatus,
    hasResolutionNote: Boolean(resolutionNote)
  });

  try {
    validateHelpdeskStatusTransition(previous.status, nextStatus, resolutionNote);
    if (hasHelpdeskRelationshipUpdate(input)) {
      await validateHelpdeskAccountScope({
        accountId: input.accountId !== undefined ? input.accountId ?? null : previous.accountId,
        contactId: input.contactId !== undefined ? input.contactId ?? null : previous.contactId,
        projectId: input.projectId !== undefined ? input.projectId ?? null : previous.projectId,
        assetId: input.assetId !== undefined ? input.assetId ?? null : previous.assetId
      });
    }
    const { resolutionNote: _resolutionNote, ...ticketInput } = input;
    const priority = input.priority ?? undefined;
    const impact = input.impact ?? undefined;
    const urgency = input.urgency ?? undefined;
    const source = input.source ?? undefined;
    const sla = priority ? calculateSlaDueDates(priority) : null;
    const resolvedNow = nextStatus === HelpdeskTicketStatus.resolved && previous.status !== HelpdeskTicketStatus.resolved;
    const closedNow = nextStatus === HelpdeskTicketStatus.closed && previous.status !== HelpdeskTicketStatus.closed;
    const reopened = nextStatus === HelpdeskTicketStatus.in_progress
      && ([HelpdeskTicketStatus.resolved, HelpdeskTicketStatus.closed] as HelpdeskTicketStatus[]).includes(previous.status);
    const ticket = await prisma.helpdeskTicket.update({
      where: { id },
      data: {
        ...ticketInput,
        priority,
        impact,
        urgency,
        source,
        slaResponseDueAt: sla?.responseDueAt ?? previous.slaResponseDueAt,
        slaResolutionDueAt: sla?.resolutionDueAt ?? previous.slaResolutionDueAt,
        firstResponseAt: input.status && input.status !== HelpdeskTicketStatus.new && !previous.firstResponseAt ? new Date() : previous.firstResponseAt,
        resolvedAt: reopened
          ? null
          : resolvedNow
            ? new Date()
            : nextStatus === HelpdeskTicketStatus.closed
              ? previous.resolvedAt ?? new Date()
              : previous.resolvedAt,
        closedAt: reopened ? null : closedNow ? new Date() : previous.closedAt,
        slaStatus: nextTicketSlaStatus(nextStatus, previous.slaResolutionDueAt ?? undefined)
      },
      include: ticketInclude
    });
    await createAuditLog({ userId: context.userId, module: "helpdesk", entityType: "HelpdeskTicket", entityId: ticket.id, action: "update", previousValue: previous, newValue: ticket });
    if (resolvedNow && resolutionNote) {
      const resolutionComment = await prisma.helpdeskTicketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: context.userId,
          visibility: "internal",
          body: `Resolution note: ${resolutionNote}`
        },
        include: { author: true }
      });
      await createAuditLog({
        userId: context.userId,
        module: "helpdesk",
        entityType: "HelpdeskTicketComment",
        entityId: resolutionComment.id,
        action: "create",
        newValue: resolutionComment
      });
    }
    const sideEffects: Array<Promise<unknown> | null> = [];
    if (ticket.assignedToId && ticket.assignedToId !== previous.assignedToId) {
      sideEffects.push(createNotification({
        userId: ticket.assignedToId,
        title: "Helpdesk ticket assigned",
        body: `${ticket.ticketNumber} was assigned to you.`,
        metadata: { href: `/helpdesk/tickets/${ticket.id}` }
      }));
      sideEffects.push(sendTemplatedEmailToUserIds([ticket.assignedToId], () => ({
        title: "Helpdesk ticket assigned",
        summary: `${ticket.ticketNumber} was assigned to you.`,
        details: [
          { label: "Ticket", value: ticket.ticketNumber },
          { label: "Priority", value: ticket.priority.replaceAll("_", " ") },
          { label: "Status", value: ticket.status.replaceAll("_", " ") }
        ],
        actionLabel: "Open ticket",
        actionHref: `/helpdesk/tickets/${ticket.id}`
      })));
    }
    if (resolvedNow) {
      if (ticket.raisedByUserId) {
        sideEffects.push(createNotification({
          userId: ticket.raisedByUserId,
          title: "Helpdesk ticket resolved",
          body: `${ticket.ticketNumber} has been resolved.`,
          metadata: { href: `/helpdesk/tickets/${ticket.id}` }
        }));
      }
      const recipient = ticket.raisedByEmail || ticket.raisedByUser?.email;
      if (recipient) {
        sideEffects.push(sendTemplatedEmail({
          to: recipient,
          title: "Helpdesk ticket resolved",
          summary: `${ticket.ticketNumber} has been resolved.`,
          details: [
            { label: "Ticket", value: ticket.ticketNumber },
            { label: "Title", value: ticket.title },
            { label: "Status", value: "Resolved" },
            ...(resolutionNote ? [{ label: "Resolution note", value: resolutionNote }] : [])
          ],
          actionLabel: "View ticket",
          actionHref: `/helpdesk/tickets/${ticket.id}`
        }));
      }
    }
    if (closedNow && ticket.raisedByUserId) {
      sideEffects.push(createNotification({
        userId: ticket.raisedByUserId,
        title: "Helpdesk ticket closed",
        body: `${ticket.ticketNumber} has been closed.`,
        metadata: { href: `/helpdesk/tickets/${ticket.id}` }
      }));
    }
    if (ticket.slaStatus === HelpdeskSlaStatus.breached && previous.slaStatus !== HelpdeskSlaStatus.breached) {
      const businessUsers = await listActiveUsersByRole("Business Operations");
      const recipients = new Set<string>(businessUsers.map((user) => user.id));
      if (ticket.assignedToId) recipients.add(ticket.assignedToId);
      sideEffects.push(sendTemplatedEmailToUserIds(recipients, () => ({
        title: `Helpdesk SLA breached: ${ticket.ticketNumber}`,
        summary: `${ticket.ticketNumber} has breached its SLA target.`,
        details: [
          { label: "Ticket", value: ticket.ticketNumber },
          { label: "Priority", value: ticket.priority.replaceAll("_", " ") },
          { label: "Status", value: ticket.status.replaceAll("_", " ") }
        ],
        actionLabel: "Open ticket",
        actionHref: `/helpdesk/tickets/${ticket.id}`
      })));
    }
    await runHelpdeskSideEffects(sideEffects, {
      ticketId: ticket.id,
      action: nextStatus,
      userId: context.userId
    });
    logHelpdeskAction("success", {
      action: lifecycleAction,
      ticketId: ticket.id,
      userId: context.userId,
      previousStatus: previous.status,
      nextStatus: ticket.status,
      hasResolutionNote: Boolean(resolutionNote)
    });
    return ticket;
  } catch (error) {
    logHelpdeskAction("failure", {
      action: lifecycleAction,
      ticketId: id,
      userId: context.userId,
      previousStatus: previous.status,
      nextStatus,
      hasResolutionNote: Boolean(resolutionNote),
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function addHelpdeskComment(context: CrmAccessContext, ticketId: string, input: z.input<typeof helpdeskCommentSchema>) {
  assertAnyModulePermission(context, ["helpdesk.update", "helpdesk.read_assigned"]);
  await getHelpdeskTicket(context, ticketId);
  const comment = await prisma.helpdeskTicketComment.create({
    data: {
      ticketId,
      authorId: context.userId,
      visibility: input.visibility,
      body: input.body
    },
    include: { author: true }
  });
  await createAuditLog({ userId: context.userId, module: "helpdesk", entityType: "HelpdeskTicketComment", entityId: comment.id, action: "create", newValue: comment as unknown as Prisma.InputJsonValue });
  return getHelpdeskTicket(context, ticketId);
}

export async function listHelpdeskQueues(context: CrmAccessContext) {
  assertAnyModulePermission(context, ["helpdesk.read_all", "helpdesk.create", "helpdesk.update"]);
  return prisma.helpdeskQueue.findMany({ orderBy: { name: "asc" } });
}

export async function createHelpdeskQueue(context: CrmAccessContext, input: z.input<typeof helpdeskQueueSchema>) {
  assertModulePermission(context, "helpdesk.update");
  return prisma.helpdeskQueue.create({ data: input });
}

export async function listKnowledgeArticles(context: CrmAccessContext) {
  assertAnyModulePermission(context, ["helpdesk.manage_knowledge", "helpdesk.read_all", "helpdesk.read_assigned"]);
  return prisma.knowledgeArticle.findMany({ orderBy: [{ updatedAt: "desc" }] });
}

export async function createKnowledgeArticle(context: CrmAccessContext, input: z.input<typeof knowledgeArticleSchema>) {
  assertModulePermission(context, "helpdesk.manage_knowledge");
  return prisma.knowledgeArticle.create({
    data: {
      ...input,
      createdById: context.userId,
      updatedById: context.userId
    }
  });
}

export async function getHelpdeskDashboard(context: CrmAccessContext) {
  const tickets = await listHelpdeskTickets(context, { view: "all" });
  const now = new Date();
  const closedStatuses: HelpdeskTicketStatus[] = [HelpdeskTicketStatus.closed, HelpdeskTicketStatus.cancelled];
  const terminalStatuses: HelpdeskTicketStatus[] = [HelpdeskTicketStatus.resolved, HelpdeskTicketStatus.closed, HelpdeskTicketStatus.cancelled];
  const firstResponseTimes = tickets.filter((ticket) => ticket.firstResponseAt).map((ticket) => ticket.firstResponseAt!.getTime() - ticket.createdAt.getTime());
  const resolutionTimes = tickets.filter((ticket) => ticket.resolvedAt).map((ticket) => ticket.resolvedAt!.getTime() - ticket.createdAt.getTime());
  return {
    openTickets: tickets.filter((ticket) => helpdeskActiveStatuses.includes(ticket.status)).length,
    breaches: tickets.filter((ticket) => ticket.slaResolutionDueAt && ticket.slaResolutionDueAt < now && !terminalStatuses.includes(ticket.status)).length,
    averageFirstResponseMinutes: firstResponseTimes.length ? Math.round(firstResponseTimes.reduce((sum, value) => sum + value, 0) / firstResponseTimes.length / 60000) : 0,
    averageResolutionMinutes: resolutionTimes.length ? Math.round(resolutionTimes.reduce((sum, value) => sum + value, 0) / resolutionTimes.length / 60000) : 0,
    tickets
  };
}

function helpdeskViewWhere(view: HelpdeskTicketListView): Prisma.HelpdeskTicketWhereInput {
  switch (view) {
    case "resolved":
      return { status: HelpdeskTicketStatus.resolved };
    case "closed":
      return { status: { in: [HelpdeskTicketStatus.closed, HelpdeskTicketStatus.cancelled] } };
    case "all":
      return {};
    case "active":
    default:
      return { status: { in: helpdeskActiveStatuses } };
  }
}

export async function listHelpdeskAttachments(context: CrmAccessContext, ticketId: string) {
  await getHelpdeskTicket(context, ticketId);
  return prisma.document.findMany({
    where: {
      deletedAt: null,
      entityType: "HelpdeskTicket",
      entityId: ticketId
    },
    orderBy: { uploadedAt: "desc" }
  });
}

async function validateHelpdeskAccountScope(input: {
  accountId: string | null;
  contactId: string | null;
  projectId: string | null;
  assetId: string | null;
}) {
  if (!input.accountId) {
    if (input.contactId || input.projectId || input.assetId) {
      throw new Error(helpdeskAccountScopeError);
    }
    return;
  }

  const [contact, project, asset] = await Promise.all([
    input.contactId ? prisma.contact.findFirst({ where: { id: input.contactId, deletedAt: null }, select: { accountId: true } }) : Promise.resolve(null),
    input.projectId ? prisma.project.findFirst({ where: { id: input.projectId, deletedAt: null }, select: { accountId: true } }) : Promise.resolve(null),
    input.assetId ? prisma.asset.findFirst({ where: { id: input.assetId, deletedAt: null }, select: { accountId: true } }) : Promise.resolve(null)
  ]);

  if ((input.contactId && (!contact || contact.accountId !== input.accountId))
    || (input.projectId && (!project || project.accountId !== input.accountId))
    || (input.assetId && (!asset || asset.accountId !== input.accountId))) {
    throw new Error(helpdeskAccountScopeError);
  }
}

export async function uploadHelpdeskAttachment(context: CrmAccessContext, ticketId: string, file: HelpdeskUploadFile) {
  const ticket = await getHelpdeskTicket(context, ticketId);
  assertAnyModulePermission(context, ["helpdesk.update", "helpdesk.read_assigned"]);
  const document = await uploadFileToSharePointStub({
    folderPath: ensureHelpdeskFolder(ticket.ticketNumber, ticket.account?.name ?? "General"),
    fileName: file.fileName,
    fileType: file.fileType,
    buffer: file.buffer,
    entityType: "HelpdeskTicket",
    entityId: ticket.id,
    uploadedById: context.userId
  });
  await createAuditLog({
    userId: context.userId,
    module: "helpdesk",
    entityType: "Document",
    entityId: document.id,
    action: "upload_attachment",
    newValue: document as unknown as Prisma.InputJsonValue
  });
  return document;
}

export async function getHelpdeskAttachmentDownload(context: CrmAccessContext, ticketId: string, documentId: string) {
  await getHelpdeskTicket(context, ticketId);
  const record = await prisma.document.findFirst({
    where: {
      id: documentId,
      deletedAt: null,
      entityType: "HelpdeskTicket",
      entityId: ticketId
    }
  });
  if (!record) throw new Error("Helpdesk attachment not found");
  return readStoredDocument(record.id, context.userId);
}

export async function createProjectIssueFromTicket(context: CrmAccessContext, ticketId: string) {
  const ticket = await getHelpdeskTicket(context, ticketId);
  if (!ticket.projectId) {
    throw new Error("Ticket is not linked to a project");
  }
  const issue = await prisma.projectIssueAction.create({
    data: {
      projectId: ticket.projectId,
      type: "issue",
      title: `Helpdesk ${ticket.ticketNumber}: ${ticket.title}`,
      description: ticket.description,
      ownerId: ticket.assignedToId,
      status: "open",
      priority: ticket.priority === HelpdeskPriority.critical || ticket.priority === HelpdeskPriority.urgent ? "urgent" : ticket.priority === HelpdeskPriority.high ? "high" : "normal"
    }
  });
  await createAuditLog({
    userId: context.userId,
    module: "helpdesk",
    entityType: "HelpdeskTicket",
    entityId: ticket.id,
    action: "create_project_issue",
    newValue: { projectIssueActionId: issue.id } as Prisma.InputJsonValue
  });
  return issue;
}

function calculateSlaDueDates(priority: HelpdeskPriority) {
  const now = new Date();
  const rules = {
    critical: { responseMinutes: 60, resolutionMinutes: 240 },
    urgent: { responseMinutes: 120, resolutionMinutes: 480 },
    high: { responseMinutes: 240, resolutionMinutes: 60 * 24 * 2 },
    normal: { responseMinutes: 60 * 24, resolutionMinutes: 60 * 24 * 5 },
    low: { responseMinutes: 60 * 24 * 2, resolutionMinutes: 60 * 24 * 10 }
  } as const;
  const rule = rules[priority];
  return {
    responseDueAt: new Date(now.getTime() + rule.responseMinutes * 60000),
    resolutionDueAt: new Date(now.getTime() + rule.resolutionMinutes * 60000)
  };
}

function nextTicketSlaStatus(status: HelpdeskTicketStatus, dueAt?: Date) {
  if (([HelpdeskTicketStatus.waiting_customer, HelpdeskTicketStatus.waiting_third_party] as HelpdeskTicketStatus[]).includes(status)) return HelpdeskSlaStatus.paused;
  if (([HelpdeskTicketStatus.resolved, HelpdeskTicketStatus.closed, HelpdeskTicketStatus.cancelled] as HelpdeskTicketStatus[]).includes(status)) return HelpdeskSlaStatus.on_track;
  if (!dueAt) return HelpdeskSlaStatus.on_track;
  const remainingMs = dueAt.getTime() - Date.now();
  if (remainingMs < 0) return HelpdeskSlaStatus.breached;
  if (remainingMs <= 4 * 60 * 60 * 1000) return HelpdeskSlaStatus.due_soon;
  return HelpdeskSlaStatus.on_track;
}

function validateHelpdeskStatusTransition(previousStatus: HelpdeskTicketStatus, nextStatus: HelpdeskTicketStatus, resolutionNote: string | null) {
  if (nextStatus === HelpdeskTicketStatus.resolved && !resolutionNote) {
    throw new Error("Unable to resolve ticket. Please add a resolution note and try again.");
  }
  if (nextStatus === HelpdeskTicketStatus.closed && !([HelpdeskTicketStatus.resolved, HelpdeskTicketStatus.closed] as HelpdeskTicketStatus[]).includes(previousStatus)) {
    throw new Error("Please resolve this ticket before closing it.");
  }
  if (previousStatus === HelpdeskTicketStatus.closed && nextStatus === HelpdeskTicketStatus.closed) {
    throw new Error("Unable to close ticket. The ticket is already closed.");
  }
  if (previousStatus === HelpdeskTicketStatus.cancelled) {
    throw new Error("Unable to update ticket. Cancelled tickets cannot be changed.");
  }
}

function hasHelpdeskRelationshipUpdate(input: z.input<typeof helpdeskTicketUpdateSchema>) {
  return input.accountId !== undefined
    || input.contactId !== undefined
    || input.projectId !== undefined
    || input.assetId !== undefined;
}

function resolveHelpdeskLifecycleAction(previousStatus: HelpdeskTicketStatus, nextStatus: HelpdeskTicketStatus) {
  if (nextStatus === HelpdeskTicketStatus.resolved && previousStatus !== HelpdeskTicketStatus.resolved) return "resolve";
  if (nextStatus === HelpdeskTicketStatus.closed && previousStatus !== HelpdeskTicketStatus.closed) return "close";
  if (nextStatus === HelpdeskTicketStatus.in_progress && ([HelpdeskTicketStatus.resolved, HelpdeskTicketStatus.closed] as HelpdeskTicketStatus[]).includes(previousStatus)) return "reopen";
  return "update";
}

function logHelpdeskAction(event: "attempt" | "success" | "failure", details: Record<string, unknown>) {
  const payload = JSON.stringify({ ...details });
  if (event === "failure") {
    console.warn(`[helpdesk:ticket-action] ${payload}`);
    return;
  }
  console.info(`[helpdesk:ticket-action] ${payload}`);
}

async function runHelpdeskSideEffects(
  effects: Array<Promise<unknown> | null>,
  meta: { ticketId: string; action: string; userId: string }
) {
  const results = await Promise.allSettled(effects.filter(Boolean));
  for (const result of results) {
    if (result.status === "rejected") {
      console.warn("[helpdesk] side effect failed", {
        ticketId: meta.ticketId,
        action: meta.action,
        userId: meta.userId,
        message: result.reason instanceof Error ? result.reason.message : String(result.reason)
      });
    }
  }
}

async function nextHelpdeskTicketNumber() {
  const year = new Date().getFullYear();
  const prefix = `HD-${year}-`;
  const latest = await prisma.helpdeskTicket.findFirst({ where: { ticketNumber: { startsWith: prefix } }, orderBy: { ticketNumber: "desc" } });
  return `${prefix}${String(latest ? Number(latest.ticketNumber.slice(prefix.length)) + 1 : 1).padStart(4, "0")}`;
}

function helpdeskVisibilityWhere(context: CrmAccessContext): Prisma.HelpdeskTicketWhereInput {
  if (isAdminContext(context) || context.permissions.includes("helpdesk.read_all") || context.permissions.includes("helpdesk.update")) {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: [
      { assignedToId: context.userId },
      { raisedByUserId: context.userId },
      { project: { projectManagerId: context.userId, deletedAt: null } },
      { account: { ownerId: context.userId, deletedAt: null } }
    ]
  };
}
