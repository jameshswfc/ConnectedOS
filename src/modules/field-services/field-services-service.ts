import { BookingConflictStatus, LeaveStatus, ResourceBookingStatus, ResourceBookingType, ResourceType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { assertAnyModulePermission, assertModulePermission, isAdminContext } from "@/modules/operations/module-permissions";
import { projectVisibilityWhere } from "@/modules/projects/project-permissions";
import { calculateWorkingDays } from "@/modules/projects/project-working-calendar";
import type { ResourceBookingCreateInput, ResourceBookingUpdateInput, ResourceCreateInput, ResourceUpdateInput } from "@/modules/field-services/field-services-schemas";
import { createAuditLog } from "@/services/audit/audit-service";
import { createNotification } from "@/services/notifications/notification-service";
import { listActiveUsersByRole } from "@/services/users/user-service";

const resourceInclude = {
  user: true
} satisfies Prisma.ResourceInclude;

const bookingInclude = {
  resource: { include: { user: true } },
  project: { include: { account: true } },
  account: true,
  opportunity: true,
  helpdeskTicket: true
} satisfies Prisma.ResourceBookingInclude;

export type FieldServicesCalendarView = "month" | "week" | "day" | "resource";

export type FieldServicesCalendarEntry = {
  id: string;
  href: string;
  source: "booking" | "project_assignment" | "leave";
  category: "project" | "non_project" | "leave_approved" | "leave_pending" | "conflict";
  title: string;
  subtitle: string;
  resourceId: string;
  resourceName: string;
  startDate: Date;
  endDate: Date;
  location: string | null;
  status: string;
  projectNumber?: string | null;
  customerName?: string | null;
  bookingStatus?: string | null;
  conflictStatus?: string | null;
};

export type FieldServicesCalendarResource = {
  id: string;
  label: string;
  subtitle?: string | null;
  active: boolean;
};

export async function listResources(context: CrmAccessContext, options: { includeInactive?: boolean } = {}) {
  assertAnyModulePermission(context, ["field_services.read_all", "field_services.read_own", "field_services.manage_resources"]);
  await syncActiveUsersToResources();
  return prisma.resource.findMany({
    where: {
      AND: [
        resourceVisibilityWhere(context),
        options.includeInactive ? {} : { active: true }
      ]
    },
    include: resourceInclude,
    orderBy: [{ active: "desc" }, { displayName: "asc" }]
  });
}

export async function getResource(context: CrmAccessContext, id: string) {
  assertAnyModulePermission(context, ["field_services.read_all", "field_services.read_own", "field_services.manage_resources"]);
  await syncActiveUsersToResources();
  const resource = await prisma.resource.findFirst({
    where: { AND: [resourceVisibilityWhere(context), { id }] },
    include: { ...resourceInclude, bookings: { where: { deletedAt: null }, include: bookingInclude, orderBy: [{ startDate: "asc" }] } }
  });
  if (!resource) throw new Error("Resource not found");
  return resource;
}

export async function createResource(context: CrmAccessContext, input: ResourceCreateInput) {
  assertModulePermission(context, "field_services.manage_resources");
  const resource = await prisma.resource.create({ data: input, include: resourceInclude });
  await createAuditLog({ userId: context.userId, module: "field_services", entityType: "Resource", entityId: resource.id, action: "create", newValue: resource as unknown as Prisma.InputJsonValue });
  return resource;
}

export async function updateResource(context: CrmAccessContext, id: string, input: ResourceUpdateInput) {
  assertModulePermission(context, "field_services.manage_resources");
  const previous = await getResource(context, id);
  const resource = await prisma.resource.update({ where: { id }, data: input, include: resourceInclude });
  await createAuditLog({ userId: context.userId, module: "field_services", entityType: "Resource", entityId: resource.id, action: "update", previousValue: previous as unknown as Prisma.InputJsonValue, newValue: resource as unknown as Prisma.InputJsonValue });
  return resource;
}

export async function removeResource(context: CrmAccessContext, id: string) {
  assertModulePermission(context, "field_services.manage_resources");
  const previous = await getResource(context, id);
  const today = startOfDay(new Date());
  const futureBookings = await prisma.resourceBooking.findMany({
    where: {
      resourceId: id,
      deletedAt: null,
      status: { not: ResourceBookingStatus.cancelled },
      startDate: { gte: today }
    },
    include: { project: true }
  });
  const futureProjectAssignments = await prisma.projectResourceAssignment.findMany({
    where: {
      deletedAt: null,
      startDate: { gte: today },
      OR: [
        { resourceId: id },
        ...(previous.userId ? [{ userId: previous.userId }] : [])
      ]
    },
    include: { project: true, resource: true, user: true }
  });
  const resource = await prisma.resource.update({
    where: { id },
    data: { active: false },
    include: resourceInclude
  });
  if (futureBookings.length) {
    await prisma.resourceBooking.updateMany({
      where: { id: { in: futureBookings.map((booking) => booking.id) } },
      data: {
        status: ResourceBookingStatus.cancelled,
        conflictStatus: BookingConflictStatus.clear
      }
    });
    await Promise.all(futureBookings.map(async (booking) => {
      await createAuditLog({
        userId: context.userId,
        module: "field_services",
        entityType: "ResourceBooking",
        entityId: booking.id,
        action: "cancelled_by_resource_deactivation",
        previousValue: booking as unknown as Prisma.InputJsonValue,
        newValue: {
          id: booking.id,
          status: ResourceBookingStatus.cancelled,
          resourceId: booking.resourceId
        } as unknown as Prisma.InputJsonValue
      });
      if (booking.project?.projectManagerId) {
        await createNotification({
          userId: booking.project.projectManagerId,
          title: "Resource booking cancelled",
          body: `${previous.displayName} was deactivated and the booking "${booking.title}" was cancelled.`,
          metadata: { module: "field_services", href: `/projects/${booking.projectId}#resources` }
        });
      }
    }));
  }
  if (futureProjectAssignments.length) {
    const deactivatedAt = new Date();
    await prisma.projectResourceAssignment.updateMany({
      where: { id: { in: futureProjectAssignments.map((assignment) => assignment.id) } },
      data: { deletedAt: deactivatedAt }
    });
    await Promise.all(futureProjectAssignments.map(async (assignment) => {
      await createAuditLog({
        userId: context.userId,
        module: "field_services",
        entityType: "ProjectResourceAssignment",
        entityId: assignment.id,
        action: "removed_by_resource_deactivation",
        previousValue: assignment as unknown as Prisma.InputJsonValue,
        newValue: {
          id: assignment.id,
          resourceId: assignment.resourceId,
          userId: assignment.userId,
          deletedAt: deactivatedAt
        } as unknown as Prisma.InputJsonValue
      });
      if (assignment.project.projectManagerId) {
        await createNotification({
          userId: assignment.project.projectManagerId,
          title: "Project resource assignment removed",
          body: `${previous.displayName} was deactivated and the future assignment on ${assignment.project.projectNumber} was removed from the live schedule.`,
          metadata: { module: "projects", href: `/projects/${assignment.projectId}#resources` }
        });
      }
    }));
  }
  await createAuditLog({
    userId: context.userId,
    module: "field_services",
    entityType: "Resource",
    entityId: id,
    action: "deactivate",
    previousValue: previous as unknown as Prisma.InputJsonValue,
    newValue: {
      ...resource,
      cancelledFutureBookingIds: futureBookings.map((booking) => booking.id),
      removedFutureProjectAssignmentIds: futureProjectAssignments.map((assignment) => assignment.id)
    } as unknown as Prisma.InputJsonValue
  });
  const updates: string[] = [];
  if (futureBookings.length) updates.push(`${futureBookings.length} future booking(s) cancelled`);
  if (futureProjectAssignments.length) updates.push(`${futureProjectAssignments.length} future project assignment(s) removed`);
  return {
    resource,
    action: "deactivated" as const,
    message: updates.length
      ? `Resource deactivated. ${updates.join(" and ")}.`
      : "Resource deactivated."
  };
}

export async function listResourceBookings(context: CrmAccessContext, filters: { resourceId?: string; bookingType?: ResourceBookingType | string; status?: string; startDate?: Date; endDate?: Date } = {}) {
  assertAnyModulePermission(context, ["field_services.read_all", "field_services.read_own", "field_services.manage_bookings", "schedule.read_all", "schedule.read_own"]);
  await syncActiveUsersToResources();
  return prisma.resourceBooking.findMany({
    where: {
      AND: [
        bookingVisibilityWhere(context),
        filters.resourceId ? { resourceId: filters.resourceId } : {},
        filters.bookingType ? { bookingType: filters.bookingType as ResourceBookingType } : {},
        filters.status ? { status: filters.status as ResourceBookingStatus } : {},
        filters.startDate ? { endDate: { gte: filters.startDate } } : {},
        filters.endDate ? { startDate: { lte: filters.endDate } } : {}
      ]
    },
    include: bookingInclude,
    orderBy: [{ startDate: "asc" }, { title: "asc" }]
  });
}

export async function getResourceBooking(context: CrmAccessContext, id: string) {
  assertAnyModulePermission(context, ["field_services.read_all", "field_services.read_own", "field_services.manage_bookings", "schedule.read_all", "schedule.read_own"]);
  const booking = await prisma.resourceBooking.findFirst({
    where: { AND: [bookingVisibilityWhere(context), { id }] },
    include: bookingInclude
  });
  if (!booking) throw new Error("Resource booking not found");
  return booking;
}

export async function createResourceBooking(context: CrmAccessContext, input: ResourceBookingCreateInput) {
  assertAnyModulePermission(context, ["field_services.manage_bookings", "schedule.create_booking"]);
  logResourceBookingAction("attempt", {
    action: "create",
    userId: context.userId,
    resourceId: input.resourceId,
    helpdeskTicketId: input.helpdeskTicketId ?? null,
    accountId: input.accountId ?? null,
    projectId: input.projectId ?? null,
    startDate: input.startDate.toISOString(),
    endDate: input.endDate.toISOString()
  });
  try {
    const linkedTicket = input.helpdeskTicketId
      ? await prisma.helpdeskTicket.findFirst({
        where: { id: input.helpdeskTicketId, deletedAt: null },
        include: {
          account: true,
          contact: true,
          asset: true,
          project: true
        }
      })
      : null;
    if (input.helpdeskTicketId && !linkedTicket) {
      throw new Error("Unable to create resource booking. The linked helpdesk ticket could not be found.");
    }
    if (linkedTicket && !input.accountId && !linkedTicket.accountId && !input.projectId && !linkedTicket.projectId) {
      throw new Error("Unable to create resource booking. Please link the ticket to an account or project before scheduling field work.");
    }
    if (linkedTicket?.accountId && input.accountId && linkedTicket.accountId !== input.accountId) {
      throw new Error("Unable to create resource booking. The selected account does not match the linked helpdesk ticket.");
    }
    if (linkedTicket?.projectId && input.projectId && linkedTicket.projectId !== input.projectId) {
      throw new Error("Unable to create resource booking. The selected project does not match the linked helpdesk ticket.");
    }
    const resource = await prisma.resource.findFirst({ where: { id: input.resourceId, deletedAt: null }, include: { user: true } });
    if (!resource) throw new Error("Resource not found");
    if (!resource.active || (resource.user && (!resource.user.isActive || resource.user.deletedAt || resource.user.deactivatedAt))) {
      throw new Error("Selected resource is not available for new scheduling.");
    }
    const workingDays = calculateWorkingDays(input.startDate, input.endDate);
    const conflicts = await detectResourceBookingConflicts(resource.id, input.startDate, input.endDate, resource.userId ?? undefined);
    const canOverride = canOverrideBookingConflict(context);
    const hasBlockingConflict = conflicts.some((item) => item.level === "blocked");
    if ((hasBlockingConflict || conflicts.some((item) => item.level === "warning")) && !input.overrideConflict) {
      throw new Error(conflicts[0]?.message ?? "Resource conflict detected");
    }
    if (input.overrideConflict && !canOverride) {
      throw new Error("Missing permission: booking conflict override");
    }
    const status = input.status ?? ResourceBookingStatus.draft;
    const conflictStatus = hasBlockingConflict
      ? (input.overrideConflict ? BookingConflictStatus.overridden : BookingConflictStatus.blocked)
      : conflicts.length
        ? (input.overrideConflict ? BookingConflictStatus.overridden : BookingConflictStatus.warning)
        : BookingConflictStatus.clear;
    const accountId = linkedTicket?.accountId ?? input.accountId ?? null;
    const projectId = linkedTicket?.projectId ?? input.projectId ?? null;
    const location = input.location ?? linkedTicket?.account?.city ?? linkedTicket?.asset?.location ?? null;
    const description = input.description ?? (linkedTicket
      ? [
        `Ticket: ${linkedTicket.ticketNumber}`,
        `Summary: ${linkedTicket.title}`,
        linkedTicket.contact ? `Contact: ${linkedTicket.contact.firstName} ${linkedTicket.contact.lastName}` : null,
        linkedTicket.description
      ].filter(Boolean).join("\n")
      : null);
    const { overrideConflict: _overrideConflict, ...bookingInput } = input;
    const booking = await prisma.resourceBooking.create({
      data: {
        ...bookingInput,
        accountId,
        projectId,
        location,
        description,
        workingDays,
        costTotal: (input.costRate ?? 0) * workingDays,
        sellTotal: (input.sellRate ?? 0) * workingDays,
        status,
        conflictStatus,
        overrideReason: input.overrideConflict ? input.overrideReason ?? "Override approved during booking." : undefined,
        createdById: context.userId
      },
      include: bookingInclude
    });
    await createAuditLog({ userId: context.userId, module: "field_services", entityType: "ResourceBooking", entityId: booking.id, action: "create", newValue: booking });
    if (booking.resource.userId && booking.resource.userId !== context.userId) {
      await createNotification({
        userId: booking.resource.userId,
        title: "Resource booking assigned",
        body: `${booking.title} is scheduled for ${booking.resource.displayName} from ${booking.startDate.toISOString().slice(0, 10)} to ${booking.endDate.toISOString().slice(0, 10)}.`,
        metadata: { href: `/field-services/bookings/${booking.id}` }
      });
    }
    logResourceBookingAction("success", {
      action: "create",
      userId: context.userId,
      bookingId: booking.id,
      resourceId: booking.resourceId,
      helpdeskTicketId: booking.helpdeskTicketId ?? null,
      accountId: booking.accountId ?? null,
      projectId: booking.projectId ?? null,
      conflicts: conflicts.length
    });
    return { ...booking, conflicts };
  } catch (error) {
    logResourceBookingAction("failure", {
      action: "create",
      userId: context.userId,
      resourceId: input.resourceId,
      helpdeskTicketId: input.helpdeskTicketId ?? null,
      accountId: input.accountId ?? null,
      projectId: input.projectId ?? null,
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function updateResourceBooking(context: CrmAccessContext, id: string, input: ResourceBookingUpdateInput) {
  assertAnyModulePermission(context, ["field_services.manage_bookings", "schedule.create_booking"]);
  const previous = await getResourceBooking(context, id);
  const resourceId = input.resourceId ?? previous.resourceId;
  const resource = await prisma.resource.findFirst({ where: { id: resourceId, deletedAt: null } });
  if (!resource) throw new Error("Resource not found");
  const startDate = input.startDate ?? previous.startDate;
  const endDate = input.endDate ?? previous.endDate;
  const workingDays = calculateWorkingDays(startDate, endDate);
  const conflicts = await detectResourceBookingConflicts(resource.id, startDate, endDate, resource.userId ?? undefined, id);
  const hasBlockingConflict = conflicts.some((item) => item.level === "blocked");
  if ((hasBlockingConflict || conflicts.some((item) => item.level === "warning")) && !input.overrideConflict) {
    throw new Error(conflicts[0]?.message ?? "Resource conflict detected");
  }
  const { overrideConflict: _overrideConflict, ...bookingInput } = input;
  const booking = await prisma.resourceBooking.update({
    where: { id },
    data: {
      ...bookingInput,
      workingDays,
      costTotal: Number(input.costRate ?? previous.costRate) * workingDays,
      sellTotal: Number(input.sellRate ?? previous.sellRate) * workingDays,
      conflictStatus: hasBlockingConflict
        ? (input.overrideConflict ? BookingConflictStatus.overridden : BookingConflictStatus.blocked)
        : conflicts.length
          ? (input.overrideConflict ? BookingConflictStatus.overridden : BookingConflictStatus.warning)
          : BookingConflictStatus.clear
    },
    include: bookingInclude
  });
  await createAuditLog({ userId: context.userId, module: "field_services", entityType: "ResourceBooking", entityId: booking.id, action: "update", previousValue: previous, newValue: booking });
  return { ...booking, conflicts };
}

function logResourceBookingAction(event: "attempt" | "success" | "failure", details: Record<string, unknown>) {
  const payload = JSON.stringify(details);
  if (event === "failure") {
    console.warn(`[field-services:resource-booking] ${payload}`);
    return;
  }
  console.info(`[field-services:resource-booking] ${payload}`);
}

export async function getResourceScheduleOverview(context: CrmAccessContext) {
  const [resources, bookings, pendingLeave, approvedLeave] = await Promise.all([
    listResources(context),
    listResourceBookings(context),
    prisma.leaveRequest.count({ where: { deletedAt: null, status: "submitted" } }),
    prisma.leaveRequest.count({ where: { deletedAt: null, status: "approved" } })
  ]);
  return {
    openBookings: bookings.filter((booking) => booking.status !== ResourceBookingStatus.cancelled).length,
    confirmedBookings: bookings.filter((booking) => booking.status === ResourceBookingStatus.confirmed).length,
    conflictBookings: bookings.filter((booking) => booking.conflictStatus !== BookingConflictStatus.clear).length,
    activeResources: resources.filter((resource) => resource.active).length,
    pendingLeave,
    approvedLeave,
    resources,
    bookings
  };
}

export async function listSchedulableUsers() {
  const [projectManagers, projectEngineers, fieldEngineers] = await Promise.all([
    listActiveUsersByRole("Project Manager"),
    listActiveUsersByRole("Project Engineer"),
    listActiveUsersByRole("Field Engineer")
  ]);
  const users = [...projectManagers, ...projectEngineers, ...fieldEngineers];
  const seen = new Set<string>();
  return users.filter((user) => !seen.has(user.id) && seen.add(user.id)).map((user) => ({
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    role: user.role.name
  }));
}

export async function listBookableResources(context: CrmAccessContext) {
  assertAnyModulePermission(context, ["field_services.manage_bookings", "schedule.create_booking", "field_services.read_all", "field_services.read_own"]);
  await syncActiveUsersToResources();
  return prisma.resource.findMany({
    where: {
      AND: [
        resourceVisibilityWhere(context),
        { active: true },
        {
          OR: [
            { userId: null },
            { user: { isActive: true, deletedAt: null, deactivatedAt: null } }
          ]
        }
      ]
    },
    include: resourceInclude,
    orderBy: [{ displayName: "asc" }]
  });
}

export async function getFieldServicesCalendar(
  context: CrmAccessContext,
  range: { startDate: Date; endDate: Date },
  options: { includeInactive?: boolean } = {}
) {
  assertAnyModulePermission(context, ["field_services.read_all", "field_services.read_own", "field_services.manage_bookings", "schedule.read_all", "schedule.read_own"]);
  await syncActiveUsersToResources();
  const [resources, bookings, projectAssignments, leaveRequests] = await Promise.all([
    prisma.resource.findMany({
      where: resourceVisibilityWhere(context),
      include: resourceInclude,
      orderBy: [{ active: "desc" }, { displayName: "asc" }]
    }),
    listResourceBookings(context, range),
    prisma.projectResourceAssignment.findMany({
      where: {
        deletedAt: null,
        startDate: { lte: range.endDate },
        endDate: { gte: range.startDate },
        project: projectVisibilityWhere(context)
      },
      include: {
        user: true,
        resource: true,
        project: { include: { account: true } }
      },
      orderBy: [{ startDate: "asc" }, { endDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.leaveRequest.findMany({
      where: {
        ...leaveCalendarVisibilityWhere(context),
        startDate: { lte: range.endDate },
        endDate: { gte: range.startDate },
        status: { in: [LeaveStatus.submitted, LeaveStatus.approved] }
      },
      include: { user: true },
      orderBy: [{ startDate: "asc" }, { endDate: "asc" }]
    })
  ]);

  return buildFieldServicesCalendarData(resources, bookings, projectAssignments, leaveRequests, options);
}

export async function syncActiveUsersToResources() {
  const activeUsers = await prisma.user.findMany({
    where: {
      userType: "internal",
      isActive: true,
      deletedAt: null,
      deactivatedAt: null
    },
    select: {
      id: true,
      displayName: true,
      email: true
    }
  });
  if (!activeUsers.length) return { created: 0, updated: 0, deactivated: 0 };
  const existingResources = await prisma.resource.findMany({
    where: { userId: { in: activeUsers.map((user) => user.id) } },
    select: { id: true, userId: true, active: true, displayName: true, email: true, deletedAt: true }
  });
  const existingByUserId = new Map(existingResources.filter((resource) => resource.userId).map((resource) => [resource.userId as string, resource]));
  const resourcesToRestore = activeUsers
    .map((user) => ({ user, resource: existingByUserId.get(user.id) }))
    .filter(({ resource }) => resource?.deletedAt);
  if (resourcesToRestore.length) {
    await Promise.all(resourcesToRestore.map(({ user, resource }) => prisma.resource.update({
      where: { id: resource!.id },
      data: {
        deletedAt: null,
        active: true,
        displayName: user.displayName,
        email: user.email
      }
    })));
  }
  const missingUsers = activeUsers.filter((user) => !existingByUserId.has(user.id));
  if (missingUsers.length) {
    await prisma.resource.createMany({
      data: missingUsers.map((user) => ({
        resourceType: ResourceType.internal_user,
        userId: user.id,
        displayName: user.displayName,
        email: user.email,
        active: true
      })),
      skipDuplicates: true
    });
  }
  const resourcesToRefresh = activeUsers
    .map((user) => ({ user, resource: existingByUserId.get(user.id) }))
    .filter(({ resource, user }) => resource && !resource.deletedAt && (resource.displayName !== user.displayName || (resource.email ?? null) !== (user.email ?? null)));
  if (resourcesToRefresh.length) {
    await Promise.all(resourcesToRefresh.map(({ user, resource }) => prisma.resource.update({
      where: { id: resource!.id },
      data: {
        displayName: user.displayName,
        email: user.email
      }
    })));
  }
  const inactiveInternalResources = await prisma.resource.findMany({
    where: {
      deletedAt: null,
      resourceType: ResourceType.internal_user,
      userId: { not: null },
      user: {
        OR: [
          { isActive: false },
          { deletedAt: { not: null } },
          { deactivatedAt: { not: null } }
        ]
      },
      active: true
    },
    select: { id: true }
  });
  if (inactiveInternalResources.length) {
    await prisma.resource.updateMany({
      where: { id: { in: inactiveInternalResources.map((resource) => resource.id) } },
      data: { active: false }
    });
  }
  return { created: missingUsers.length, updated: resourcesToRefresh.length + resourcesToRestore.length, deactivated: inactiveInternalResources.length };
}

export async function ensureResourceForUser(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, displayName: true, email: true }
  });
  if (!user) throw new Error("Linked user not found");
  const existing = await prisma.resource.findFirst({
    where: { userId },
    include: resourceInclude
  });
  if (existing) {
    if (existing.deletedAt || existing.displayName !== user.displayName || (existing.email ?? null) !== (user.email ?? null)) {
      return prisma.resource.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          displayName: user.displayName,
          email: user.email,
          active: existing.active
        },
        include: resourceInclude
      });
    }
    return existing;
  }
  return prisma.resource.create({
    data: {
      resourceType: ResourceType.internal_user,
      userId: user.id,
      displayName: user.displayName,
      email: user.email,
      active: true
    },
    include: resourceInclude
  });
}

export function buildFieldServicesCalendarData(
  resources: Array<Prisma.ResourceGetPayload<{ include: typeof resourceInclude }>>,
  bookings: Array<Prisma.ResourceBookingGetPayload<{ include: typeof bookingInclude }>>,
  projectAssignments: Array<{
    id: string;
    projectId: string;
    resourceId?: string | null;
    userId?: string | null;
    role: string;
    scheduledDays: Prisma.Decimal | number;
    notes?: string | null;
    startDate: Date;
    endDate: Date;
    user?: { displayName: string } | null;
    resource?: { id: string; displayName: string; userId?: string | null } | null;
    project: { projectNumber: string; name: string; account: { name: string } };
  }>,
  leaveRequests: Array<{
    id: string;
    userId: string;
    leaveType: string;
    status: LeaveStatus;
    startDate: Date;
    endDate: Date;
    user: { displayName: string };
  }>,
  options: { includeInactive?: boolean } = {}
) {
  const includeInactive = options.includeInactive ?? false;
  const activeResourceIds = new Set(resources.filter((resource) => resource.active).map((resource) => resource.id));
  const resourceByUserId = new Map(resources.filter((resource) => resource.userId).map((resource) => [resource.userId as string, resource]));
  const bookingKeys = new Set(
    bookings
      .filter((booking) => booking.projectId && booking.resource.userId)
      .map((booking) => `${booking.projectId}:${booking.resourceId}:${booking.startDate.toISOString().slice(0, 10)}:${booking.endDate.toISOString().slice(0, 10)}`)
  );

  const bookingEntries: FieldServicesCalendarEntry[] = bookings
    .filter((booking) => includeInactive || (booking.status !== ResourceBookingStatus.cancelled && activeResourceIds.has(booking.resourceId)))
    .map((booking) => ({
    id: booking.id,
    href: `/field-services/bookings/${booking.id}`,
    source: "booking",
    category: booking.conflictStatus !== BookingConflictStatus.clear
      ? "conflict"
      : booking.bookingType === ResourceBookingType.project ? "project" : "non_project",
    title: booking.title,
    subtitle: [booking.account?.name ?? booking.project?.account?.name ?? null, booking.project?.projectNumber ?? null, booking.location ?? null].filter(Boolean).join(" | "),
    resourceId: booking.resourceId,
    resourceName: booking.resource.displayName,
    startDate: booking.startDate,
    endDate: booking.endDate,
    location: booking.location,
    status: booking.status,
    projectNumber: booking.project?.projectNumber ?? null,
    customerName: booking.account?.name ?? booking.project?.account?.name ?? null,
    bookingStatus: booking.status,
    conflictStatus: booking.conflictStatus
    }));

  const assignmentEntries: FieldServicesCalendarEntry[] = projectAssignments
    .filter((assignment) => {
      const dedupeResourceId = assignment.resourceId
        ?? assignment.resource?.id
        ?? (assignment.userId ? resourceByUserId.get(assignment.userId)?.id : null)
        ?? assignment.userId
        ?? assignment.id;
      const linkedResource = assignment.resource?.id
        ? resources.find((resource) => resource.id === assignment.resource?.id)
        : assignment.userId ? resourceByUserId.get(assignment.userId) : null;
      if (!includeInactive && linkedResource && !linkedResource.active) return false;
      return !bookingKeys.has(`${assignment.projectId}:${dedupeResourceId}:${assignment.startDate.toISOString().slice(0, 10)}:${assignment.endDate.toISOString().slice(0, 10)}`);
    })
    .map((assignment) => {
      const linkedResource = assignment.resource?.id
        ? resources.find((resource) => resource.id === assignment.resource?.id)
        : assignment.userId ? resourceByUserId.get(assignment.userId) : null;
      const resourceName = assignment.resource?.displayName ?? assignment.user?.displayName ?? linkedResource?.displayName ?? "Resource";
      return {
        id: `assignment-${assignment.id}`,
        href: `/projects/${assignment.projectId}#resources`,
        source: "project_assignment" as const,
        category: "project" as const,
        title: `${assignment.project.projectNumber} - ${assignment.project.name}`,
        subtitle: [assignment.project.account.name, assignment.role.replaceAll("_", " "), `${Number(assignment.scheduledDays)} day(s)`, assignment.notes ?? null].filter(Boolean).join(" | "),
        resourceId: linkedResource?.id ?? assignment.resourceId ?? assignment.userId ?? assignment.id,
        resourceName,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        location: null,
        status: "scheduled",
        projectNumber: assignment.project.projectNumber,
        customerName: assignment.project.account.name,
        bookingStatus: "scheduled",
        conflictStatus: null
      };
    });

  const leaveEntries: FieldServicesCalendarEntry[] = leaveRequests.flatMap((request) => {
    const linkedResource = resourceByUserId.get(request.userId);
    if (!linkedResource) return [];
    if (!includeInactive && !linkedResource.active) return [];
    return [{
      id: `leave-${request.id}`,
      href: `/leave/${request.id}`,
      source: "leave" as const,
      category: request.status === LeaveStatus.approved ? "leave_approved" as const : "leave_pending" as const,
      title: request.leaveType.replaceAll("_", " "),
      subtitle: request.user.displayName,
      resourceId: linkedResource.id,
      resourceName: request.user.displayName,
      startDate: request.startDate,
      endDate: request.endDate,
      location: null,
      status: request.status,
      customerName: null,
      projectNumber: null,
      bookingStatus: request.status,
      conflictStatus: request.status === LeaveStatus.approved ? "blocked" : "warning"
    }];
  });

  return {
    resources: resources
      .filter((resource) => includeInactive || resource.active)
      .map((resource) => ({
      id: resource.id,
      label: resource.displayName,
      subtitle: resource.roleType ?? resource.companyName ?? resource.user?.email ?? null,
      active: resource.active
      })),
    entries: [...bookingEntries, ...assignmentEntries, ...leaveEntries].sort((left, right) => left.startDate.getTime() - right.startDate.getTime() || left.title.localeCompare(right.title))
  };
}

type ConflictRecord = {
  level: "warning" | "blocked";
  message: string;
};

export async function detectResourceBookingConflicts(resourceId: string, startDate: Date, endDate: Date, userId?: string, excludeBookingId?: string): Promise<ConflictRecord[]> {
  const conflicts: ConflictRecord[] = [];
  const overlappingBookings = await prisma.resourceBooking.findMany({
    where: {
      resourceId,
      deletedAt: null,
      status: { not: ResourceBookingStatus.cancelled },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      startDate: { lte: endDate },
      endDate: { gte: startDate }
    },
    include: { project: true }
  });
  for (const booking of overlappingBookings) {
    conflicts.push({
      level: booking.status === ResourceBookingStatus.confirmed ? "blocked" : "warning",
      message: `Resource conflict detected with ${booking.title} (${booking.startDate.toISOString().slice(0, 10)} to ${booking.endDate.toISOString().slice(0, 10)}).`
    });
  }
  if (userId) {
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ["submitted", "approved"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    });
    for (const leave of leaveRequests) {
      conflicts.push({
        level: leave.status === "approved" ? "blocked" : "warning",
        message: `Resource is on ${leave.status === "approved" ? "approved" : "pending"} leave for this date range.`
      });
    }
  }
  return conflicts;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function resourceVisibilityWhere(context: CrmAccessContext): Prisma.ResourceWhereInput {
  if (isAdminContext(context) || context.permissions.includes("field_services.read_all") || context.permissions.includes("field_services.manage_resources")) {
    return { deletedAt: null };
  }
  return { deletedAt: null, userId: context.userId };
}

function leaveCalendarVisibilityWhere(context: CrmAccessContext): Prisma.LeaveRequestWhereInput {
  if (
    isAdminContext(context)
    || context.permissions.includes("leave.approve")
    || context.permissions.includes("leave.view_team")
    || context.permissions.includes("field_services.manage_bookings")
    || context.permissions.includes("field_services.manage_resources")
    || context.permissions.includes("schedule.read_all")
  ) {
    return { deletedAt: null };
  }
  return { deletedAt: null, userId: context.userId };
}

function bookingVisibilityWhere(context: CrmAccessContext): Prisma.ResourceBookingWhereInput {
  if (
    isAdminContext(context)
    || context.permissions.includes("field_services.read_all")
    || context.permissions.includes("field_services.manage_bookings")
    || context.permissions.includes("schedule.read_all")
  ) {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: [
      { resource: { userId: context.userId } },
      { project: projectVisibilityWhere(context) },
      { opportunity: { ownerId: context.userId, deletedAt: null } },
      { account: { ownerId: context.userId, deletedAt: null } }
    ]
  };
}

function canOverrideBookingConflict(context: CrmAccessContext) {
  return isAdminContext(context)
    || context.role === "Business Operations"
    || context.role === "Project Manager"
    || context.permissions.includes("field_services.override_conflict")
    || context.permissions.includes("schedule.override_conflict");
}
