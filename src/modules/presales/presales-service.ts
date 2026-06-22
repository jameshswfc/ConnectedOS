import {
  OpportunityStage,
  OpportunityType,
  PresalesCommercialPriority,
  PresalesPriority,
  PresalesRequestCategory,
  PresalesRequestStatus,
  PresalesRequestType,
  PresalesDeliverableStatus,
  PresalesTaskStatus,
  type PresalesDeliverableType,
  type Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { accountVisibilityWhere, opportunityVisibilityWhere } from "@/modules/crm/crm-permissions";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { quoteVisibilityWhere } from "@/modules/quoting/quotes/quote-permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { createNotification } from "@/services/notifications/notification-service";
import { calculateStageFinancials } from "@/modules/crm/opportunities/opportunity-calculations";
import { calculatePresalesDeadlineStatus } from "@/modules/presales/presales-deadlines";
import { PresalesDocumentFolderServiceStub } from "@/modules/presales/presales-document-folder-service";
import {
  buildPresalesSharePointTargetPath,
  readPresalesStoredFile,
  savePresalesUploadBuffer
} from "@/modules/presales/presales-file-storage";
import {
  buildBomDeliverableDescription,
  calculateDeliverableProgress,
  filterNewPresalesDeliverableTemplates,
  getExpectedPresalesDeliverables
} from "@/modules/presales/presales-deliverable-templates";
import {
  assertAnyPresalesPermission,
  assertCanEditPresalesRequest,
  assertPresalesPermission,
  canAssignPresales,
  presalesVisibilityWhere
} from "@/modules/presales/presales-permissions";
import type {
  PresalesAssignInput,
  PresalesCommentCreateInput,
  PresalesDocumentCreateInput,
  PresalesRequestCreateInput,
  PresalesRequestUpdateInput,
  PresalesStatusChangeInput,
  PresalesTaskCreateInput,
  PresalesTaskUpdateInput
} from "@/modules/presales/schemas/presales-schemas";

const requestInclude = {
  account: true,
  opportunity: { include: { owner: true } },
  quote: true,
  requestedBy: true,
  assignedTo: true,
  tasks: { where: { deletedAt: null }, include: { assignedTo: true }, orderBy: { createdAt: "asc" } },
  deliverables: { include: { document: true, uploadedBy: true, assignedTo: true }, orderBy: { createdAt: "asc" } }
} as const;

const completedStatuses: PresalesRequestStatus[] = [PresalesRequestStatus.complete, PresalesRequestStatus.cancelled];

export async function listPresalesRequests(context: CrmAccessContext, filters: PresalesListFilters = {}) {
  assertAnyPresalesPermission(context, ["presales.read_all", "presales.read_assigned", "presales.create"]);
  await refreshPresalesDeadlineStatuses();
  return prisma.presalesRequest.findMany({
    where: {
      AND: [
        presalesVisibilityWhere(context),
        filters.status ? { status: filters.status } : {},
        filters.priority ? { priority: filters.priority } : {},
        filters.commercialPriority ? { commercialPriority: filters.commercialPriority } : {},
        filters.assignedToId ? { assignedToId: filters.assignedToId } : {},
        filters.requestType ? { requestType: filters.requestType } : {},
        filters.requestCategory ? { requestCategory: filters.requestCategory } : {},
        filters.dueSoon ? { slaStatus: "due_soon" } : {},
        filters.overdue ? { slaStatus: "overdue" } : {},
        filters.salespersonId ? { OR: [{ requestedById: filters.salespersonId }, { opportunity: { ownerId: filters.salespersonId } }] } : {}
      ]
    },
    include: requestInclude,
    orderBy: [{ internalDeadline: "asc" }, { updatedAt: "desc" }]
  });
}

export async function getPresalesRequest(context: CrmAccessContext, id: string) {
  assertAnyPresalesPermission(context, ["presales.read_all", "presales.read_assigned", "presales.create"]);
  await refreshPresalesDeadlineStatuses(id);
  const request = await prisma.presalesRequest.findFirst({
    where: { AND: [presalesVisibilityWhere(context), { id }] },
    include: requestInclude
  });
  if (!request) throw new Error("Pre-sales request not found");
  const [documents, comments, auditLogs] = await Promise.all([
    prisma.document.findMany({ where: { entityType: "PresalesRequest", entityId: id, deletedAt: null }, orderBy: { uploadedAt: "desc" } }),
    prisma.comment.findMany({ where: { entityType: "PresalesRequest", entityId: id, deletedAt: null }, include: { createdBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.auditLog.findMany({ where: { module: "presales", entityType: { in: ["PresalesRequest", "PresalesTask", "Document", "Comment"] }, entityId: id }, orderBy: { timestamp: "desc" }, take: 25 })
  ]);
  const uploaderIds = [...new Set(documents.map((document) => document.uploadedById).filter(Boolean))] as string[];
  const uploaders = uploaderIds.length
    ? await prisma.user.findMany({ where: { id: { in: uploaderIds } }, select: { id: true, displayName: true, email: true } })
    : [];
  const uploaderById = new Map(uploaders.map((uploader) => [uploader.id, uploader]));
  return {
    ...request,
    deliverableProgress: calculateDeliverableProgress(request.deliverables),
    documents: documents.map((document) => ({
      ...document,
      uploadedBy: document.uploadedById ? uploaderById.get(document.uploadedById) ?? null : null,
      sharePointTargetPath: safeSharePointTargetPath(request.sharePointFolderUrl, request.requestNumber, document.fileName)
    })),
    comments,
    auditLogs
  };
}

export async function createPresalesRequest(context: CrmAccessContext, input: PresalesRequestCreateInput, options: PresalesRequestCreateOptions = {}) {
  assertPresalesPermission(context, "presales.create");
  const resolved = await resolveRequestLinks(context, input);
  const linkedOpportunity = resolved.opportunity ?? resolved.quote?.opportunity ?? null;
  const requestedById = options.requestedById ?? context.userId;
  const deadlineStatus = calculatePresalesDeadlineStatus(input.internalDeadline, PresalesRequestStatus.submitted);
  const syncedOpportunityStage = linkedOpportunity && !options.skipOpportunityStageSync
    ? buildPresalesOpportunityStageSync(linkedOpportunity.stage, Number(linkedOpportunity.value))
    : null;
  const request = await prisma.$transaction(async (transaction) => {
    const requestNumber = await nextPresalesRequestNumber(transaction);
    const folderService = new PresalesDocumentFolderServiceStub();
    const folder = folderService.designFolder({
      requestNumber,
      accountName: resolved.account.name,
      description: resolved.opportunity?.opportunityName ?? resolved.quote?.title ?? input.description,
      year: input.internalDeadline.getFullYear()
    });
    const created = await transaction.presalesRequest.create({
      data: {
        requestNumber,
        accountId: resolved.account.id,
        opportunityId: linkedOpportunity?.id,
        quoteId: resolved.quote?.id,
        requestedById,
        assignedToId: input.assignedToId,
        requestCategory: input.requestCategory,
        requestType: input.requestType,
        priority: input.priority,
        commercialPriority: input.commercialPriority,
        status: input.assignedToId ? PresalesRequestStatus.assigned : PresalesRequestStatus.submitted,
        ...deadlineStatus,
        description: input.description,
        requestedDeliveryDate: input.requestedDeliveryDate,
        internalDeadline: input.internalDeadline,
        estimatedHours: input.estimatedHours,
        quoteValueSnapshot: resolved.quote ? resolved.quote.sellTotal : null,
        quoteVersionSnapshot: resolved.quote ? resolved.quote.currentVersionNumber : null,
        sharePointFolderUrl: folder.folderUrl,
        createdById: context.userId,
        updatedById: context.userId
      }
    });
    if (linkedOpportunity && syncedOpportunityStage) {
      await transaction.opportunity.update({
        where: { id: linkedOpportunity.id },
        data: {
          stage: syncedOpportunityStage.toStage,
          probabilityPercent: syncedOpportunityStage.probabilityPercent,
          weightedValue: syncedOpportunityStage.weightedValue,
          updatedById: context.userId
        }
      });
      await transaction.opportunityStageHistory.create({
        data: {
          opportunityId: linkedOpportunity.id,
          fromStage: syncedOpportunityStage.fromStage,
          toStage: syncedOpportunityStage.toStage,
          changedById: context.userId
        }
      });
    }
    await createPresalesActivity(transaction, requestedById, created.accountId, created.opportunityId, "Pre-Sales Request Created", `Pre-sales request ${created.requestNumber} created. Link: /presales/${created.id}`);
    await createExpectedPresalesDeliverables(transaction, {
      requestId: created.id,
      opportunityType: linkedOpportunity?.opportunityType,
      opportunityId: linkedOpportunity?.id,
      quoteId: resolved.quote?.id
    });
    return created;
  });

  await createAuditLog({ userId: context.userId, module: "presales", entityType: "PresalesRequest", entityId: request.id, action: "create", newValue: request as unknown as Prisma.InputJsonValue });
  if (linkedOpportunity && syncedOpportunityStage) {
    await createAuditLog({
      userId: context.userId,
      module: "crm",
      entityType: "Opportunity",
      entityId: linkedOpportunity.id,
      action: "change_stage",
      previousValue: { stage: syncedOpportunityStage.fromStage },
      newValue: {
        stage: syncedOpportunityStage.toStage,
        probabilityPercent: syncedOpportunityStage.probabilityPercent,
        weightedValue: syncedOpportunityStage.weightedValue
      }
    });
  }
  await notifyPresalesSubmitted(request.id);
  if (request.assignedToId) await notifyAssignedEngineer(request.id);
  return getPresalesRequest(context, request.id);
}

export async function createPresalesRequestFromOpportunityStage(context: CrmAccessContext, opportunityId: string) {
  assertPresalesPermission(context, "presales.create");
  const opportunity = await prisma.opportunity.findFirst({
    where: { AND: [opportunityVisibilityWhere(context), { id: opportunityId, stage: OpportunityStage.pre_sales_solution_design, deletedAt: null }] },
    include: { account: true, owner: true }
  });
  if (!opportunity) return null;
  const existing = await prisma.presalesRequest.findFirst({
    where: { opportunityId: opportunity.id, deletedAt: null, status: { notIn: completedStatuses } }
  });
  if (existing) return existing;

  const internalDeadline = opportunity.expectedCloseDate ?? addDays(new Date(), 7);
  return createPresalesRequest(
    context,
    {
      accountId: opportunity.accountId,
      opportunityId: opportunity.id,
      requestCategory: defaultCategoryForOpportunity(opportunity.opportunityType),
      requestType: defaultRequestTypeForOpportunity(opportunity.opportunityType),
      priority: PresalesPriority.normal,
      commercialPriority: PresalesCommercialPriority.normal,
      requestedDeliveryDate: opportunity.expectedCloseDate ?? undefined,
      internalDeadline,
      description: opportunity.notes || `${opportunity.opportunityName} requires pre-sales input. Opportunity value: ${formatMoney(Number(opportunity.value))}. Opportunity owner: ${opportunity.owner.displayName}.`
    },
    { requestedById: opportunity.ownerId, skipOpportunityStageSync: true }
  );
}

export function shouldAutoCreatePresalesForStageChange(previousStage: OpportunityStage, nextStage: OpportunityStage) {
  return previousStage !== nextStage && nextStage === OpportunityStage.pre_sales_solution_design;
}

export function shouldAutoCreatePresalesForCreatedStage(stage: OpportunityStage) {
  return stage === OpportunityStage.pre_sales_solution_design;
}

export function buildPresalesOpportunityStageSync(stage: OpportunityStage, value: number) {
  if (stage === OpportunityStage.pre_sales_solution_design) return null;
  return {
    fromStage: stage,
    toStage: OpportunityStage.pre_sales_solution_design,
    ...calculateStageFinancials(OpportunityStage.pre_sales_solution_design, value)
  };
}

export async function updatePresalesRequest(context: CrmAccessContext, id: string, input: PresalesRequestUpdateInput) {
  assertPresalesPermission(context, "presales.update");
  const previous = await getPresalesRequest(context, id);
  assertCanEditPresalesRequest(context, previous);
  assertRequestEditable(previous.status);
  if (!canAssignPresales(context) && ("assignedToId" in input || "commercialPriority" in input)) {
    throw new Error("Missing permission: presales.assign");
  }
  const nextDeadline = input.internalDeadline ?? previous.internalDeadline;
  const deadlineStatus = calculatePresalesDeadlineStatus(nextDeadline, previous.status);
  const updated = await prisma.presalesRequest.update({
    where: { id },
    data: {
      ...input,
      accountId: input.accountId ?? undefined,
      opportunityId: input.opportunityId,
      quoteId: input.quoteId,
      ...deadlineStatus,
      updatedById: context.userId
    }
  });
  await createAuditLog({ userId: context.userId, module: "presales", entityType: "PresalesRequest", entityId: id, action: "update", previousValue: previous as unknown as Prisma.InputJsonValue, newValue: updated as unknown as Prisma.InputJsonValue });
  return getPresalesRequest(context, id);
}

export async function assignPresalesRequest(context: CrmAccessContext, id: string, input: PresalesAssignInput) {
  assertPresalesPermission(context, "presales.assign");
  const previous = await getPresalesRequest(context, id);
  assertCanEditPresalesRequest(context, previous);
  assertRequestEditable(previous.status);
  const updated = await prisma.$transaction(async (transaction) => {
    const request = await transaction.presalesRequest.update({
      where: { id },
      data: { assignedToId: input.assignedToId, status: PresalesRequestStatus.assigned, updatedById: context.userId }
    });
    await createPresalesActivity(transaction, context.userId, request.accountId, request.opportunityId, "Pre-Sales Request Assigned", `Pre-sales request ${request.requestNumber} assigned. Link: /presales/${request.id}`);
    return request;
  });
  await createAuditLog({ userId: context.userId, module: "presales", entityType: "PresalesRequest", entityId: id, action: "assign", previousValue: previous as unknown as Prisma.InputJsonValue, newValue: updated as unknown as Prisma.InputJsonValue });
  await notifyAssignedEngineer(id);
  return getPresalesRequest(context, id);
}

export async function changePresalesStatus(context: CrmAccessContext, id: string, input: PresalesStatusChangeInput) {
  assertAnyPresalesPermission(context, ["presales.update", "presales.complete"]);
  const previous = await getPresalesRequest(context, id);
  assertCanEditPresalesRequest(context, previous);
  assertValidTransition(previous.status, input.status);
  const deadlineStatus = calculatePresalesDeadlineStatus(previous.internalDeadline, input.status);
  const updated = await prisma.$transaction(async (transaction) => {
    const request = await transaction.presalesRequest.update({
      where: { id },
      data: {
        status: input.status,
        ...deadlineStatus,
        actualHours: input.actualHours ?? previous.actualHours,
        completedAt: input.status === PresalesRequestStatus.complete ? new Date() : previous.completedAt,
        updatedById: context.userId
      }
    });
    await createPresalesActivity(transaction, context.userId, request.accountId, request.opportunityId, statusActivitySubject(input.status), `Pre-sales request ${request.requestNumber} moved to ${input.status}. Link: /presales/${request.id}`);
    return request;
  });
  await createAuditLog({ userId: context.userId, module: "presales", entityType: "PresalesRequest", entityId: id, action: input.status === PresalesRequestStatus.complete ? "complete" : "change_status", previousValue: previous as unknown as Prisma.InputJsonValue, newValue: updated as unknown as Prisma.InputJsonValue });
  if (input.status === PresalesRequestStatus.query_raised) await notifyOpportunityOwner(id, "Query raised", "A query has been raised on a pre-sales request.");
  if (input.status === PresalesRequestStatus.complete) await notifyPresalesComplete(id);
  return getPresalesRequest(context, id);
}

export async function createPresalesTask(context: CrmAccessContext, requestId: string, input: PresalesTaskCreateInput) {
  assertPresalesPermission(context, "presales.update");
  const request = await getPresalesRequest(context, requestId);
  assertCanEditPresalesRequest(context, request);
  assertRequestEditable(request.status);
  const task = await prisma.presalesTask.create({
    data: {
      presalesRequestId: requestId,
      title: input.title,
      description: input.description,
      assignedToId: input.assignedToId,
      dueDate: input.dueDate,
      createdById: context.userId,
      updatedById: context.userId
    }
  });
  await createAuditLog({ userId: context.userId, module: "presales", entityType: "PresalesTask", entityId: requestId, action: "task_create", newValue: task as unknown as Prisma.InputJsonValue });
  return task;
}

export async function updatePresalesTask(context: CrmAccessContext, taskId: string, input: PresalesTaskUpdateInput) {
  assertPresalesPermission(context, "presales.update");
  const previous = await prisma.presalesTask.findFirst({ where: { id: taskId, deletedAt: null }, include: { presalesRequest: true } });
  if (!previous) throw new Error("Pre-sales task not found");
  await getPresalesRequest(context, previous.presalesRequestId);
  assertCanEditPresalesRequest(context, previous.presalesRequest);
  assertRequestEditable(previous.presalesRequest.status);
  const task = await prisma.presalesTask.update({
    where: { id: taskId },
    data: {
      ...input,
      completedAt: input.status === PresalesTaskStatus.complete ? new Date() : undefined,
      updatedById: context.userId
    }
  });
  await createAuditLog({ userId: context.userId, module: "presales", entityType: "PresalesTask", entityId: previous.presalesRequestId, action: "task_update", previousValue: previous as unknown as Prisma.InputJsonValue, newValue: task as unknown as Prisma.InputJsonValue });
  return task;
}

export async function completePresalesTask(context: CrmAccessContext, taskId: string) {
  return updatePresalesTask(context, taskId, { status: PresalesTaskStatus.complete });
}

export async function linkPresalesDocument(context: CrmAccessContext, requestId: string, input: PresalesDocumentCreateInput) {
  assertPresalesPermission(context, "presales.update");
  await getPresalesRequest(context, requestId);
  const document = await prisma.document.create({
    data: {
      storageProvider: "sharepoint",
      fileName: input.fileName,
      fileType: input.fileType,
      sizeBytes: input.sizeBytes,
      entityType: "PresalesRequest",
      entityId: requestId,
      uploadedById: context.userId
    }
  });
  await createAuditLog({ userId: context.userId, module: "presales", entityType: "Document", entityId: requestId, action: "file_uploaded", newValue: document as unknown as Prisma.InputJsonValue });
  return document;
}

export async function listPresalesFiles(context: CrmAccessContext, requestId: string) {
  const request = await getPresalesRequest(context, requestId);
  return request.documents;
}

export async function uploadPresalesFiles(context: CrmAccessContext, requestId: string, files: PresalesUploadFile[]) {
  assertPresalesPermission(context, "presales.update");
  if (!files.length) throw new Error("No files were supplied");
  const request = await getPresalesRequest(context, requestId);
  const documents = [];

  for (const file of files) {
    const stored = await savePresalesUploadBuffer({
      requestNumber: request.requestNumber,
      fileName: file.fileName,
      buffer: file.buffer,
      year: request.internalDeadline.getFullYear()
    });
    const document = await prisma.document.create({
      data: {
        storageProvider: "other",
        externalId: stored.relativePath,
        fileName: stored.fileName,
        fileType: file.fileType,
        sizeBytes: file.buffer.byteLength,
        entityType: "PresalesRequest",
        entityId: requestId,
        uploadedById: context.userId
      }
    });
    await createAuditLog({
      userId: context.userId,
      module: "presales",
      entityType: "Document",
      entityId: requestId,
      action: "file_uploaded",
      newValue: {
        id: document.id,
        fileName: document.fileName,
        sizeBytes: document.sizeBytes,
        sharePointTargetPath: buildPresalesSharePointTargetPath({
          sharePointFolderUrl: request.sharePointFolderUrl,
          requestNumber: request.requestNumber,
          fileName: document.fileName
        })
      } as Prisma.InputJsonValue
    });
    documents.push(document);
  }

  return documents;
}

export async function uploadPresalesDeliverable(context: CrmAccessContext, requestId: string, input: PresalesDeliverableUploadInput) {
  assertPresalesPermission(context, "presales.update");
  if (!input.file) throw new Error("No file was supplied");
  const request = await getPresalesRequest(context, requestId);
  assertCanEditPresalesRequest(context, request);
  assertRequestEditable(request.status);
  const stored = await savePresalesUploadBuffer({
    requestNumber: request.requestNumber,
    fileName: input.file.fileName,
    buffer: input.file.buffer,
    year: request.internalDeadline.getFullYear()
  });

  const result = await prisma.$transaction(async (transaction) => {
    const document = await transaction.document.create({
      data: {
        storageProvider: "other",
        externalId: stored.relativePath,
        fileName: stored.fileName,
        fileType: input.file.fileType,
        sizeBytes: input.file.buffer.byteLength,
        entityType: "PresalesRequest",
        entityId: requestId,
        uploadedById: context.userId
      }
    });
    const deliverable = await transaction.presalesDeliverable.upsert({
      where: {
        presalesRequestId_title: {
          presalesRequestId: requestId,
          title: input.title
        }
      },
      create: {
        presalesRequestId: requestId,
        deliverableType: input.deliverableType,
        title: input.title,
        status: PresalesDeliverableStatus.complete,
        completedAt: new Date(),
        documentId: document.id,
        uploadedById: context.userId,
        uploadedAt: new Date()
      },
      update: {
        title: input.title,
        status: PresalesDeliverableStatus.complete,
        completedAt: new Date(),
        documentId: document.id,
        uploadedById: context.userId,
        uploadedAt: new Date()
      }
    });
    return { document, deliverable };
  });

  await createAuditLog({ userId: context.userId, module: "presales", entityType: "PresalesDeliverable", entityId: requestId, action: "deliverable_uploaded", newValue: result as unknown as Prisma.InputJsonValue });
  return result.deliverable;
}

export async function changePresalesDeliverableStatus(context: CrmAccessContext, deliverableId: string, status: PresalesDeliverableStatus) {
  assertPresalesPermission(context, "presales.update");
  const previous = await prisma.presalesDeliverable.findFirst({
    where: { id: deliverableId },
    include: { presalesRequest: { include: { opportunity: true } } }
  });
  if (!previous) throw new Error("Pre-sales deliverable not found");
  await getPresalesRequest(context, previous.presalesRequestId);
  assertCanEditPresalesRequest(context, previous.presalesRequest);
  assertRequestEditable(previous.presalesRequest.status);
  const updated = await prisma.presalesDeliverable.update({
    where: { id: deliverableId },
    data: {
      status,
      completedAt: status === PresalesDeliverableStatus.complete || status === PresalesDeliverableStatus.not_required ? new Date() : null
    }
  });
  await createAuditLog({
    userId: context.userId,
    module: "presales",
    entityType: "PresalesDeliverable",
    entityId: previous.presalesRequestId,
    action: "deliverable_status_change",
    previousValue: previous as unknown as Prisma.InputJsonValue,
    newValue: updated as unknown as Prisma.InputJsonValue
  });
  return updated;
}

export async function getPresalesFileDownload(context: CrmAccessContext, requestId: string, fileId: string) {
  await getPresalesRequest(context, requestId);
  const document = await prisma.document.findFirst({
    where: { id: fileId, entityType: "PresalesRequest", entityId: requestId, deletedAt: null }
  });
  if (!document || !document.externalId) throw new Error("File not found");
  const buffer = await readPresalesStoredFile(document.externalId);
  return {
    buffer,
    fileName: document.fileName,
    fileType: document.fileType ?? "application/octet-stream",
    sizeBytes: document.sizeBytes
  };
}

export async function addPresalesComment(context: CrmAccessContext, requestId: string, input: PresalesCommentCreateInput) {
  assertAnyPresalesPermission(context, ["presales.update", "presales.read_assigned", "presales.read_all"]);
  await getPresalesRequest(context, requestId);
  const comment = await prisma.comment.create({
    data: {
      entityType: "PresalesRequest",
      entityId: requestId,
      body: input.body,
      createdById: context.userId,
      updatedById: context.userId
    }
  });
  await createAuditLog({ userId: context.userId, module: "presales", entityType: "Comment", entityId: requestId, action: "comment_create", newValue: comment as unknown as Prisma.InputJsonValue });
  return comment;
}

export async function softDeletePresalesRequest(context: CrmAccessContext, id: string) {
  assertPresalesPermission(context, "presales.delete");
  const previous = await getPresalesRequest(context, id);
  const request = await prisma.presalesRequest.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: context.userId, updatedById: context.userId }
  });
  await createAuditLog({ userId: context.userId, module: "presales", entityType: "PresalesRequest", entityId: id, action: "soft_delete", previousValue: previous as unknown as Prisma.InputJsonValue, newValue: request as unknown as Prisma.InputJsonValue });
  return request;
}

export async function getPresalesDashboard(context: CrmAccessContext) {
  const requests = await listPresalesRequests(context);
  const now = new Date();
  const weekEnd = addDays(now, 7);
  return {
    assignedRequests: requests.filter((request) => !completedStatuses.includes(request.status) && request.assignedToId).length,
    unassignedRequests: requests.filter((request) => !completedStatuses.includes(request.status) && !request.assignedToId).length,
    openRequests: requests.filter((request) => !completedStatuses.includes(request.status)).length,
    dueThisWeek: requests.filter((request) => !completedStatuses.includes(request.status) && request.internalDeadline <= weekEnd).length,
    overdue: requests.filter((request) => request.slaStatus === "overdue").length,
    awaitingCustomer: requests.filter((request) => request.status === "waiting_customer").length,
    internalReview: requests.filter((request) => request.status === "internal_review").length,
    completedThisMonth: requests.filter((request) => request.status === "complete" && request.completedAt && isSameMonth(request.completedAt, now)).length,
    requestsByEngineer: groupRequestsByEngineer(requests),
    requests
  };
}

export async function getPresalesMyWork(context: CrmAccessContext) {
  assertAnyPresalesPermission(context, ["presales.read_assigned", "presales.read_all"]);
  const requests = await listPresalesRequests(context, { assignedToId: context.userId });
  const now = new Date();
  const weekEnd = addDays(now, 7);
  return {
    assignedToMe: requests.filter((request) => !completedStatuses.includes(request.status)).length,
    dueToday: requests.filter((request) => isSameDay(request.internalDeadline, now)).length,
    dueThisWeek: requests.filter((request) => request.internalDeadline <= weekEnd).length,
    overdue: requests.filter((request) => request.slaStatus === "overdue").length,
    requests
  };
}

export async function listPresalesEngineers() {
  return prisma.user.findMany({
    where: { isActive: true, deletedAt: null, role: { name: { in: ["Pre-Sales", "Pre-Sales Engineer", "Pre-Sales Manager", "Administrator", "System Administrator", "Director"] } } },
    orderBy: { displayName: "asc" }
  });
}

export async function getPresalesCreateOptions(context: CrmAccessContext) {
  assertPresalesPermission(context, "presales.create");
  const [accounts, opportunities, quotes, engineers] = await Promise.all([
    prisma.account.findMany({ where: accountVisibilityWhere(context), orderBy: { name: "asc" } }),
    prisma.opportunity.findMany({ where: opportunityVisibilityWhere(context), include: { account: true }, orderBy: { opportunityName: "asc" } }),
    prisma.quote.findMany({ where: quoteVisibilityWhere(context), include: { account: true, opportunity: true }, orderBy: { quoteNumber: "desc" } }),
    listPresalesEngineers()
  ]);
  return {
    accounts: accounts.map((account) => ({ id: account.id, name: account.name })),
    opportunities: opportunities.map((opportunity) => ({ id: opportunity.id, accountId: opportunity.accountId, name: opportunity.opportunityName, value: Number(opportunity.value) })),
    quotes: quotes.map((quote) => ({ id: quote.id, accountId: quote.accountId, opportunityId: quote.opportunityId, label: `${quote.quoteNumber} - ${quote.title}`, value: Number(quote.sellTotal), version: quote.currentVersionNumber })),
    engineers: engineers.map((engineer) => ({ id: engineer.id, name: engineer.displayName }))
  };
}

export async function refreshPresalesDeadlineStatuses(requestId?: string) {
  const requests = await prisma.presalesRequest.findMany({
    where: { deletedAt: null, ...(requestId ? { id: requestId } : {}), status: { notIn: completedStatuses } }
  });
  for (const request of requests) {
    const next = calculatePresalesDeadlineStatus(request.internalDeadline, request.status);
    if (next.slaStatus !== request.slaStatus || next.ragStatus !== request.ragStatus) {
      await prisma.presalesRequest.update({ where: { id: request.id }, data: next });
      if (next.slaStatus === "due_soon") await notifyPresalesDueSoon(request.id);
      if (next.slaStatus === "overdue") await notifyPresalesOverdue(request.id);
    }
  }
}

export type PresalesListFilters = {
  status?: PresalesRequestStatus;
  priority?: PresalesPriority;
  commercialPriority?: PresalesCommercialPriority;
  assignedToId?: string;
  salespersonId?: string;
  requestType?: PresalesRequestType;
  requestCategory?: PresalesRequestCategory;
  dueSoon?: boolean;
  overdue?: boolean;
};

export type PresalesUploadFile = {
  fileName: string;
  fileType?: string;
  buffer: Buffer;
};

export type PresalesDeliverableUploadInput = {
  deliverableType: PresalesDeliverableType;
  title: string;
  file: PresalesUploadFile;
};

type PresalesRequestCreateOptions = {
  requestedById?: string;
  skipOpportunityStageSync?: boolean;
};

async function resolveRequestLinks(context: CrmAccessContext, input: Pick<PresalesRequestCreateInput, "accountId" | "opportunityId" | "quoteId">) {
  const account = await prisma.account.findFirst({ where: { AND: [accountVisibilityWhere(context), { id: input.accountId }] } });
  if (!account) throw new Error("Account not found");
  const opportunity = input.opportunityId
    ? await prisma.opportunity.findFirst({ where: { AND: [opportunityVisibilityWhere(context), { id: input.opportunityId, accountId: account.id }] }, include: { owner: true } })
    : null;
  if (input.opportunityId && !opportunity) throw new Error("Opportunity not found");
  const quote = input.quoteId
    ? await prisma.quote.findFirst({ where: { AND: [quoteVisibilityWhere(context), { id: input.quoteId, accountId: account.id }] }, include: { opportunity: true } })
    : null;
  if (input.quoteId && !quote) throw new Error("Quote not found");
  if (quote?.opportunityId && opportunity && quote.opportunityId !== opportunity.id) throw new Error("Quote must belong to the selected opportunity");
  return { account, opportunity, quote };
}

async function createExpectedPresalesDeliverables(transaction: Prisma.TransactionClient, input: { requestId: string; opportunityType?: OpportunityType | null; opportunityId?: string | null; quoteId?: string | null }) {
  const templates = getExpectedPresalesDeliverables(input.opportunityType);
  if (!templates.length) return;
  const existingDeliverables = await transaction.presalesDeliverable.findMany({
    where: {
      presalesRequestId: input.requestId,
      title: { in: templates.map((template) => template.title) }
    },
    select: { title: true }
  });
  for (const template of filterNewPresalesDeliverableTemplates(templates, existingDeliverables.map((deliverable) => deliverable.title))) {
    await transaction.presalesDeliverable.upsert({
      where: {
        presalesRequestId_title: {
          presalesRequestId: input.requestId,
          title: template.title
        }
      },
      create: {
        presalesRequestId: input.requestId,
        deliverableType: template.deliverableType,
        title: template.title,
        description: template.isBomDeliverable ? buildBomDeliverableDescription({ quoteId: input.quoteId, opportunityId: input.opportunityId }) : template.description
      },
      update: {}
    });
  }
}

async function nextPresalesRequestNumber(transaction: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const prefix = `PS-${year}-`;
  const latest = await transaction.presalesRequest.findFirst({
    where: { requestNumber: { startsWith: prefix } },
    orderBy: { requestNumber: "desc" }
  });
  const nextNumber = latest ? Number(latest.requestNumber.replace(prefix, "")) + 1 : 1;
  return formatPresalesRequestNumber(year, nextNumber);
}

export function formatPresalesRequestNumber(year: number, sequence: number) {
  return `PS-${year}-${String(sequence).padStart(4, "0")}`;
}

function assertRequestEditable(status: PresalesRequestStatus) {
  if (status === PresalesRequestStatus.complete) throw new Error("Completed pre-sales requests are read-only except comments and documents.");
}

function assertValidTransition(from: PresalesRequestStatus, to: PresalesRequestStatus) {
  if (from === to) return;
  const allowed: Record<PresalesRequestStatus, PresalesRequestStatus[]> = {
    submitted: [PresalesRequestStatus.triage, PresalesRequestStatus.assigned, PresalesRequestStatus.cancelled],
    triage: [PresalesRequestStatus.assigned, PresalesRequestStatus.cancelled],
    assigned: [PresalesRequestStatus.in_progress, PresalesRequestStatus.query_raised, PresalesRequestStatus.waiting_customer, PresalesRequestStatus.internal_review, PresalesRequestStatus.complete, PresalesRequestStatus.cancelled],
    in_progress: [PresalesRequestStatus.query_raised, PresalesRequestStatus.waiting_customer, PresalesRequestStatus.internal_review, PresalesRequestStatus.complete, PresalesRequestStatus.cancelled],
    query_raised: [PresalesRequestStatus.in_progress, PresalesRequestStatus.waiting_customer, PresalesRequestStatus.cancelled],
    waiting_customer: [PresalesRequestStatus.in_progress, PresalesRequestStatus.internal_review, PresalesRequestStatus.cancelled],
    internal_review: [PresalesRequestStatus.in_progress, PresalesRequestStatus.complete, PresalesRequestStatus.cancelled],
    complete: [],
    cancelled: []
  };
  if (!allowed[from].includes(to)) throw new Error(`Invalid pre-sales status transition from ${from} to ${to}`);
}

async function createPresalesActivity(transaction: Prisma.TransactionClient, userId: string, accountId: string, opportunityId: string | null, subject: string, description: string) {
  return transaction.salesActivity.create({
    data: {
      accountId,
      opportunityId,
      ownerId: userId,
      activityType: "note",
      subject,
      description,
      completedAt: new Date(),
      outcome: subject,
      createdById: userId,
      updatedById: userId
    }
  });
}

async function notifyPresalesSubmitted(requestId: string) {
  const request = await prisma.presalesRequest.findUniqueOrThrow({ where: { id: requestId }, include: { account: true, opportunity: true } });
  await notifyRoleUsers(["Pre-Sales Manager"], {
    title: `Pre-sales request ${request.requestNumber} submitted`,
    body: `${request.account.name}${request.opportunity ? ` - ${request.opportunity.opportunityName}` : ""}`,
    metadata: { module: "presales", requestId, href: `/presales/${requestId}`, status: "submitted" }
  });
}

async function notifyAssignedEngineer(requestId: string) {
  const request = await prisma.presalesRequest.findUniqueOrThrow({ where: { id: requestId }, include: { account: true } });
  if (!request.assignedToId) return;
  await createNotification({
    userId: request.assignedToId,
    title: `Assigned ${request.requestNumber}`,
    body: `${request.account.name} pre-sales request is assigned to you.`,
    metadata: { module: "presales", requestId, href: `/presales/${requestId}`, status: "assigned" }
  });
}

async function notifyOpportunityOwner(requestId: string, title: string, body: string) {
  const request = await prisma.presalesRequest.findUniqueOrThrow({ where: { id: requestId }, include: { opportunity: true } });
  if (!request.opportunity?.ownerId) return;
  await createNotification({ userId: request.opportunity.ownerId, title: `${title}: ${request.requestNumber}`, body, metadata: { module: "presales", requestId, href: `/presales/${requestId}` } });
}

async function notifyPresalesDueSoon(requestId: string) {
  const request = await prisma.presalesRequest.findUniqueOrThrow({ where: { id: requestId }, include: { account: true } });
  const recipients = await recipientIds(["Pre-Sales Manager"], request.assignedToId ? [request.assignedToId] : []);
  await notifyUsers(recipients, `Pre-sales request ${request.requestNumber} due soon`, `${request.account.name} is due within 48 hours.`, requestId);
}

async function notifyPresalesOverdue(requestId: string) {
  const request = await prisma.presalesRequest.findUniqueOrThrow({ where: { id: requestId }, include: { account: true } });
  const recipients = await recipientIds(["Pre-Sales Manager", "Director"], request.assignedToId ? [request.assignedToId] : []);
  await notifyUsers(recipients, `Pre-sales request ${request.requestNumber} overdue`, `${request.account.name} is overdue.`, requestId);
}

async function notifyPresalesComplete(requestId: string) {
  const request = await prisma.presalesRequest.findUniqueOrThrow({ where: { id: requestId }, include: { account: true, opportunity: true } });
  const directRecipients = [request.requestedById, request.opportunity?.ownerId].filter(Boolean) as string[];
  const recipients = await recipientIds(["Sales Manager"], directRecipients);
  await notifyUsers(recipients, `Pre-sales request ${request.requestNumber} complete`, `${request.account.name} pre-sales request is complete.`, requestId);
}

async function notifyRoleUsers(roleNames: string[], notification: { title: string; body: string; metadata: Prisma.InputJsonValue }) {
  const recipients = await recipientIds(roleNames);
  await Promise.all(recipients.map((userId) => createNotification({ userId, ...notification })));
}

async function notifyUsers(userIds: string[], title: string, body: string, requestId: string) {
  await Promise.all(userIds.map((userId) => createNotification({ userId, title, body, metadata: { module: "presales", requestId, href: `/presales/${requestId}` } })));
}

async function recipientIds(roleNames: string[], directUserIds: string[] = []) {
  const roleUsers = await prisma.user.findMany({ where: { isActive: true, deletedAt: null, role: { name: { in: roleNames } } }, select: { id: true } });
  return [...new Set([...directUserIds, ...roleUsers.map((user) => user.id)])];
}

function statusActivitySubject(status: PresalesRequestStatus) {
  if (status === PresalesRequestStatus.complete) return "Pre-Sales Request Completed";
  return "Pre-Sales Request Status Changed";
}

function defaultCategoryForOpportunity(opportunityType: string): PresalesRequestCategory {
  if (opportunityType.includes("wifi")) return PresalesRequestCategory.wi_fi;
  if (opportunityType.includes("iptv")) return PresalesRequestCategory.iptv;
  if (opportunityType.includes("structured_cabling")) return PresalesRequestCategory.structured_cabling;
  if (opportunityType.includes("digital_signage")) return PresalesRequestCategory.digital_signage;
  if (opportunityType.includes("cctv")) return PresalesRequestCategory.security;
  if (opportunityType.includes("elv")) return PresalesRequestCategory.elv;
  return PresalesRequestCategory.multi_discipline;
}

function defaultRequestTypeForOpportunity(opportunityType: string): PresalesRequestType {
  if (opportunityType.includes("wifi")) return PresalesRequestType.wifi_design;
  if (opportunityType.includes("iptv")) return PresalesRequestType.iptv_design;
  if (opportunityType.includes("structured_cabling")) return PresalesRequestType.structured_cabling;
  if (opportunityType.includes("consultancy")) return PresalesRequestType.consultancy;
  return PresalesRequestType.design_review;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function groupRequestsByEngineer(requests: Awaited<ReturnType<typeof listPresalesRequests>>) {
  const grouped = new Map<string, { engineerId: string; engineer: string; open: number; total: number }>();
  for (const request of requests) {
    const key = request.assignedToId ?? "unassigned";
    const current = grouped.get(key) ?? { engineerId: key, engineer: request.assignedTo?.displayName ?? "Unassigned", open: 0, total: 0 };
    current.total += 1;
    if (!completedStatuses.includes(request.status)) current.open += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((left, right) => right.open - left.open || left.engineer.localeCompare(right.engineer));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}

function safeSharePointTargetPath(sharePointFolderUrl: string | null, requestNumber: string, fileName: string) {
  try {
    return buildPresalesSharePointTargetPath({ sharePointFolderUrl, requestNumber, fileName });
  } catch {
    return sharePointFolderUrl ? `${sharePointFolderUrl.replace(/\/+$/, "")}/${fileName}` : fileName;
  }
}
