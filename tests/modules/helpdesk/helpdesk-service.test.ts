import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHelpdeskTicket, listHelpdeskTickets, updateHelpdeskTicket } from "@/modules/helpdesk/helpdesk-service";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/services/notifications/notification-service";
import { sendTemplatedEmail, sendTemplatedEmailToUserIds } from "@/services/email/email-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contact: { findFirst: vi.fn() },
    project: { findFirst: vi.fn() },
    asset: { findFirst: vi.fn() },
    helpdeskTicket: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    helpdeskTicketComment: {
      create: vi.fn()
    }
  }
}));

vi.mock("@/services/audit/audit-service", () => ({
  createAuditLog: vi.fn()
}));

vi.mock("@/services/email/email-service", () => ({
  sendTemplatedEmail: vi.fn(),
  sendTemplatedEmailToUserIds: vi.fn()
}));

vi.mock("@/services/notifications/notification-service", () => ({
  createNotification: vi.fn()
}));

vi.mock("@/services/users/user-service", () => ({
  listActiveUsersByRole: vi.fn().mockResolvedValue([])
}));

const createContext = {
  userId: "user-1",
  permissions: ["helpdesk.create"],
  permissionLevel: "user",
  role: "Business Operations"
} as const;

const updateContext = {
  userId: "manager-1",
  permissions: ["helpdesk.update"],
  permissionLevel: "administrator",
  role: "Administrator"
} as const;

const baseInput = {
  accountId: "account-1",
  title: "WiFi issue",
  description: "Intermittent access in guest rooms",
  ticketType: "incident",
  category: "wifi",
  priority: "normal",
  impact: "low",
  urgency: "low",
  source: "manual"
} as const;

