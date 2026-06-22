import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitLeaveRequest, rejectLeaveRequest } from "@/modules/leave/leave-service";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/services/notifications/notification-service";
import { sendTemplatedEmail, sendTemplatedEmailToUserIds } from "@/services/email/email-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    leaveRequest: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    user: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("@/services/audit/audit-service", () => ({
  createAuditLog: vi.fn()
}));

vi.mock("@/services/notifications/notification-service", () => ({
  createNotification: vi.fn()
}));

vi.mock("@/services/email/email-service", () => ({
  sendTemplatedEmail: vi.fn(),
  sendTemplatedEmailToUserIds: vi.fn()
}));

const adminContext = {
  userId: "admin-1",
  permissions: ["leave.approve", "leave.request"],
  permissionLevel: "administrator",
  role: "Administrator"
} as const;

describe("leave service", () => {
  beforeEach(() => {
    vi.mocked(prisma.leaveRequest.findFirst).mockReset();
    vi.mocked(prisma.leaveRequest.update).mockReset();
    vi.mocked(prisma.user.findMany).mockReset();
    vi.mocked(createNotification).mockReset();
    vi.mocked(sendTemplatedEmail).mockReset();
    vi.mocked(sendTemplatedEmailToUserIds).mockReset();
    vi.mocked(createNotification).mockResolvedValue(undefined as never);
    vi.mocked(sendTemplatedEmail).mockResolvedValue({ sent: true, provider: "console" } as never);
    vi.mocked(sendTemplatedEmailToUserIds).mockResolvedValue([] as never);
  });

  it("routes submitted leave approval notifications to James Harrison when found", async () => {
    vi.mocked(prisma.leaveRequest.findFirst).mockResolvedValue({
      id: "leave-1",
      userId: "user-1",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-03"),
      leaveType: "annual_leave",
      workingDays: 3,
      status: "draft",
      user: { displayName: "Olivia Reed" }
    } as never);
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
      { id: "james-user", displayName: "James Harrison", email: "james@connectedhsp.com" }
    ] as never);
    vi.mocked(prisma.leaveRequest.update).mockResolvedValue({
      id: "leave-1",
      userId: "user-1",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-03"),
      leaveType: "annual_leave",
      workingDays: 3,
      status: "submitted",
      approverId: "james-user",
      user: { displayName: "Olivia Reed" },
      approver: { displayName: "James Harrison" }
    } as never);

    const result = await submitLeaveRequest(adminContext as never, "leave-1");

    expect(result.approverId).toBe("james-user");
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "james-user",
      title: "Leave request submitted",
      metadata: { href: "/leave/approvals" }
    }));
    expect(sendTemplatedEmailToUserIds).toHaveBeenCalledWith(["james-user"], expect.any(Function));
  });

  it("falls back to administrator approvers when James is unavailable", async () => {
    vi.mocked(prisma.leaveRequest.findFirst).mockResolvedValue({
      id: "leave-2",
      userId: "user-2",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-05"),
      leaveType: "annual_leave",
      workingDays: 3,
      status: "draft",
      user: { displayName: "Daniel Price" }
    } as never);
    vi.mocked(prisma.user.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ id: "admin-approver", displayName: "Admin Approver", email: "admin@example.com" }] as never);
    vi.mocked(prisma.leaveRequest.update).mockResolvedValue({
      id: "leave-2",
      userId: "user-2",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-05"),
      leaveType: "annual_leave",
      workingDays: 3,
      status: "submitted",
      approverId: "admin-approver",
      user: { displayName: "Daniel Price" },
      approver: { displayName: "Admin Approver" }
    } as never);

    await submitLeaveRequest(adminContext as never, "leave-2");

    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "admin-approver"
    }));
  });

  it("requires a rejection reason", async () => {
    await expect(rejectLeaveRequest(adminContext as never, "leave-3", "   ")).rejects.toThrow(
      "Unable to reject leave request. Please add a rejection reason and try again."
    );
  });

  it("rejects leave, notifies the requester, and does not fail if email sending errors", async () => {
    vi.mocked(prisma.leaveRequest.findFirst).mockResolvedValue({
      id: "leave-4",
      userId: "user-4",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-02"),
      leaveType: "annual_leave",
      workingDays: 2,
      status: "submitted",
      user: { displayName: "Mia Guest", email: "mia@example.com" }
    } as never);
    vi.mocked(prisma.leaveRequest.update).mockResolvedValue({
      id: "leave-4",
      userId: "user-4",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-02"),
      leaveType: "annual_leave",
      workingDays: 2,
      status: "rejected",
      rejectionReason: "Peak project week",
      user: { displayName: "Mia Guest", email: "mia@example.com" },
      approver: { displayName: "James Harrison" }
    } as never);
    vi.mocked(sendTemplatedEmail).mockRejectedValueOnce(new Error("SMTP offline"));

    const result = await rejectLeaveRequest(adminContext as never, "leave-4", "Peak project week");

    expect(result.status).toBe("rejected");
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-4",
      title: "Leave rejected"
    }));
    expect(sendTemplatedEmail).toHaveBeenCalled();
  });
});
