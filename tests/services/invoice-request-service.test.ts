import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  db: { project: { findFirst: vi.fn(), findUniqueOrThrow: vi.fn() }, user: { findFirst: vi.fn() }, projectInvoiceRequest: { count: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), aggregate: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() }, auditLog: { create: vi.fn() }, notification: { create: vi.fn() }, $transaction: vi.fn() },
  email: vi.fn(), session: vi.fn(), customers: vi.fn(), post: vi.fn()
}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
vi.mock("@/services/email/email-service", () => ({ sendTemplatedEmailToUserIds: mocks.email }));
vi.mock("@/services/integrations/sage/sage-session", () => ({ withSageSession: mocks.session }));
vi.mock("@/services/integrations/sage/sage-invoice-writer", async (original) => ({ ...await original<typeof import("@/services/integrations/sage/sage-invoice-writer")>(), fetchSageCustomers: mocks.customers, postApprovedSageInvoice: mocks.post, validateInvoicePostingCodes: vi.fn() }));
import { approveProjectInvoice, rejectProjectInvoice, requestProjectInvoice, getInvoiceApprovalCard } from "@/modules/finance/invoice-request-service";

const james = { userId: "11111111-1111-4111-8111-111111111111", permissionLevel: "administrator", permissions: [] };
const pm = { userId: "22222222-2222-4222-8222-222222222222", role: "Project Manager", permissionLevel: "user", permissions: ["projects.read_assigned", "projects.update"] };
const project = { id: "33333333-3333-4333-8333-333333333333", projectNumber: "PRJ-TEST", name: "Test hotel", projectManagerId: pm.userId, status: "completed", milestones: [], stageGates: [], deletedAt: null, commercialValue: new Prisma.Decimal(1000), account: { name: "Test hotel" } };
const record = { id: "44444444-4444-4444-8444-444444444444", projectId: project.id, project, triggerKey: "project", triggerLabel: "Project completion", description: "Final project invoice", status: "requested", requestedById: pm.userId, approverId: james.userId, netAmount: new Prisma.Decimal(100), taxRate: new Prisma.Decimal(20), taxAmount: new Prisma.Decimal(20), totalAmount: new Prisma.Decimal(120) };
const approval = { contactId: "customer", customerConfirmed: true, date: "2026-11-01", dueDate: "2026-11-30" };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("PROJECT_INVOICE_APPROVER_USER_ID", james.userId); vi.stubEnv("SAGE_ALLOW_INVOICE_CREATE", "true"); vi.stubEnv("SAGE_SALES_LEDGER_ACCOUNT_ID", "ledger"); vi.stubEnv("SAGE_STANDARD_TAX_RATE_ID", "tax");
  mocks.db.$transaction.mockImplementation((callback) => callback(mocks.db));
  mocks.db.project.findFirst.mockResolvedValue(project); mocks.db.project.findUniqueOrThrow.mockResolvedValue(project);
  mocks.db.user.findFirst.mockResolvedValue({ id: james.userId });
  mocks.db.projectInvoiceRequest.findFirst.mockResolvedValue(record); mocks.db.projectInvoiceRequest.findUnique.mockResolvedValue(null); mocks.db.projectInvoiceRequest.create.mockResolvedValue(record);
  mocks.db.projectInvoiceRequest.aggregate.mockResolvedValue({ _sum: { netAmount: null } }); mocks.db.projectInvoiceRequest.updateMany.mockResolvedValue({ count: 1 });
  mocks.session.mockImplementation((callback) => callback({ access_token: "token", refresh_token: "refresh", scope: "full_access", expiresAt: Date.now() + 300000 }, "business"));
  mocks.customers.mockResolvedValue([{ id: "customer", name: "Test hotel" }]); mocks.post.mockResolvedValue({ id: "sage", invoice_number: "SI-123" });
});
afterEach(() => vi.unstubAllEnvs());
describe("invoice approval workflow", () => {
  it("shows a real pending-approval dashboard count only to James", async () => {
    mocks.db.projectInvoiceRequest.count.mockResolvedValue(3);
    expect(await getInvoiceApprovalCard(james)).toMatchObject({ value: "3", href: "/finance/invoice-requests" });
    expect(await getInvoiceApprovalCard(pm)).toBeNull();
    expect(await getInvoiceApprovalCard({ ...james, userId: "other-admin" })).toBeNull();
    expect(mocks.db.projectInvoiceRequest.count).toHaveBeenCalledTimes(1);
  });
  it("creates a request, audit and James notification without contacting Sage", async () => {
    await requestProjectInvoice(pm, { projectId: project.id, triggerKey: "project", description: "Final project invoice", netAmount: "100", taxRate: "20" });
    expect(mocks.db.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: james.userId }) }));
    expect(mocks.db.auditLog.create).toHaveBeenCalled(); expect(mocks.post).not.toHaveBeenCalled();
  });
  it("returns an existing request without duplicate notifications or emails", async () => {
    mocks.db.projectInvoiceRequest.findUnique.mockResolvedValue(record);
    expect((await requestProjectInvoice(pm, { projectId: project.id, triggerKey: "project", description: "Final project invoice", netAmount: "100", taxRate: "20" })).id).toBe(record.id);
    expect(mocks.db.projectInvoiceRequest.create).not.toHaveBeenCalled(); expect(mocks.db.notification.create).not.toHaveBeenCalled(); expect(mocks.email).not.toHaveBeenCalled();
  });
  it("blocks incomplete work and over-reserving the contract", async () => {
    mocks.db.project.findUniqueOrThrow.mockResolvedValueOnce({ ...project, status: "active" });
    const input = { projectId: project.id, triggerKey: "project", description: "Final project invoice", netAmount: "100", taxRate: "20" };
    await expect(requestProjectInvoice(pm, input)).rejects.toThrow("Complete");
    mocks.db.projectInvoiceRequest.aggregate.mockResolvedValue({ _sum: { netAmount: new Prisma.Decimal(950) } });
    await expect(requestProjectInvoice(pm, input)).rejects.toThrow("contract value");
  });
  it("restricts approval to the configured James administrator", async () => {
    await expect(approveProjectInvoice(pm, record.id, approval)).rejects.toThrow("Missing permission");
    await expect(approveProjectInvoice({ ...james, userId: "other-admin" }, record.id, approval)).rejects.toThrow("Missing permission");
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it("approves once, creates the Sage invoice and records its reference", async () => {
    expect(await approveProjectInvoice(james, record.id, approval)).toMatchObject({ status: "created", invoiceNumber: "SI-123" });
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post.mock.calls[0][2].sales_invoice).toMatchObject({ reference: `COS-${record.id}`, contact_id: "customer", currency_id: "GBP" });
    expect(mocks.db.projectInvoiceRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sageInvoiceId: "sage", status: "created" }) }));
  });
  it("blocks a duplicate approval race before posting", async () => {
    mocks.db.projectInvoiceRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(approveProjectInvoice(james, record.id, approval)).rejects.toThrow("already being processed");
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it("requires reconciliation after an uncertain response and never retries", async () => {
    mocks.post.mockRejectedValue(new Error("timeout"));
    expect(await approveProjectInvoice(james, record.id, approval)).toEqual({ status: "reconciliation_required" });
    expect(mocks.post).toHaveBeenCalledTimes(1);
    mocks.db.projectInvoiceRequest.findFirst.mockResolvedValue({ ...record, status: "reconciliation_required" });
    await expect(approveProjectInvoice(james, record.id, approval)).rejects.toThrow("already been reviewed");
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
  it("email failure cannot undo a confirmed invoice", async () => {
    mocks.email.mockRejectedValue(new Error("Email unavailable"));
    expect(await approveProjectInvoice(james, record.id, approval)).toMatchObject({ status: "created" });
  });
  it("rejects with a reason and notifies the requesting PM", async () => {
    await expect(rejectProjectInvoice(james, record.id, "")).rejects.toThrow("rejection reason");
    expect(await rejectProjectInvoice(james, record.id, "Please correct the amount")).toEqual({ status: "rejected" });
    expect(mocks.db.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: pm.userId, title: "Invoice request rejected" }) }));
  });
  it("does not post if work was reopened before approval", async () => {
    mocks.db.project.findUniqueOrThrow.mockResolvedValue({ ...project, status: "active" });
    await expect(approveProjectInvoice(james, record.id, approval)).rejects.toThrow("completed work has changed");
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it("rechecks the contract ceiling before approval if its value has changed", async () => {
    mocks.db.projectInvoiceRequest.aggregate.mockResolvedValue({ _sum: { netAmount: new Prisma.Decimal(1200) } });
    await expect(approveProjectInvoice(james, record.id, approval)).rejects.toThrow("exceed the project contract value");
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