describe("helpdesk service", () => {
  beforeEach(() => {
    vi.mocked(prisma.contact.findFirst).mockReset();
    vi.mocked(prisma.project.findFirst).mockReset();
    vi.mocked(prisma.asset.findFirst).mockReset();
    vi.mocked(prisma.helpdeskTicket.findFirst).mockReset();
    vi.mocked(prisma.helpdeskTicket.findMany).mockReset();
    vi.mocked(prisma.helpdeskTicket.create).mockReset();
    vi.mocked(prisma.helpdeskTicket.update).mockReset();
    vi.mocked(prisma.helpdeskTicketComment.create).mockReset();
    vi.mocked(createNotification).mockReset();
    vi.mocked(sendTemplatedEmail).mockReset();
    vi.mocked(sendTemplatedEmailToUserIds).mockReset();
    vi.mocked(sendTemplatedEmailToUserIds).mockResolvedValue([]);
  });

  it("rejects a contact from another account", async () => {
    vi.mocked(prisma.contact.findFirst).mockResolvedValueOnce({ accountId: "account-2" } as never);

    await expect(createHelpdeskTicket(createContext as never, { ...baseInput, contactId: "contact-2" })).rejects.toThrow(
      "Selected contact, quote, project or asset does not belong to the selected account."
    );
  });

  it("rejects a project from another account", async () => {
    vi.mocked(prisma.project.findFirst).mockResolvedValueOnce({ accountId: "account-2" } as never);

    await expect(createHelpdeskTicket(createContext as never, { ...baseInput, projectId: "project-2" })).rejects.toThrow(
      "Selected contact, quote, project or asset does not belong to the selected account."
    );
  });

  it("rejects an asset from another account", async () => {
    vi.mocked(prisma.asset.findFirst).mockResolvedValueOnce({ accountId: "account-2" } as never);

    await expect(createHelpdeskTicket(createContext as never, { ...baseInput, assetId: "asset-2" })).rejects.toThrow(
      "Selected contact, quote, project or asset does not belong to the selected account."
    );
  });

  it("defaults the helpdesk list to active tickets only", async () => {
    vi.mocked(prisma.helpdeskTicket.findMany).mockResolvedValueOnce([] as never);

    await listHelpdeskTickets({
      userId: "user-1",
      permissions: ["helpdesk.read_all"],
      permissionLevel: "administrator",
      role: "Administrator"
    } as never);

    expect(prisma.helpdeskTicket.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({
            status: {
              in: ["new", "triage", "assigned", "in_progress", "waiting_customer", "waiting_third_party"]
            }
          })
        ])
      })
    }));
  });

  it("resolves a ticket, captures a resolution note, and survives email failure", async () => {
    vi.mocked(prisma.helpdeskTicket.findFirst).mockResolvedValueOnce({
      id: "ticket-1",
      accountId: "account-1",
      contactId: null,
      projectId: null,
      assetId: null,
      title: "WiFi issue",
      status: "assigned",
      priority: "high",
      raisedByUserId: "requester-1",
      raisedByEmail: "guest@example.com",
      raisedByUser: { email: "guest@example.com" },
      assignedToId: "engineer-1",
      slaStatus: "on_track",
      slaResolutionDueAt: new Date("2099-06-22T10:00:00Z"),
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      comments: [],
      resourceBookings: []
    } as never);
    vi.mocked(prisma.helpdeskTicket.update).mockResolvedValueOnce({
      id: "ticket-1",
      ticketNumber: "HD-2026-9001",
      title: "WiFi issue",
      status: "resolved",
      priority: "high",
      raisedByUserId: "requester-1",
      raisedByEmail: "guest@example.com",
      raisedByUser: { email: "guest@example.com" },
      assignedToId: "engineer-1",
      slaStatus: "on_track",
      comments: [],
      resourceBookings: []
    } as never);
    vi.mocked(prisma.helpdeskTicketComment.create).mockResolvedValueOnce({
      id: "comment-1",
      body: "Resolution note: Rebooted AP stack and confirmed stability.",
      author: { displayName: "Operations Admin" }
    } as never);
    vi.mocked(sendTemplatedEmail).mockRejectedValueOnce(new Error("SMTP offline"));

    const ticket = await updateHelpdeskTicket(updateContext as never, "ticket-1", {
      status: "resolved",
      resolutionNote: "Rebooted AP stack and confirmed stability."
    });

    expect(ticket.status).toBe("resolved");
    expect(prisma.helpdeskTicketComment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        ticketId: "ticket-1",
        body: "Resolution note: Rebooted AP stack and confirmed stability."
      })
    }));
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "requester-1",
      title: "Helpdesk ticket resolved"
    }));
  });

  it("closes a ticket successfully", async () => {
    vi.mocked(prisma.helpdeskTicket.findFirst).mockResolvedValueOnce({
      id: "ticket-2",
      accountId: "account-1",
      contactId: null,
      projectId: null,
      assetId: null,
      title: "WiFi issue",
      status: "resolved",
      priority: "normal",
      raisedByUserId: "requester-1",
      raisedByEmail: null,
      raisedByUser: null,
      assignedToId: null,
      slaStatus: "on_track",
      slaResolutionDueAt: new Date("2099-06-22T10:00:00Z"),
      firstResponseAt: new Date("2099-06-20T10:00:00Z"),
      resolvedAt: new Date("2099-06-21T12:00:00Z"),
      closedAt: null,
      comments: [],
      resourceBookings: []
    } as never);
    vi.mocked(prisma.helpdeskTicket.update).mockResolvedValueOnce({
      id: "ticket-2",
      ticketNumber: "HD-2026-9002",
      title: "WiFi issue",
      status: "closed",
      priority: "normal",
      raisedByUserId: "requester-1",
      raisedByEmail: null,
      raisedByUser: null,
      assignedToId: null,
      slaStatus: "on_track",
      comments: [],
      resourceBookings: []
    } as never);

    const ticket = await updateHelpdeskTicket(updateContext as never, "ticket-2", { status: "closed" });

    expect(ticket.status).toBe("closed");
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "requester-1",
      title: "Helpdesk ticket closed"
    }));
  });

  it("requires a resolved ticket before closing", async () => {
    vi.mocked(prisma.helpdeskTicket.findFirst).mockResolvedValueOnce({
      id: "ticket-close-1",
      accountId: "account-1",
      contactId: null,
      projectId: null,
      assetId: null,
      title: "WiFi issue",
      status: "assigned",
      priority: "normal",
      raisedByUserId: null,
      raisedByEmail: null,
      raisedByUser: null,
      assignedToId: null,
      slaStatus: "on_track",
      slaResolutionDueAt: new Date("2099-06-22T10:00:00Z"),
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      comments: [],
      resourceBookings: []
    } as never);

    await expect(updateHelpdeskTicket(updateContext as never, "ticket-close-1", { status: "closed" })).rejects.toThrow(
      "Please resolve this ticket before closing it."
    );
  });

  it("reopens a resolved ticket successfully", async () => {
    vi.mocked(prisma.helpdeskTicket.findFirst).mockResolvedValueOnce({
      id: "ticket-3",
      accountId: "account-1",
      contactId: null,
      projectId: null,
      assetId: null,
      title: "WiFi issue",
      status: "resolved",
      priority: "normal",
      raisedByUserId: null,
      raisedByEmail: null,
      raisedByUser: null,
      assignedToId: "engineer-1",
      slaStatus: "on_track",
      slaResolutionDueAt: new Date("2099-06-22T10:00:00Z"),
      firstResponseAt: new Date("2099-06-20T10:00:00Z"),
      resolvedAt: new Date("2099-06-21T12:00:00Z"),
      closedAt: null,
      comments: [],
      resourceBookings: []
    } as never);
    vi.mocked(prisma.helpdeskTicket.update).mockResolvedValueOnce({
      id: "ticket-3",
      ticketNumber: "HD-2026-9003",
      title: "WiFi issue",
      status: "in_progress",
      priority: "normal",
      raisedByUserId: null,
      raisedByEmail: null,
      raisedByUser: null,
      assignedToId: "engineer-1",
      slaStatus: "on_track",
      comments: [],
      resourceBookings: []
    } as never);

    const ticket = await updateHelpdeskTicket(updateContext as never, "ticket-3", { status: "in_progress" });

    expect(ticket.status).toBe("in_progress");
    expect(prisma.helpdeskTicket.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        resolvedAt: null,
        closedAt: null
      })
    }));
  });

  it("requires a resolution note when resolving", async () => {
    vi.mocked(prisma.helpdeskTicket.findFirst).mockResolvedValueOnce({
      id: "ticket-4",
      accountId: "account-1",
      contactId: null,
      projectId: null,
      assetId: null,
      title: "WiFi issue",
      status: "assigned",
      priority: "normal",
      raisedByUserId: null,
      raisedByEmail: null,
      raisedByUser: null,
      assignedToId: null,
      slaStatus: "on_track",
      slaResolutionDueAt: new Date("2099-06-22T10:00:00Z"),
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      comments: [],
      resourceBookings: []
    } as never);

    await expect(updateHelpdeskTicket(updateContext as never, "ticket-4", { status: "resolved" })).rejects.toThrow(
      "Unable to resolve ticket. Please add a resolution note and try again."
    );
  });

  it("allows status-only updates even when legacy linked records would fail scope validation", async () => {
    vi.mocked(prisma.helpdeskTicket.findFirst).mockResolvedValueOnce({
      id: "ticket-legacy-1",
      ticketNumber: "HD-2026-9099",
      accountId: "account-1",
      contactId: "contact-legacy",
      projectId: "project-legacy",
      assetId: null,
      title: "Legacy ticket",
      status: "resolved",
      priority: "normal",
      raisedByUserId: null,
      raisedByEmail: null,
      raisedByUser: null,
      assignedToId: null,
      slaStatus: "on_track",
      slaResolutionDueAt: new Date("2099-06-22T10:00:00Z"),
      firstResponseAt: new Date("2099-06-20T10:00:00Z"),
      resolvedAt: new Date("2099-06-21T12:00:00Z"),
      closedAt: null,
      comments: [],
      resourceBookings: []
    } as never);
    vi.mocked(prisma.helpdeskTicket.update).mockResolvedValueOnce({
      id: "ticket-legacy-1",
      ticketNumber: "HD-2026-9099",
      title: "Legacy ticket",
      status: "closed",
      priority: "normal",
      raisedByUserId: null,
      raisedByEmail: null,
      raisedByUser: null,
      assignedToId: null,
      slaStatus: "on_track",
      comments: [],
      resourceBookings: []
    } as never);
    vi.mocked(prisma.contact.findFirst).mockResolvedValueOnce({ accountId: "different-account" } as never);

    const ticket = await updateHelpdeskTicket(updateContext as never, "ticket-legacy-1", { status: "closed" });

    expect(ticket.status).toBe("closed");
    expect(prisma.contact.findFirst).not.toHaveBeenCalled();
    expect(prisma.project.findFirst).not.toHaveBeenCalled();
    expect(prisma.asset.findFirst).not.toHaveBeenCalled();
  });
});
