import { describe, expect, it } from "vitest";
import { OpportunityStage } from "@prisma/client";
import { buildForecastMonths, buildPipelineColumns, type PipelineOpportunityCard } from "@/modules/crm/pipeline/pipeline-service";

const opportunities: PipelineOpportunityCard[] = [
  {
    id: "opportunity-1",
    opportunityName: "Hotel WiFi",
    stage: OpportunityStage.proposal_sent,
    accountName: "Grand Hotel",
    ownerName: "James",
    value: 100000,
    weightedValue: 30000,
    probabilityPercent: 30,
    expectedCloseDate: new Date("2026-07-15T00:00:00.000Z"),
    nextActivityDate: new Date("2026-06-10T00:00:00.000Z"),
    healthStatus: "green"
  },
  {
    id: "opportunity-2",
    opportunityName: "Network Refresh",
    stage: OpportunityStage.negotiation,
    accountName: "City Hotel",
    ownerName: "James",
    value: 50000,
    weightedValue: 25000,
    probabilityPercent: 50,
    expectedCloseDate: new Date("2026-07-28T00:00:00.000Z"),
    nextActivityDate: null,
    healthStatus: "amber"
  }
];

describe("pipeline service helpers", () => {
  it("groups opportunities into stage columns", () => {
    const columns = buildPipelineColumns(opportunities);
    const proposalColumn = columns.find((column) => column.stage === OpportunityStage.proposal_sent);

    expect(proposalColumn?.label).toBe("Proposal Sent");
    expect(proposalColumn?.opportunities).toHaveLength(1);
    expect(proposalColumn?.unweightedValue).toBe(100000);
    expect(proposalColumn?.weightedValue).toBe(30000);
  });

  it("groups forecast deals by expected close month", () => {
    const months = buildForecastMonths(opportunities);

    expect(months).toHaveLength(1);
    expect(months[0]).toMatchObject({
      key: "2026-07",
      dealCount: 2,
      unweightedValue: 150000,
      weightedValue: 55000
    });
  });

  it("groups moved opportunities under their new stage", () => {
    const movedOpportunity = { ...opportunities[0], stage: OpportunityStage.negotiation, probabilityPercent: 50, weightedValue: 50000 };
    const columns = buildPipelineColumns([movedOpportunity]);

    expect(columns.find((column) => column.stage === OpportunityStage.proposal_sent)?.opportunities).toHaveLength(0);
    expect(columns.find((column) => column.stage === OpportunityStage.negotiation)?.opportunities).toHaveLength(1);
  });
});
