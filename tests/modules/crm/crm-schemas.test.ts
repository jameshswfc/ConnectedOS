import { describe, expect, it } from "vitest";
import { contactCreateSchema, opportunityCreateSchema, opportunityStageChangeSchema, salesActivityCreateSchema } from "@/modules/crm/schemas/crm-schemas";

describe("crm schemas", () => {
  it("accepts controlled relationship strength values", () => {
    const parsed = contactCreateSchema.parse({
      accountId: "00000000-0000-0000-0000-000000000001",
      firstName: "Alex",
      lastName: "Morgan",
      relationshipStrength: "preferred_partner"
    });

    expect(parsed.relationshipStrength).toBe("preferred_partner");
  });

  it("rejects numeric relationship strength values", () => {
    expect(() =>
      contactCreateSchema.parse({
        accountId: "00000000-0000-0000-0000-000000000001",
        firstName: "Alex",
        lastName: "Morgan",
        relationshipStrength: 4
      })
    ).toThrow();
  });

  it("accepts controlled opportunity type and source values", () => {
    const parsed = opportunityCreateSchema.parse({
      accountId: "00000000-0000-0000-0000-000000000001",
      opportunityName: "Network refresh",
      opportunityType: "converged_network_multiple_technologies",
      source: "existing_customer"
    });

    expect(parsed.opportunityType).toBe("converged_network_multiple_technologies");
    expect(parsed.source).toBe("existing_customer");
  });

  it("accepts lead-linked activities", () => {
    const parsed = salesActivityCreateSchema.parse({
      leadId: "00000000-0000-0000-0000-000000000002",
      activityType: "call",
      subject: "Qualify lead"
    });

    expect(parsed.leadId).toBe("00000000-0000-0000-0000-000000000002");
  });

  it("rejects invalid opportunity stage changes", () => {
    expect(() => opportunityStageChangeSchema.parse({ stage: "contract" })).toThrow();
  });
});
