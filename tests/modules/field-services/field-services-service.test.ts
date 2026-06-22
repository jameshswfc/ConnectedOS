import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFieldServicesCalendarData, createResourceBooking, listResources, removeResource, syncActiveUsersToResources } from "@/modules/field-services/field-services-service";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/services/notifications/notification-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    resource: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    resourceBooking: {
      count: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn()
    },
    projectResourceAssignment: {
      findMany: vi.fn(),
      updateMany: vi.fn()
    },
    leaveRequest: {
      findMany: vi.fn()
    },
    helpdeskTicket: {
      findFirst: vi.fn()
    }
  }
}));

vi.mock("@/services/audit/audit-service", () => ({
  createAuditLog: vi.fn()
}));

vi.mock("@/services/notifications/notification-service", () => ({
  createNotification: vi.fn()
}));

describe("field services service", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findMany).mockReset();
    vi.mocked(prisma.resource.findMany).mockReset();
    vi.mocked(prisma.resource.createMany).mockReset();
    vi.mocked(prisma.resource.updateMany).mockReset();
    vi.mocked(prisma.resource.findFirst).mockReset();
    vi.mocked(prisma.resource.update).mockReset();
    vi.mocked(prisma.resourceBooking.count).mockReset();
    vi.mocked(prisma.resourceBooking.findMany).mockReset();
    vi.mocked(prisma.resourceBooking.updateMany).mockReset();
    vi.mocked(prisma.resourceBooking.create).mockReset();
    vi.mocked(prisma.projectResourceAssignment.findMany).mockReset();
    vi.mocked(prisma.projectResourceAssignment.updateMany).mockReset();
    vi.mocked(prisma.leaveRequest.findMany).mockReset();
    vi.mocked(prisma.helpdeskTicket.findFirst).mockReset();
    vi.mocked(createNotification).mockReset();
  });

  it("builds calendar data with direct bookings, project assignments, leave and no duplicates", () => {
    const resources = [
      { id: "resource-1", userId: "user-1", displayName: "Olivia Reed", roleType: "Project Manager", companyName: null, user: { email: "olivia@example.com" }, active: true },
      { id: "resource-2", userId: "user-2", displayName: "Daniel Price", roleType: "Field Engineer", companyName: null, user: { email: "daniel@example.com" }, active: true }
    ] as never;
    const bookings = [
      {
        id: "booking-1",
        resourceId: "resource-1",
        projectId: "project-1",
        bookingType: "project",
        title: "Project mobilisation",
        startDate: new Date("2026-06-16"),
        endDate: new Date("2026-06-20"),
        location: "Manchester",
        status: "confirmed",
        conflictStatus: "clear",
        resource: { displayName: "Olivia Reed", userId: "user-1" },
        account: { name: "Marriott Manchester" },
        project: { projectNumber: "PRJ-2026-0001", account: { name: "Marriott Manchester" } }
      }
    ] as never;
    const assignments = [
      {
        id: "assignment-duplicate",
        projectId: "project-1",
        resourceId: "resource-1",
        userId: "user-1",
        role: "project_manager",
        scheduledDays: 5,
        startDate: new Date("2026-06-16"),
        endDate: new Date("2026-06-20"),
        user: { displayName: "Olivia Reed" },
        resource: { id: "resource-1", displayName: "Olivia Reed", userId: "user-1" },
        project: { projectNumber: "PRJ-2026-0001", name: "Marriott GPNS", account: { name: "Marriott Manchester" } }
      },
      {
        id: "assignment-2",
        projectId: "project-2",
        resourceId: "resource-2",
        userId: "user-2",
        role: "field_engineer",
        scheduledDays: 3,
        startDate: new Date("2026-06-23"),
        endDate: new Date("2026-06-25"),
        user: { displayName: "Daniel Price" },
        resource: { id: "resource-2", displayName: "Daniel Price", userId: "user-2" },
        project: { projectNumber: "PRJ-2026-0002", name: "Native Cabling", account: { name: "Native Places Birmingham" } }
      }
    ] as never;
    const leaveRequests = [
      {
        id: "leave-1",
        userId: "user-2",
        leaveType: "annual_leave",
        status: "approved",
        startDate: new Date("2026-06-26"),
        endDate: new Date("2026-06-27"),
        user: { displayName: "Daniel Price" }
      }
    ] as never;

    const calendar = buildFieldServicesCalendarData(resources, bookings, assignments, leaveRequests);

    expect(calendar.entries.filter((entry) => entry.source === "booking")).toHaveLength(1);
    expect(calendar.entries.filter((entry) => entry.source === "project_assignment")).toHaveLength(1);
    expect(calendar.entries.filter((entry) => entry.source === "leave")).toHaveLength(1);
    expect(calendar.entries.find((entry) => entry.source === "project_assignment")?.projectNumber).toBe("PRJ-2026-0002");
  });

  it("hides inactive resource schedule entries by default and reveals them when requested", () => {
    const resources = [
      { id: "resource-1", userId: "user-1", displayName: "Olivia Reed", roleType: "Project Manager", companyName: null, user: { email: "olivia@example.com" }, active: true },
      { id: "resource-2", userId: "user-2", displayName: "Inactive Resource", roleType: "Field Engineer", companyName: null, user: { email: "inactive@example.com" }, active: false }
    ] as never;
    const bookings = [
      {
        id: "booking-cancelled",
        resourceId: "resource-2",
        projectId: null,
        bookingType: "non_project",
        title: "Cancelled inactive booking",
        startDate: new Date("2099-06-16"),
        endDate: new Date("2099-06-16"),
        location: "Manchester",
        status: "cancelled",
        conflictStatus: "clear",
        resource: { displayName: "Inactive Resource", userId: "user-2" },
        account: null,
        project: null
      }
    ] as never;
    const assignments = [
      {
        id: "assignment-inactive",
        projectId: "project-1",
        resourceId: "resource-2",
        userId: "user-2",
        role: "field_engineer",
        scheduledDays: 2,
        startDate: new Date("2099-06-17"),
        endDate: new Date("2099-06-18"),
        user: { displayName: "Inactive Resource" },
        resource: { id: "resource-2", displayName: "Inactive Resource", userId: "user-2" },
        project: { projectNumber: "PRJ-2026-0099", name: "Historic Project", account: { name: "Historic Account" } }
      }
    ] as never;

    const defaultCalendar = buildFieldServicesCalendarData(resources, bookings, assignments, [], {});
    const includeInactiveCalendar = buildFieldServicesCalendarData(resources, bookings, assignments, [], { includeInactive: true });

    expect(defaultCalendar.entries).toHaveLength(0);
    expect(defaultCalendar.resources).toHaveLength(1);
    expect(includeInactiveCalendar.entries).toHaveLength(2);
    expect(includeInactiveCalendar.resources).toHaveLength(2);
  });

  it("syncs active users into internal resources without duplicating and deactivates inactive linked resources", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
      { id: "user-1", displayName: "Olivia Reed", email: "olivia@example.com" },
      { id: "user-2", displayName: "Daniel Price", email: "daniel@example.com" }
    ] as never);
    vi.mocked(prisma.resource.findMany)
      .mockResolvedValueOnce([{ id: "resource-1", userId: "user-1", active: true }] as never)
      .mockResolvedValueOnce([{ id: "resource-legacy" }] as never);

    await syncActiveUsersToResources();

    expect(prisma.resource.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [
        expect.objectContaining({
          userId: "user-2",
          displayName: "Daniel Price",
          resourceType: "internal_user"
        })
      ],
      skipDuplicates: true
    }));
    expect(prisma.resource.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["resource-legacy"] } },
      data: { active: false }
    });
  });

  it("shows active resources by default in the resource list query", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.resource.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    await listResources({
      userId: "ops",
      permissions: ["field_services.manage_resources"],
      permissionLevel: "administrator",
      role: "Administrator"
    } as never);

    expect(prisma.resource.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([{ active: true }])
      })
    }));
  });

  it("deactivates a resource and cancels future bookings while keeping history visible", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.resource.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(prisma.resource.findFirst).mockResolvedValueOnce({
      id: "resource-1",
      userId: "user-1",
      displayName: "Olivia Reed",
      active: true,
      bookings: []
    } as never);
    vi.mocked(prisma.resourceBooking.findMany).mockResolvedValueOnce([
      {
        id: "booking-future",
        resourceId: "resource-1",
        title: "Future deployment",
        startDate: new Date("2099-06-20"),
        endDate: new Date("2099-06-22"),
        status: "confirmed",
        projectId: "project-1",
        project: { projectManagerId: "pm-1" }
      }
    ] as never);
    vi.mocked(prisma.projectResourceAssignment.findMany).mockResolvedValueOnce([
      {
        id: "assignment-future",
        resourceId: "resource-1",
        userId: "user-1",
        startDate: new Date("2099-06-23"),
        endDate: new Date("2099-06-24"),
        role: "project_manager",
        projectId: "project-1",
        project: { projectManagerId: "pm-1", projectNumber: "PRJ-2026-0001" }
      }
    ] as never);
    vi.mocked(prisma.resource.update).mockResolvedValueOnce({
      id: "resource-1",
      displayName: "Olivia Reed",
      active: false
    } as never);

    const result = await removeResource({
      userId: "admin",
      permissions: ["field_services.manage_resources", "admin.users"],
      permissionLevel: "administrator",
      role: "Administrator"
    } as never, "resource-1");

    expect(result.action).toBe("deactivated");
    expect(result.message).toContain("future booking");
    expect(prisma.resourceBooking.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ["booking-future"] } },
      data: expect.objectContaining({ status: "cancelled" })
    }));
    expect(prisma.projectResourceAssignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ["assignment-future"] } },
      data: expect.objectContaining({ deletedAt: expect.any(Date) })
    }));
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "pm-1"
    }));
  });

  it("deactivates a resource without future bookings and does not soft delete it", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.resource.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(prisma.resource.findFirst).mockResolvedValueOnce({
      id: "resource-2",
      userId: null,
      displayName: "Test Resource",
      active: true,
      bookings: []
    } as never);
    vi.mocked(prisma.resourceBooking.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.projectResourceAssignment.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.resource.update).mockResolvedValueOnce({
      id: "resource-2",
      displayName: "Test Resource",
      active: false
    } as never);

    const result = await removeResource({
      userId: "admin",
      permissions: ["field_services.manage_resources", "admin.users"],
      permissionLevel: "administrator",
      role: "Administrator"
    } as never, "resource-2");

    expect(result.action).toBe("deactivated");
    expect(result.message).toBe("Resource deactivated.");
    expect(prisma.resource.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        active: false
      })
    }));
  });

  it("creates a booking from a helpdesk ticket and inherits linked account/project details", async () => {
    vi.mocked(prisma.helpdeskTicket.findFirst).mockResolvedValueOnce({
      id: "ticket-1",
      ticketNumber: "HD-2026-9001",
      title: "Guest WiFi outage",
      description: "Floor 3 guest rooms are offline.",
      accountId: "account-1",
      projectId: "project-1",
      account: { city: "Manchester" },
      project: { id: "project-1" },
      contact: { firstName: "Rebecca", lastName: "Moore" },
      asset: null
    } as never);
    vi.mocked(prisma.resource.findFirst).mockResolvedValueOnce({
      id: "resource-1",
      active: true,
      userId: "user-1",
      user: { isActive: true, deletedAt: null, deactivatedAt: null }
    } as never);
    vi.mocked(prisma.resourceBooking.findMany).mockResolvedValue([]);
    vi.mocked(prisma.leaveRequest.findMany).mockResolvedValue([]);
    vi.mocked(prisma.resourceBooking.create).mockResolvedValueOnce({
      id: "booking-1",
      title: "HD-2026-9001 - Guest WiFi outage",
      startDate: new Date("2026-06-23"),
      endDate: new Date("2026-06-24"),
      resource: { userId: "user-1", displayName: "Olivia Reed" }
    } as never);

    await createResourceBooking({
      userId: "manager-1",
      permissions: ["field_services.manage_bookings"],
      permissionLevel: "administrator",
      role: "Administrator"
    } as never, {
      resourceId: "resource-1",
      helpdeskTicketId: "ticket-1",
      bookingType: "support",
      title: "HD-2026-9001 - Guest WiFi outage",
      startDate: new Date("2026-06-23"),
      endDate: new Date("2026-06-24"),
      chargeable: true,
      overrideConflict: false
    });

    expect(prisma.resourceBooking.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        accountId: "account-1",
        projectId: "project-1",
        helpdeskTicketId: "ticket-1",
        location: "Manchester",
        description: expect.stringContaining("Ticket: HD-2026-9001")
      })
    }));
    expect(prisma.resourceBooking.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({
        overrideConflict: expect.anything()
      })
    }));
  });

  it("returns a friendly validation error when a helpdesk ticket has no linked account or project", async () => {
    vi.mocked(prisma.helpdeskTicket.findFirst).mockResolvedValueOnce({
      id: "ticket-2",
      ticketNumber: "HD-2026-9002",
      title: "Unscoped request",
      description: "No linked records yet.",
      accountId: null,
      projectId: null,
      account: null,
      project: null,
      contact: null,
      asset: null
    } as never);

    await expect(createResourceBooking({
      userId: "manager-1",
      permissions: ["field_services.manage_bookings"],
      permissionLevel: "administrator",
      role: "Administrator"
    } as never, {
      resourceId: "resource-1",
      helpdeskTicketId: "ticket-2",
      bookingType: "support",
      title: "HD-2026-9002 - Unscoped request",
      startDate: new Date("2026-06-23"),
      endDate: new Date("2026-06-24"),
      chargeable: true,
      overrideConflict: false
    })).rejects.toThrow("Unable to create resource booking. Please link the ticket to an account or project before scheduling field work.");
  });
});
