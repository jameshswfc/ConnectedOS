import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: { account: { findFirst: vi.fn(), findMany: vi.fn() } } }));
vi.mock("@/services/audit/audit-service", () => ({ createAuditLog: vi.fn() }));
import { prisma } from "@/lib/prisma";
import { getAccount, listAccounts } from "@/modules/crm/accounts/account-service";

describe("customer linked-record visibility", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(prisma.account.findFirst).mockResolvedValue({ id: "account" } as never); });
  it("does not grant access to quotes, projects or pre-sales merely through account access", async () => {
    await getAccount({ userId: "viewer", permissions: ["crm.account.read_all"] }, "account");
    const query = vi.mocked(prisma.account.findFirst).mock.calls[0][0];
    expect(query?.include).toMatchObject({ quotes: { where: { id: { in: [] } } }, projects: { where: { id: { in: [] } } }, presalesRequests: { where: { id: { in: [] } } } });
    expect(query?.include?.owner).toEqual({ select: { id: true, displayName: true, email: true } });
  });
  it("scopes linked quotes and projects to the viewer's existing visibility rules", async () => {
    await getAccount({ userId: "sales", role: "Sales", permissions: ["crm.account.read_all", "quotes.read_own", "projects.read_assigned"] }, "account");
    const query = vi.mocked(prisma.account.findFirst).mock.calls[0][0];
    expect(query?.include).toMatchObject({ quotes: { where: { ownerId: "sales", deletedAt: null } }, projects: { where: { deletedAt: null, OR: expect.arrayContaining([{ projectManagerId: "sales" }]) } } });
  });
  it("protects child counts and excludes password fields from account owners", async () => {
    await listAccounts({ userId: "viewer", permissions: ["crm.account.read_all"] });
    const query = vi.mocked(prisma.account.findMany).mock.calls[0][0];
    expect(query?.include).toMatchObject({ _count: { select: { contacts: { where: { id: { in: [] } } } } } });
    expect(query?.include?.owner).toEqual({ select: { id: true, displayName: true, email: true } });
  });
});
