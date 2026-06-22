import { describe, expect, it } from "vitest";
import { calculateOpportunityHealth, matchesHealthFilter } from "@/modules/crm/opportunities/opportunity-health";

const now = new Date("2026-06-09T12:00:00.000Z");

describe("opportunity health scoring", () => {
  it("returns green when action, close date and recent activity are healthy", () => {
    expect(calculateOpportunityHealth({
      nextActionDate: "2026-06-12T10:00:00.000Z",
      expectedCloseDate: "2026-07-01T00:00:00.000Z",
      lastActivityAt: "2026-06-08T10:00:00.000Z"
    }, now)).toBe("green");
  });

  it("returns amber for seven to fourteen days without activity", () => {
    expect(calculateOpportunityHealth({
      nextActionDate: "2026-06-15T10:00:00.000Z",
      expectedCloseDate: "2026-07-01T00:00:00.000Z",
      lastActivityAt: "2026-06-01T10:00:00.000Z"
    }, now)).toBe("amber");
  });

  it("returns amber when the next action is due within 48 hours", () => {
    expect(calculateOpportunityHealth({
      nextActionDate: "2026-06-10T10:00:00.000Z",
      expectedCloseDate: "2026-07-01T00:00:00.000Z",
      lastActivityAt: "2026-06-08T10:00:00.000Z"
    }, now)).toBe("amber");
  });

  it("returns red for neglected or overdue opportunities", () => {
    expect(calculateOpportunityHealth({
      nextActionDate: "2026-06-15T10:00:00.000Z",
      expectedCloseDate: "2026-07-01T00:00:00.000Z",
      lastActivityAt: "2026-05-20T10:00:00.000Z"
    }, now)).toBe("red");

    expect(calculateOpportunityHealth({
      nextActionDate: "2026-06-08T10:00:00.000Z",
      expectedCloseDate: "2026-07-01T00:00:00.000Z",
      lastActivityAt: "2026-06-08T10:00:00.000Z"
    }, now)).toBe("red");
  });

  it("includes pre-sales SLA signals in health scoring", () => {
    expect(calculateOpportunityHealth({
      nextActionDate: "2026-06-15T10:00:00.000Z",
      expectedCloseDate: "2026-07-01T00:00:00.000Z",
      lastActivityAt: "2026-06-08T10:00:00.000Z",
      presalesRequests: [{ status: "assigned", slaStatus: "overdue", internalDeadline: "2026-06-08T00:00:00.000Z" }]
    }, now)).toBe("red");
  });

  it("matches selected health filters", () => {
    expect(matchesHealthFilter("green", [])).toBe(true);
    expect(matchesHealthFilter("green", ["red", "amber"])).toBe(false);
    expect(matchesHealthFilter("red", ["red", "amber"])).toBe(true);
  });
});
