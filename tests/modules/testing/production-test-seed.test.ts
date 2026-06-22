import { describe, expect, it, vi } from "vitest";
import { buildProductionTestSeedDefinition, cleanupProductionTestData } from "@/modules/testing/production-test-seed";

describe("production test seed definition", () => {
  it("uses stable unique identifiers for idempotent seeding", () => {
    const definition = buildProductionTestSeedDefinition();
    expect(new Set(definition.accountNames).size).toBe(definition.accountNames.length);
    expect(new Set(definition.quoteNumbers).size).toBe(definition.quoteNumbers.length);
    expect(new Set(definition.requestNumbers).size).toBe(definition.requestNumbers.length);
    expect(new Set(definition.poNumbers).size).toBe(definition.poNumbers.length);
    expect(new Set(definition.invoiceNumbers).size).toBe(definition.invoiceNumbers.length);
    expect(new Set(definition.assetNumbers).size).toBe(definition.assetNumbers.length);
    expect(new Set(definition.helpdeskTicketNumbers).size).toBe(definition.helpdeskTicketNumbers.length);
    expect(new Set(definition.userEmails).size).toBe(definition.userEmails.length);
  });

  it("matches the reduced production-test record counts", () => {
    const definition = buildProductionTestSeedDefinition();
    expect(definition.userEmails).toHaveLength(5);
    expect(definition.accountNames).toHaveLength(2);
    expect(definition.quoteNumbers).toHaveLength(3);
    expect(definition.requestNumbers).toHaveLength(2);
    expect(definition.projectQuoteNumbers).toHaveLength(2);
    expect(definition.poNumbers).toHaveLength(2);
    expect(definition.invoiceNumbers).toHaveLength(2);
    expect(definition.assetNumbers).toHaveLength(3);
    expect(definition.helpdeskTicketNumbers).toHaveLength(2);
  });
});

describe("production test cleanup", () => {
  it("removes deterministic seeded schedule data without touching unrelated records and is idempotent", async () => {
    const buildPrisma = (withData: boolean) => ({
      user: {
        findMany: vi.fn().mockResolvedValue(withData ? [{ id: "user-1" }] : []),
        deleteMany: vi.fn().mockResolvedValue({ count: withData ? 1 : 0 })
      },
      account: {
        deleteMany: vi.fn().mockResolvedValue({ count: withData ? 1 : 0 })
      },
      contact: {
        findMany: vi.fn().mockResolvedValue(withData ? [{ id: "contact-1", accountId: "account-1" }] : []),
        deleteMany: vi.fn().mockResolvedValue({ count: withData ? 4 : 0 })
      },
      opportunity: {
        findMany: vi.fn().mockResolvedValue(withData ? [{ id: "opp-1", accountId: "account-1" }] : []),
        deleteMany: vi.fn().mockResolvedValue({ count: withData ? 1 : 0 })
      },
      quote: {
        findMany: vi.fn().mockResolvedValue(withData ? [{ id: "quote-1", accountId: "account-1" }] : []),
        deleteMany: vi.fn().mockResolvedValue({ count: withData ? 1 : 0 })
      },
      project: {
        findMany: vi.fn().mockResolvedValue(withData ? [{ id: "project-1", accountId: "account-1" }] : []),
        deleteMany: vi.fn().mockResolvedValue({ count: withData ? 1 : 0 })
      },
      resource: {
        findMany: vi.fn().mockResolvedValue(withData ? [{ id: "resource-1" }] : []),
        deleteMany: vi.fn().mockResolvedValue({ count: withData ? 1 : 0 })
      },
      helpdeskTicket: {
        findMany: vi.fn().mockResolvedValue(withData ? [{ id: "ticket-1", accountId: "account-1", projectId: "project-1", assetId: null }] : []),
        deleteMany: vi.fn().mockResolvedValue({ count: withData ? 1 : 0 })
      },
      purchaseOrder: {
        findMany: vi.fn().mockResolvedValue(withData ? [{ id: "po-1" }] : []),
        deleteMany: vi.fn().mockResolvedValue({ count: withData ? 1 : 0 })
      },
      customerInvoice: {
        findMany: vi.fn().mockResolvedValue(withData ? [{ id: "invoice-1" }] : []),
        deleteMany: vi.fn().mockResolvedValue({ count: withData ? 1 : 0 })
      },
      expenseClaim: {
        findMany: vi.fn().mockResolvedValue(withData ? [{ id: "claim-1" }] : []),
        deleteMany: vi.fn().mockResolvedValue({ count: withData ? 1 : 0 })
      },
      projectResourceAssignment: {
        deleteMany: vi.fn().mockResolvedValue({ count: withData ? 2 : 0 })
      },
      resourceBooking: {
        deleteMany: vi.fn().mockResolvedValue({ count: withData ? 2 : 0 })
      },
      helpdeskTicketComment: { deleteMany: vi.fn().mockResolvedValue({ count: withData ? 1 : 0 }) },
      leaveRequest: { deleteMany: vi.fn().mockResolvedValue({ count: withData ? 2 : 0 }) },
      expenseLine: { deleteMany: vi.fn().mockResolvedValue({ count: withData ? 2 : 0 }) },
      customerPayment: { deleteMany: vi.fn().mockResolvedValue({ count: withData ? 1 : 0 }) },
      supplierInvoice: { deleteMany: vi.fn().mockResolvedValue({ count: withData ? 1 : 0 }) },
      goodsReceipt: { deleteMany: vi.fn().mockResolvedValue({ count: withData ? 0 : 0 }) },
      purchaseOrderLine: { deleteMany: vi.fn().mockResolvedValue({ count: withData ? 2 : 0 }) },
      asset: { deleteMany: vi.fn().mockResolvedValue({ count: withData ? 3 : 0 }) },
      notification: { deleteMany: vi.fn().mockResolvedValue({ count: withData ? 4 : 0 }) },
      presalesDeliverable: { deleteMany: vi.fn().mockResolvedValue({ count: withData ? 2 : 0 }) },
      presalesRequest: { deleteMany: vi.fn().mockResolvedValue({ count: withData ? 2 : 0 }) },
      quoteLine: { deleteMany: vi.fn().mockResolvedValue({ count: withData ? 4 : 0 }) },
      quoteVersion: { deleteMany: vi.fn().mockResolvedValue({ count: withData ? 3 : 0 }) },
      opportunityStageHistory: { deleteMany: vi.fn().mockResolvedValue({ count: withData ? 3 : 0 }) },
      supplier: { updateMany: vi.fn().mockResolvedValue({ count: withData ? 2 : 0 }) }
    });

    const firstRunPrisma = buildPrisma(true);
    const firstSummary = await cleanupProductionTestData(firstRunPrisma as never);
    expect(firstSummary.bookingsRemoved).toBe(2);
    expect(firstSummary.projectAssignmentsRemoved).toBe(2);
    expect(firstSummary.resourcesRemoved).toBe(1);
    expect(firstRunPrisma.resource.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.any(Array)
      })
    }));
    expect(firstRunPrisma.account.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["account-1"] } }
    });

    const secondRunPrisma = buildPrisma(false);
    const secondSummary = await cleanupProductionTestData(secondRunPrisma as never);
    expect(secondSummary.bookingsRemoved).toBe(0);
    expect(secondSummary.projectAssignmentsRemoved).toBe(0);
    expect(secondSummary.resourcesRemoved).toBe(0);
    expect(secondSummary.usersRemoved).toBe(0);
  });
});
