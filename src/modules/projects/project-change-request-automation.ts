import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit/audit-service";
import { sendTemplatedEmailToUserIds } from "@/services/email/email-service";
import { createNotification } from "@/services/notifications/notification-service";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { calculateLabResourceDays } from "@/modules/projects/project-default-tasks";

export async function createProjectChangeRequestFromQuoteChange(context: CrmAccessContext, quoteId: string, previousSellTotal: number) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      versions: {
        include: { lines: { where: { deletedAt: null }, include: { product: true } } },
        orderBy: { versionNumber: "desc" }
      },
      projects: { where: { deletedAt: null }, include: { projectManager: true } }
    }
  });
  if (!quote || !quote.projects.length) return [];
  const currentVersion = quote.versions.find((version) => version.versionNumber === quote.currentVersionNumber) ?? quote.versions[0] ?? null;
  const newSellTotal = Number(quote.sellTotal);
  if (newSellTotal === previousSellTotal) return [];
  const results = [];
  for (const project of quote.projects) {
    const title = `Quote ${quote.quoteNumber} changed after project creation`;
    const resourceDayImpact = currentVersion ? Math.max(0, calculateLabResourceDays(currentVersion.lines) - Number(project.totalResourceDaysBudget)) : 0;
    const hardwareItems = currentVersion?.lines
      .filter((line) => line.deletedAt == null && line.lineType === "product" && !(line.product?.sku ?? "").toUpperCase().startsWith("LAB"))
      .map((line) => ({
        sku: line.product?.sku ?? null,
        manufacturer: line.product?.manufacturer ?? null,
        supplier: line.product?.supplier ?? null,
        description: line.description,
        quantity: Number(line.quantity),
        unitCost: Number(line.unitCost),
        unitSell: Number(line.unitSell)
      })) ?? [];
    const existing = await prisma.projectForm.findFirst({
      where: { projectId: project.id, formType: "change_request", title, deletedAt: null }
    });
    if (existing) continue;
    const form = await prisma.projectForm.create({
      data: {
        projectId: project.id,
        formType: "change_request",
        title,
        preparedById: context.userId,
        content: {
          quoteNumber: quote.quoteNumber,
          projectNumber: project.projectNumber,
          oldTotal: previousSellTotal,
          newTotal: newSellTotal,
          difference: newSellTotal - previousSellTotal,
          resourceDayImpact,
          hardwareItems,
          quoteVersionId: currentVersion?.id ?? null,
          quoteVersionNumber: currentVersion?.versionNumber ?? null,
          reason: "Quote changed after project creation",
          status: "pending_review"
        } as Prisma.InputJsonObject
      }
    });
    await createAuditLog({ userId: context.userId, module: "projects", entityType: "ProjectForm", entityId: project.id, action: "quote_change_request_created", newValue: form as unknown as Prisma.InputJsonValue });
    await notifyChangeRequestCreated(project.id, project.projectNumber, quote.quoteNumber, project.projectManagerId);
    results.push(form);
  }
  return results;
}

async function notifyChangeRequestCreated(projectId: string, projectNumber: string, quoteNumber: string, projectManagerId?: string | null) {
  const title = "Project Change Request Created";
  const body = `Quote ${quoteNumber} was changed after project ${projectNumber} was created. Review the project change request.`;
  const link = `/projects/${projectId}#change-requests`;
  if (projectManagerId) {
    await createNotification({
      userId: projectManagerId,
      title,
      body,
      metadata: { module: "projects", link }
    });
  }
  const roleNames = projectManagerId ? ["Business Operations"] : ["Business Operations", "Administrator"];
  const users = await prisma.user.findMany({ where: { isActive: true, deletedAt: null, role: { name: { in: roleNames } } } });
  await Promise.all(users.map((user) => createNotification({
    userId: user.id,
    title,
    body,
    metadata: { module: "projects", link }
  })));
  await sendTemplatedEmailToUserIds([
    ...(projectManagerId ? [projectManagerId] : []),
    ...users.map((user) => user.id)
  ], () => ({
    title,
    summary: body,
    actionLabel: "Open project",
    actionHref: link
  }));
}
