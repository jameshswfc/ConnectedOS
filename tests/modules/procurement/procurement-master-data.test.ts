import { beforeEach, describe, expect, it, vi } from "vitest";
import { listSuppliers, updateSupplier } from "@/modules/procurement/procurement-service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supplier: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("@/services/audit/audit-service", () => ({
  createAuditLog: vi.fn()
}));

describe("procurement master data", () => {
  const context = {
    userId: "ops-1",
    permissions: ["procurement.create", "procurement.read_all"],
    permissionLevel: "administrator",
    role: "Administrator"
  } as never;

  beforeEach(() => {
    vi.mocked(prisma.supplier.findMany).mockReset();
    vi.mocked(prisma.supplier.findFirst).mockReset();
    vi.mocked(prisma.supplier.update).mockReset();
  });

  it("filters inactive suppliers out of new PO supplier lists", async () => {
    vi.mocked(prisma.supplier.findMany).mockResolvedValueOnce([] as never);

    await listSuppliers(context, { activeOnly: true });

    expect(prisma.supplier.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([{ active: true }])
      })
    }));
  });

  it("updates supplier master data including account manager and categories", async () => {
    vi.mocked(prisma.supplier.findFirst).mockResolvedValueOnce({
      id: "supplier-1",
      name: "Hotel Tech Supply",
      active: true
    } as never);
    vi.mocked(prisma.supplier.update).mockResolvedValueOnce({
      id: "supplier-1",
      name: "Hotel Tech Supply",
      accountManager: "Jordan Buyer",
      categoriesSupplied: "Networking, IPTV",
      active: false
    } as never);

    const updated = await updateSupplier(context, "supplier-1", {
      accountManager: "Jordan Buyer",
      categoriesSupplied: "Networking, IPTV",
      active: false
    });

    expect(updated.accountManager).toBe("Jordan Buyer");
    expect(updated.categoriesSupplied).toBe("Networking, IPTV");
    expect(prisma.supplier.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "supplier-1" },
      data: expect.objectContaining({
        active: false
      })
    }));
  });
});
