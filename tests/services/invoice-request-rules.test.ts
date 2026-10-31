import { describe, expect, it } from "vitest";
import { canRequestProjectInvoice, invoiceAmounts, invoiceApprovalSchema, invoiceRequestSchema, invoiceTriggerOptions } from "@/modules/finance/invoice-request-rules";

describe("project invoice requests", () => {
  it("only allows assigned PM, Business Operations and administrators to request", () => {
    const project = { projectManagerId: "pm" };
    expect(canRequestProjectInvoice({ userId: "pm", role: "Project Manager", permissions: ["projects.update"] }, project)).toBe(true);
    expect(canRequestProjectInvoice({ userId: "other", role: "Project Manager", permissions: ["projects.update"] }, project)).toBe(false);
    expect(canRequestProjectInvoice({ userId: "e", role: "Project Engineer", permissions: ["projects.update"] }, project)).toBe(false);
    expect(canRequestProjectInvoice({ userId: "bo", role: "Business Operations", permissions: ["projects.update"] }, project)).toBe(true);
    expect(canRequestProjectInvoice({ userId: "j", permissionLevel: "administrator", permissions: [] }, project)).toBe(true);
  });
  it("offers completed milestones, completed stages and completed project only", () => {
    const project = { status: "active", milestones: [{ id: "1", title: "Kick off", status: "complete" }, { id: "2", title: "UAT", status: "in_progress" }], stageGates: [{ id: "3", stage: "initiation", status: "complete" }] };
    expect(invoiceTriggerOptions(project).map((r) => r.key)).toEqual(["milestone:1", "stage:3"]);
    expect(invoiceTriggerOptions({ ...project, status: "completed" })[0].key).toBe("project");
  });
  it("calculates exact decimal tax and totals", () => {
    const result = invoiceAmounts("100.03", "20");
    expect(result.taxAmount.toFixed(2)).toBe("20.01"); expect(result.totalAmount.toFixed(2)).toBe("120.04");
    expect(invoiceAmounts("10.10", "0").totalAmount.toFixed(2)).toBe("10.10");
  });
  it("rejects negative amounts and fractional pennies", () => {
    const valid = { projectId: "11111111-1111-4111-8111-111111111111", triggerKey: "project", description: "Completion invoice", netAmount: "100.00", taxRate: "20" };
    expect(invoiceRequestSchema.safeParse(valid).success).toBe(true);
    for (const netAmount of ["-1", "0", "1.001", "NaN"]) expect(invoiceRequestSchema.safeParse({ ...valid, netAmount }).success).toBe(false);
  });
  it("requires customer confirmation and valid invoice/due dates", () => {
    const data = { contactId: "customer", customerConfirmed: true, date: "2026-10-31", dueDate: "2026-11-30" };
    expect(invoiceApprovalSchema.safeParse(data).success).toBe(true);
    expect(invoiceApprovalSchema.safeParse({ ...data, customerConfirmed: false }).success).toBe(false);
    expect(invoiceApprovalSchema.safeParse({ ...data, dueDate: "2026-10-01" }).success).toBe(false);
    expect(invoiceApprovalSchema.safeParse({ ...data, date: "2026-02-31" }).success).toBe(false);
  });
});
