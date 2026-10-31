import { beforeEach, describe, expect, it, vi } from "vitest";
import { canConvertLead, convertLead, leadConversionSchema } from "@/modules/crm/leads/lead-conversion-service";

const { tx } = vi.hoisted(() => ({ tx: {
  $queryRaw: vi.fn(),
  lead: { findFirst: vi.fn(), update: vi.fn() },
  account: { findFirst: vi.fn(), create: vi.fn() },
  contact: { findFirst: vi.fn(), create: vi.fn() },
  opportunity: { findFirst: vi.fn(), create: vi.fn() },
  opportunityStageHistory: { create: vi.fn() }, salesActivity: { updateMany: vi.fn() },
  auditLog: { create: vi.fn() }, notification: { create: vi.fn() }
} }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } }));
const context = { userId: "sales", role: "Sales", permissionLevel: "user", permissions: ["crm.lead.update", "crm.lead.read_own", "crm.opportunity.create", "crm.opportunity.read_own", "crm.account.create", "crm.account.read_own", "crm.contact.create", "crm.contact.read_own"] };
const input = { opportunityName: "Hotel network upgrade", accountName: "QA Hotel", firstName: "Hotel", lastName: "Manager", expectedCloseDate: "2026-12-01" };

describe("lead conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.lead.findFirst.mockResolvedValue({ id: "lead", ownerId: "sales", status: "qualified", estimatedValue: 10000, source: "referral" });
    tx.account.findFirst.mockResolvedValue(null);
    tx.contact.findFirst.mockResolvedValue(null);
    tx.account.create.mockResolvedValue({ id: "account" });
    tx.contact.create.mockResolvedValue({ id: "contact" });
    tx.opportunity.create.mockResolvedValue({ id: "opportunity" });
  });
  it("converts with owner, account/contact, financials, history, audit and notification", async () => {
    const result = await convertLead(context, "lead", input);
    expect(result).toMatchObject({ opportunityId: "opportunity", accountId: "account", contactId: "contact", alreadyConverted: false });
    expect(tx.$queryRaw).toHaveBeenCalledOnce();
    expect(tx.opportunity.create).toHaveBeenCalledWith({ data: expect.objectContaining({ ownerId: "sales", accountId: "account", primaryContactId: "contact", stage: "qualified", value: 10000, probabilityPercent: 10, weightedValue: 1000 }) });
    expect(tx.lead.update).toHaveBeenCalledWith({ where: { id: "lead" }, data: expect.objectContaining({ status: "converted", convertedOpportunityId: "opportunity" }) });
    expect(tx.salesActivity.updateMany).toHaveBeenCalled();
    expect(tx.opportunityStageHistory.create).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledTimes(4);
    expect(tx.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "sales" }) });
  });
  it("returns an existing permitted opportunity on retry without creating records", async () => {
    tx.lead.findFirst.mockResolvedValue({ id: "lead", ownerId: "sales", convertedOpportunityId: "existing" });
    tx.opportunity.findFirst.mockResolvedValue({ id: "existing", accountId: "account", primaryContactId: "contact" });
    expect(await convertLead(context, "lead", input)).toMatchObject({ opportunityId: "existing", alreadyConverted: true });
    expect(tx.account.create).not.toHaveBeenCalled();
    expect(tx.opportunity.create).not.toHaveBeenCalled();
  });
  it("does not convert another salesperson's lead", async () => {
    tx.lead.findFirst.mockResolvedValue({ id: "lead", ownerId: "someone-else" });
    await expect(convertLead(context, "lead", input)).rejects.toThrow("Missing permission");
    expect(tx.opportunity.create).not.toHaveBeenCalled();
  });
  it("does not infer access from being signed in", async () => {
    expect(canConvertLead({ userId: "staff", permissions: [] }, "staff")).toBe(false);
    await expect(convertLead({ userId: "staff", permissions: [] }, "lead", input)).rejects.toThrow("Missing permission");
  });
  it("reuses explicitly selected account/contact without duplicating them", async () => {
    const accountId = "00000000-0000-0000-0000-000000000001";
    const contactId = "00000000-0000-0000-0000-000000000002";
    tx.account.findFirst.mockResolvedValue({ id: accountId });
    tx.contact.findFirst.mockResolvedValue({ id: contactId });
    await convertLead(context, "lead", { ...input, accountId, contactId });
    expect(tx.account.create).not.toHaveBeenCalled();
    expect(tx.contact.create).not.toHaveBeenCalled();
    expect(tx.contact.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: expect.arrayContaining([expect.objectContaining({ accountId, id: contactId })]) } }));
  });
  it("rejects mismatched contacts before conversion", async () => {
    tx.account.findFirst.mockResolvedValue({ id: "account" });
    await expect(convertLead(context, "lead", { ...input, accountId: "00000000-0000-0000-0000-000000000001", contactId: "00000000-0000-0000-0000-000000000002" })).rejects.toThrow("belonging to this account");
    expect(tx.opportunity.create).not.toHaveBeenCalled();
  });
  it("requires selection instead of duplicating an existing account", async () => {
    tx.account.findFirst.mockResolvedValue({ id: "account" });
    await expect(convertLead(context, "lead", input)).rejects.toThrow("already exists");
    expect(tx.account.create).not.toHaveBeenCalled();
  });
  it.each(["invalid", "2026-02-30", "2026-13-01"])("rejects invalid dates: %s", (expectedCloseDate) => {
    expect(leadConversionSchema.safeParse({ ...input, expectedCloseDate }).success).toBe(false);
  });
});
