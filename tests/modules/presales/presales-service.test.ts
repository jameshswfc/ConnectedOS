import { OpportunityStage } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { PresalesDocumentFolderServiceStub } from "@/modules/presales/presales-document-folder-service";
import { buildPresalesOpportunityStageSync, formatPresalesRequestNumber, shouldAutoCreatePresalesForCreatedStage, shouldAutoCreatePresalesForStageChange } from "@/modules/presales/presales-service";

describe("pre-sales service helpers", () => {
  it("formats request numbers as PS-YYYY-0001", () => {
    expect(formatPresalesRequestNumber(2026, 1)).toBe("PS-2026-0001");
    expect(formatPresalesRequestNumber(2026, 42)).toBe("PS-2026-0042");
  });

  it("auto-creates only when an opportunity moves into Pre-Sales / Solution Design", () => {
    expect(shouldAutoCreatePresalesForStageChange(OpportunityStage.qualified, OpportunityStage.pre_sales_solution_design)).toBe(true);
    expect(shouldAutoCreatePresalesForStageChange(OpportunityStage.pre_sales_solution_design, OpportunityStage.pre_sales_solution_design)).toBe(false);
    expect(shouldAutoCreatePresalesForStageChange(OpportunityStage.qualified, OpportunityStage.proposal_sent)).toBe(false);
  });

  it("auto-creates when an opportunity is initially created in Pre-Sales / Solution Design", () => {
    expect(shouldAutoCreatePresalesForCreatedStage(OpportunityStage.pre_sales_solution_design)).toBe(true);
    expect(shouldAutoCreatePresalesForCreatedStage(OpportunityStage.qualified)).toBe(false);
    expect(shouldAutoCreatePresalesForCreatedStage(OpportunityStage.proposal_sent)).toBe(false);
  });

  it("builds the opportunity stage sync when a manual pre-sales request is created from another stage", () => {
    expect(buildPresalesOpportunityStageSync(OpportunityStage.qualified, 100000)).toMatchObject({
      fromStage: OpportunityStage.qualified,
      toStage: OpportunityStage.pre_sales_solution_design,
      probabilityPercent: 20,
      weightedValue: 20000
    });
    expect(buildPresalesOpportunityStageSync(OpportunityStage.pre_sales_solution_design, 100000)).toBeNull();
  });

  it("designs the future SharePoint folder path without Graph calls", () => {
    const folder = new PresalesDocumentFolderServiceStub().designFolder({
      requestNumber: "PS-2026-0001",
      accountName: "Hilton Manchester Airport",
      description: "WiFi Upgrade",
      year: 2026
    });

    expect(folder.folderPath).toBe("PreSales/2026/PS-2026-0001 Hilton Manchester Airport WiFi Upgrade");
    expect(folder.folderUrl).toBe("sharepoint://ConnectedHospitality/PreSales/2026/PS-2026-0001 Hilton Manchester Airport WiFi Upgrade");
  });
});
