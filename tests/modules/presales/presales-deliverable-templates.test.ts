import { OpportunityType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  buildBomDeliverableDescription,
  calculateDeliverableProgress,
  filterNewPresalesDeliverableTemplates,
  getExpectedPresalesDeliverables
} from "@/modules/presales/presales-deliverable-templates";

describe("pre-sales deliverable templates", () => {
  it("creates Guest WiFi checklist deliverables", () => {
    expect(getExpectedPresalesDeliverables(OpportunityType.guest_wifi).map((deliverable) => deliverable.title)).toEqual([
      "RFP documentation reviewed and questions raised",
      "Predictive Heatmap Created",
      "AP locations Created",
      "Network Diagram Created",
      "Port Matrix Created",
      "Bill of Materials Created"
    ]);
  });

  it("creates IPTV checklist deliverables", () => {
    expect(getExpectedPresalesDeliverables(OpportunityType.iptv_upgrade).map((deliverable) => deliverable.title)).toEqual([
      "RFP documentation reviewed and questions raised",
      "Network Diagram Created",
      "Port Matrix Created",
      "Scope for GUI, casting, apps and channels agreed",
      "Bill of Materials Created"
    ]);
  });

  it("creates MATV and TV Headend checklist deliverables", () => {
    expect(getExpectedPresalesDeliverables(OpportunityType.matv_tv_headend).map((deliverable) => deliverable.title)).toEqual([
      "RFP documentation reviewed and questions raised",
      "Channel List Created",
      "Dish rig drawing created",
      "Bill of Materials Created"
    ]);
  });

  it("creates Fibre and Broadband checklist deliverables", () => {
    expect(getExpectedPresalesDeliverables(OpportunityType.fibre_broadband).map((deliverable) => deliverable.title)).toEqual([
      "RFP documentation reviewed and questions raised",
      "Bandwidth requirements determined",
      "Quote for partner received",
      "Bill of Materials Created"
    ]);
  });

  it("creates Structured Cabling and Racks checklist deliverables", () => {
    expect(getExpectedPresalesDeliverables(OpportunityType.structured_cabling_racks).map((deliverable) => deliverable.title)).toEqual([
      "RFP documentation reviewed and questions raised",
      "Numbers and size of racks determined",
      "Number of cable runs and estimated lengths required",
      "Fibre runs determined",
      "Number of days for 2 man cabling team estimated",
      "Bill of Materials Created"
    ]);
  });

  it("creates PBX and Telephony checklist deliverables", () => {
    expect(getExpectedPresalesDeliverables(OpportunityType.pbx_telephony).map((deliverable) => deliverable.title)).toEqual([
      "RFP documentation reviewed and questions raised",
      "Number of IP extensions determined",
      "Number of analogue extensions determined",
      "Number of handsets required",
      "IP network requirements determined",
      "On site or Cloud PBX required",
      "SIP trunks required",
      "Number porting required",
      "Bill of Materials Created"
    ]);
  });

  it("adds quote builder guidance to BoM deliverables", () => {
    const bomDeliverable = getExpectedPresalesDeliverables(OpportunityType.guest_wifi).find((deliverable) => deliverable.isBomDeliverable);

    expect(bomDeliverable?.description).toContain("Create or update the Bill of Materials in the connected Quote Builder.");
    expect(buildBomDeliverableDescription({ quoteId: "quote-1", opportunityId: "opp-1" })).toContain("Open Quote Builder: /quotes/quote-1");
    expect(buildBomDeliverableDescription({ opportunityId: "opp-1" })).toContain("Create Quote: /quotes/new?opportunityId=opp-1");
  });

  it("does not duplicate existing deliverable titles", () => {
    const templates = getExpectedPresalesDeliverables(OpportunityType.matv_tv_headend);
    const next = filterNewPresalesDeliverableTemplates(templates, ["Channel List Created", "Bill of Materials Created"]);

    expect(next.map((deliverable) => deliverable.title)).toEqual(["RFP documentation reviewed and questions raised", "Dish rig drawing created"]);
  });

  it("calculates deliverable completion progress", () => {
    expect(calculateDeliverableProgress([
      { documentId: "document-1", status: "complete" },
      { documentId: null, status: "open" },
      { documentId: null, status: "not_required" }
    ])).toEqual({
      required: 3,
      uploaded: 1,
      complete: 2,
      percent: 67
    });
  });

  it("treats requests without expected deliverables as complete progress", () => {
    expect(calculateDeliverableProgress([])).toEqual({
      required: 0,
      uploaded: 0,
      complete: 0,
      percent: 100
    });
  });
});
