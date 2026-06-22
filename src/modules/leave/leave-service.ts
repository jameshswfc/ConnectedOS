import { LeaveStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { assertAnyModulePermission, assertModulePermission, isAdminContext } from "@/modules/operations/module-permissions";
import { calculateWorkingDays } from "@/modules/projects/project-working-calendar";
import type { LeaveRequestCreateInput } from "@/modules/leave/leave-schemas";
import { createAuditLog } from "@/services/audit/audit-service";
import { sendTemplatedEmail, sendTemplatedEmailToUserIds } from "@/services/email/email-service";
import { createNotification } from "@/services/notifications/notification-service";

export async function listLeaveRequests(context: CrmAccessContext) {
  assertAnyModulePermission(context, ["leave.request", "leave.approve", "leave.view_team"]);
  return prisma.leaveRequest.findMany({
    where: leaveVisibilityWhere(context),
    include: { user: true, approver: true },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }]
  });
}

export async function getLeaveRequest(context: CrmAccessContext, id: string) {
  assertAnyModulePermission(context, ["leave.request", "leave.approve", "leave.view_team"]);
  const request = await prisma.leaveRequest.findFirst({
    where: { AND: [leaveVisibilityWhere(context), { id }] },
    include: { user: true, approver: true }
  });
  if (!request) throw new Error("Leave request not found");
  return request;
}

export async function createLeaveRequest(context: CrmAccessContext, input: LeaveRequestCreateInput) {
  assertModulePermission(context, "leave.request");
  const userId = isAdminContext(context) || context.permissions.includes("leave.approve") ? input.userId ?? context.userId : context.userId;
  const workingDays = calculateWorkingDays(input.startDate, input.endDate);
  const request = await prisma.leaveRequest.create({
    data: {
      userId,
      startDate: input.startDate,
      endDate: input.endDate,
      workingDays,
      leaveType: input.leaveType,
      reason: input.reason,
      status: input.status
    },
    include: { user: true, approver: true }
  });
  await createAuditLog({ userId: context.userId, module: "leave", entityType: "LeaveRequest", entityId: request.id, action: "create", newValue: request as unknown as Prisma.InputJsonValue });
  return request;
}

export async function submitLeaveRequest(context: CrmAccessContext, id: string) {
  const previous = await getLeaveRequest(context, id);
  if (!isAdminContext(context) && previous.userId !== context.userId) {
    throw new Error("Missing permission: leave.request");
  }
  const approvers = await resolveLeaveApprovers(previous.userId);
  const approverId = approvers[0]?.id ?? null;
  const request = await prisma.leaveRequest.update({
    where: { id },
    data: { status: LeaveStatus.submitted, approverId },
    include: { user: true, approver: true }
  });
  await createAuditLog({ userId: context.userId, module: "leave", entityType: "LeaveRequest", entityId: request.id, action: "submit", previousValue: previous as unknown as Prisma.InputJsonValue, newValue: request as unknown as Prisma.InputJsonValue });
  await runLeaveSideEffects([
    ...approvers.map((approver) => createNotification({
      userId: approver.id,
      title: "Leave request submitted",
      body: `${request.user.displayName} submitted ${request.leaveType.replaceAll("_", " ")} from ${request.startDate.toISOString().slice(0, 10)} to ${request.endDate.toISOString().slice(0, 10)}.`,
      metadata: { href: "/leave/approvals" }
    })),
    sendTemplatedEmailToUserIds(approvers.map((approver) => approver.id), () => ({
      title: "Leave request submitted",
      summary: `${request.user.displayName} submitted a leave request for review.`,
      details: [
        { label: "Employee", value: request.user.displayName },
        { label: "Leave type", value: request.leaveType.replaceAll("_", " ") },
        { label: "Dates", value: `${request.startDate.toISOString().slice(0, 10)} to ${request.endDate.toISOString().slice(0, 10)}` },
        { label: "Working days", value: request.workingDays.toString() }
      ],
      actionLabel: "Open leave approvals",
      actionHref: "/leave/approvals"
    }))
  ]);
  return request;
}

