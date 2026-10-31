import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ sageConnection: { findUnique: vi.fn() }, sageInvoiceSnapshot: { groupBy: vi.fn(), findMany: vi.fn(), count: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/services/integrations/sage/sage-security", async (original) => ({ ...await original<typeof import("@/services/integrations/sage/sage-security")>(), sageConfig: () => ({ businessId: "current-business" }) }));
import { getSageOverview } from "@/services/integrations/sage/sage-service";
beforeEach(() => vi.resetAllMocks());
describe("Sage cached financial visibility", () => {
  it("never exposes a previous business's cached invoices after configuration changes", async () => {
    db.sageConnection.findUnique.mockResolvedValue({ businessId: "previous-business" });
    expect(await getSageOverview({ userId: "finance", permissions: ["finance.read_all"] })).toEqual({ connection: null, totals: [], invoices: [], count: 0 });
    expect(db.sageInvoiceSnapshot.findMany).not.toHaveBeenCalled();
    expect(db.sageInvoiceSnapshot.groupBy).not.toHaveBeenCalled();
  });
  it("checks finance permission before looking up a connection or cache", async () => {
    await expect(getSageOverview({ userId: "sales", permissions: [] })).rejects.toThrow("Missing permission");
    expect(db.sageConnection.findUnique).not.toHaveBeenCalled();
    expect(db.sageInvoiceSnapshot.findMany).not.toHaveBeenCalled();
  });
});
