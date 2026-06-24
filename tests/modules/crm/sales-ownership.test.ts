import { describe, expect, it } from "vitest";
import {
  canSelectSalesperson,
  filterActiveSalesUsers,
  resolveSalesRecordOwnerId,
  resolveSalespersonScope,
  salespersonActivityWhere,
  salespersonLeadWhere,
  salespersonOpportunityWhere
} from "@/modules/crm/sales/salesperson-service";

const activeSalesUsers = ["sales-1", "sales-2"];

describe("CRM sales ownership", () => {
  it("returns active Sales, Administrator and Business Operations users for salesperson dropdowns", () => {
    const users = filterActiveSalesUsers([
      { id: "sales-1", displayName: "Sam Sales", email: "sam@example.com", isActive: true, role: { name: "Sales" } },
      { id: "admin-1", displayName: "James Harrison", email: "james@connectedhsp.com", isActive: true, role: { name: "Administrator" } },
      { id: "ops-1", displayName: "Ops User", email: "ops@example.com", isActive: true, role: { name: "Business Operations" } },
      { id: "inactive-sales", displayName: "Inactive Sales", email: "inactive@example.com", isActive: false, role: { name: "Sales" } },
      { id: "deleted-sales", displayName: "Deleted Sales", email: "deleted@example.com", isActive: true, deletedAt: new Date(), role: { name: "Sales" } },
      { id: "field-1", displayName: "Field User", email: "field@example.com", isActive: true, role: { name: "Field Engineer" } }
    ]);

    expect(users).toEqual([
      { id: "sales-1", displayName: "Sam Sales", email: "sam@example.com" },
      { id: "admin-1", displayName: "James Harrison", email: "james@connectedhsp.com" },
      { id: "ops-1", displayName: "Ops User", email: "ops@example.com" }
    ]);
  });

  it("defaults Sales user created leads and opportunities to themselves", () => {
    expect(resolveSalesRecordOwnerId({ context: salesContext("sales-1"), activeSalespersonIds: activeSalesUsers })).toBe("sales-1");
  });

  it("prevents Sales users assigning records to another salesperson", () => {
    expect(() =>
      resolveSalesRecordOwnerId({
        context: salesContext("sales-1"),
        requestedOwnerId: "sales-2",
        activeSalespersonIds: activeSalesUsers
      })
    ).toThrow("salesperson assignment");
  });

  it("allows Administrator and Business Operations users to assign active selectable salespeople", () => {
    expect(resolveSalesRecordOwnerId({ context: adminContext(), requestedOwnerId: "sales-2", activeSalespersonIds: activeSalesUsers })).toBe("sales-2");
    expect(resolveSalesRecordOwnerId({ context: businessOpsContext(), requestedOwnerId: "sales-1", activeSalespersonIds: activeSalesUsers })).toBe("sales-1");
  });

  it("allows Administrator and Business Operations users to assign administrators and business operations users", () => {
    const activeSelectableUsers = [...activeSalesUsers, "admin-1", "ops-1"];

    expect(resolveSalesRecordOwnerId({ context: adminContext(), requestedOwnerId: "admin-1", activeSalespersonIds: activeSelectableUsers })).toBe("admin-1");
    expect(resolveSalesRecordOwnerId({ context: businessOpsContext(), requestedOwnerId: "ops-1", activeSalespersonIds: activeSelectableUsers })).toBe("ops-1");
  });

  it("rejects assignment to inactive or non-selectable users", () => {
    expect(() => resolveSalesRecordOwnerId({ context: adminContext(), requestedOwnerId: "field-1", activeSalespersonIds: activeSalesUsers })).toThrow("active salesperson");
  });

  it("allows only Administrator and Business Operations users to select salespeople", () => {
    expect(canSelectSalesperson(adminContext())).toBe(true);
    expect(canSelectSalesperson(businessOpsContext())).toBe(true);
    expect(canSelectSalesperson(salesContext("sales-1"))).toBe(false);
  });

  it("forces Sales pipeline and forecast filters to the logged-in salesperson", () => {
    expect(resolveSalespersonScope(salesContext("sales-1"), "sales-2")).toEqual({
      canSelect: false,
      selectedSalespersonId: "sales-1",
      ownerWhere: { ownerId: "sales-1" }
    });
  });

  it("lets Administrator and Business Operations users view all or selected salesperson records", () => {
    expect(resolveSalespersonScope(adminContext())).toEqual({ canSelect: true, selectedSalespersonId: undefined, ownerWhere: {} });
    expect(resolveSalespersonScope(businessOpsContext(), "sales-2")).toEqual({
      canSelect: true,
      selectedSalespersonId: "sales-2",
      ownerWhere: { ownerId: "sales-2" }
    });
  });

  it("builds owner filters for sales-owned record types", () => {
    expect(salespersonLeadWhere(salesContext("sales-1"))).toEqual({ ownerId: "sales-1" });
    expect(salespersonOpportunityWhere(businessOpsContext(), "sales-2")).toEqual({ ownerId: "sales-2" });
    expect(salespersonActivityWhere(adminContext())).toEqual({});
  });
});

function salesContext(userId: string) {
  return {
    userId,
    role: "Sales",
    permissionLevel: "user",
    permissions: ["crm.lead.read_own", "crm.opportunity.read_own", "crm.activity.read_own"]
  };
}

function adminContext() {
  return {
    userId: "admin",
    role: "Administrator",
    permissionLevel: "administrator",
    permissions: ["admin.users"]
  };
}

function businessOpsContext() {
  return {
    userId: "ops",
    role: "Business Operations",
    permissionLevel: "user",
    permissions: ["crm.lead.read_all", "crm.opportunity.read_all", "crm.activity.read_all"]
  };
}