export async function approveLeaveRequest(context: CrmAccessContext, id: string) {
  assertModulePermission(context, "leave.approve");
  const previous = await getLeaveRequest(context, id);
  const request = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: LeaveStatus.approved,
      approverId: context.userId,
      approvedAt: new Date(),
      rejectedAt: null,
      rejectionReason: null
    },
    include: { user: true, approver: true }
  });
  await createAuditLog({ userId: context.userId, module: "leave", entityType: "LeaveRequest", entityId: request.id, action: "approve", previousValue: previous as unknown as Prisma.InputJsonValue, newValue: request as unknown as Prisma.InputJsonValue });
  await runLeaveSideEffects([
    createNotification({
      userId: request.userId,
      title: "Leave approved",
      body: `${request.leaveType.replaceAll("_", " ")} from ${request.startDate.toISOString().slice(0, 10)} to ${request.endDate.toISOString().slice(0, 10)} was approved.`,
      metadata: { href: `/leave` }
    }),
    request.user.email ? sendTemplatedEmail({
      to: request.user.email,
      title: "Leave approved",
      summary: `${request.leaveType.replaceAll("_", " ")} was approved.`,
      details: [
        { label: "Employee", value: request.user.displayName },
        { label: "Dates", value: `${request.startDate.toISOString().slice(0, 10)} to ${request.endDate.toISOString().slice(0, 10)}` },
        { label: "Status", value: "Approved" }
      ],
      actionLabel: "View leave request",
      actionHref: "/leave"
    }) : null
  ]);
  return request;
}

export async function rejectLeaveRequest(context: CrmAccessContext, id: string, rejectionReason?: string | null) {
  assertModulePermission(context, "leave.approve");
  const trimmedReason = rejectionReason?.trim();
  if (!trimmedReason) {
    throw new Error("Unable to reject leave request. Please add a rejection reason and try again.");
  }
  const previous = await getLeaveRequest(context, id);
  const request = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: LeaveStatus.rejected,
      approverId: context.userId,
      rejectedAt: new Date(),
      rejectionReason: trimmedReason
    },
    include: { user: true, approver: true }
  });
  await createAuditLog({ userId: context.userId, module: "leave", entityType: "LeaveRequest", entityId: request.id, action: "reject", previousValue: previous as unknown as Prisma.InputJsonValue, newValue: request as unknown as Prisma.InputJsonValue });
  await runLeaveSideEffects([
    createNotification({
      userId: request.userId,
      title: "Leave rejected",
      body: `${request.leaveType.replaceAll("_", " ")} request was rejected.${request.rejectionReason ? ` ${request.rejectionReason}` : ""}`,
      metadata: { href: `/leave` }
    }),
    request.user.email ? sendTemplatedEmail({
      to: request.user.email,
      title: "Leave rejected",
      summary: `${request.leaveType.replaceAll("_", " ")} was rejected.`,
      details: [
        { label: "Employee", value: request.user.displayName },
        { label: "Dates", value: `${request.startDate.toISOString().slice(0, 10)} to ${request.endDate.toISOString().slice(0, 10)}` },
        { label: "Reason", value: request.rejectionReason ?? "No reason supplied" }
      ],
      actionLabel: "View leave request",
      actionHref: "/leave"
    }) : null
  ]);
  return request;
}

function leaveVisibilityWhere(context: CrmAccessContext): Prisma.LeaveRequestWhereInput {
  if (isAdminContext(context) || context.permissions.includes("leave.approve") || context.permissions.includes("leave.view_team")) {
    return { deletedAt: null };
  }
  return { deletedAt: null, userId: context.userId };
}

async function resolveLeaveApprovers(requestUserId: string) {
  const preferredCandidates = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      deactivatedAt: null,
      OR: [
        { displayName: { equals: "James Harrison", mode: "insensitive" } },
        { email: { equals: "james@connectedhsp.com", mode: "insensitive" } },
        { email: { equals: "me@jrharrison.com", mode: "insensitive" } }
      ]
    },
    select: { id: true, displayName: true, email: true }
  });
  const preferred = uniqueLeaveUsers(preferredCandidates).filter((user) => user.id !== requestUserId);
  if (preferred.length) return preferred;

  const administrators = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      deactivatedAt: null,
      OR: [
        { permissionLevel: "administrator" },
        { role: { name: "Administrator" } }
      ]
    },
    select: { id: true, displayName: true, email: true }
  });
  const admins = uniqueLeaveUsers(administrators).filter((user) => user.id !== requestUserId);
  if (admins.length) return admins;

  const businessOperations = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      deactivatedAt: null,
      role: { name: "Business Operations" }
    },
    select: { id: true, displayName: true, email: true }
  });
  return uniqueLeaveUsers(businessOperations).filter((user) => user.id !== requestUserId);
}

function uniqueLeaveUsers<TUser extends { id: string }>(users: TUser[]) {
  const seen = new Set<string>();
  return users.filter((user) => {
    if (seen.has(user.id)) return false;
    seen.add(user.id);
    return true;
  });
}

async function runLeaveSideEffects(effects: Array<Promise<unknown> | null>) {
  const results = await Promise.allSettled(effects.filter(Boolean));
  for (const result of results) {
    if (result.status === "rejected") {
      console.warn("[leave] side effect failed", {
        message: result.reason instanceof Error ? result.reason.message : String(result.reason)
      });
    }
  }
}
