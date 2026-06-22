import { describe, expect, it } from "vitest";
import { buildDashboardOpportunityWhere } from "@/modules/crm/dashboard/dashboard-service";
import { activityVisibilityWhere, accountVisibilityWhere, assertCanEditOwnedCrmRecord, opportunityVisibilityWhere } from "@/modules/crm/crm-permissions";
import { CLOSED_OPPORTUNITY_STAGES } from "@/modules/crm/opportunities/opportunity-stages";
import { buildPipelineOpportunityWhere } from "@/modules/crm/pipeline/pipeline-service";

describe("crm permissions", () => {
  it("scopes own account visibility to the current user", () => {
    expect(accountVisibilityWhere({ userId: "user-1", permissions: ["crm.account.read_own"] })).toEqual({
      deletedAt: null,
      ownerId: "user-1"
    });
  });

  it("allows all opportunity visibility when the user has read_all", () => {
    expect(opportunityVisibilityWhere({ userId: "user-1", permissions: ["crm.opportunity.read_all"] })).toEqual({
      deletedAt: null
    });
  });

  it("scopes sales users to their own opportunities", () => {
    expect(opportunityVisibilityWhere({ userId: "sales-user", permissions: ["crm.opportunity.read_own"] })).toEqual({
      deletedAt: null,
      ownerId: "sales-user"
    });
  });

  it("scopes sales users to their own activities", () => {
    expect(activityVisibilityWhere({ userId: "sales-user", permissions: ["crm.activity.read_own"] })).toEqual({
      deletedAt: null,
      ownerId: "sales-user"
    });
  });

  it("allows admin, director and sales manager style read_all access to all opportunities", () => {
    for (const permissions of [["admin.users"], ["crm.opportunity.read_all"]]) {
      expect(opportunityVisibilityWhere({ userId: "manager", permissions })).toEqual({ deletedAt: null });
    }
  });

  it("keeps pipeline queries scoped by opportunity visibility", () => {
    expect(buildPipelineOpportunityWhere({ userId: "sales-user", permissions: ["crm.opportunity.read_own"] }, false)).toEqual({
      AND: [{ deletedAt: null, ownerId: "sales-user" }, {}]
    });
  });

  it("keeps forecast queries scoped and excludes closed stages", () => {
    expect(buildPipelineOpportunityWhere({ userId: "sales-user", permissions: ["crm.opportunity.read_own"] }, true)).toEqual({
      AND: [{ deletedAt: null, ownerId: "sales-user" }, { status: "open", stage: { notIn: CLOSED_OPPORTUNITY_STAGES } }]
    });
  });

  it("keeps dashboard totals scoped and excludes closed stages", () => {
    expect(buildDashboardOpportunityWhere({ userId: "sales-user", permissions: ["crm.opportunity.read_own"] })).toEqual({
      AND: [{ deletedAt: null, ownerId: "sales-user" }, { status: "open", stage: { notIn: CLOSED_OPPORTUNITY_STAGES } }]
    });
  });

  it("allows standard users to edit assigned records only", () => {
    expect(() => assertCanEditOwnedCrmRecord({ userId: "user-1", permissions: ["crm.opportunity.update"], permissionLevel: "user" }, "user-1")).not.toThrow();
    expect(() => assertCanEditOwnedCrmRecord({ userId: "user-1", permissions: ["crm.opportunity.update"], permissionLevel: "user" }, "user-2")).toThrow("assigned record access");
  });

  it("allows administrators to edit all records", () => {
    expect(() => assertCanEditOwnedCrmRecord({ userId: "admin", permissions: [], permissionLevel: "administrator" }, "user-2")).not.toThrow();
  });

  it("forces Sales role pipeline queries to the logged-in salesperson even with read_all permissions", () => {
    expect(buildPipelineOpportunityWhere({ userId: "sales-user", role: "Sales", permissions: ["crm.opportunity.read_all"] }, true)).toEqual({
      AND: [{ deletedAt: null }, { ownerId: "sales-user" }, { status: "open", stage: { notIn: CLOSED_OPPORTUNITY_STAGES } }]
    });
  });

  it("allows Business Operations to filter dashboard totals by salesperson", () => {
    expect(buildDashboardOpportunityWhere({ userId: "ops", role: "Business Operations", permissions: ["crm.opportunity.read_all"] }, "sales-user")).toEqual({
      AND: [{ deletedAt: null }, { ownerId: "sales-user" }, { status: "open", stage: { notIn: CLOSED_OPPORTUNITY_STAGES } }]
    });
  });
});
