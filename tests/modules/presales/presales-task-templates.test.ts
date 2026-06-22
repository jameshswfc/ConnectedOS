import { OpportunityType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildBomTaskDescription, filterNewPresalesTaskTemplates, getPresalesTaskTemplates, isBomTaskTitle } from "@/modules/presales/presales-task-templates";

describe("pre-sales task templates", () => {
  it("creates Guest WiFi tasks", () => {
    expect(getPresalesTaskTemplates(OpportunityType.guest_wifi).map((task) => task.title)).toEqual([
      "RFP documentation reviewed and questions raised",
      "Predictive Heatmap Created",
      "AP locations Created",
      "Network Diagram Created",
      "Port Matrix Created",
      "Bill of Materials Created"
    ]);
  });

  it("creates IPTV tasks", () => {
    expect(getPresalesTaskTemplates(OpportunityType.iptv_upgrade).map((task) => task.title)).toEqual([
      "RFP documentation reviewed and questions raised",
      "Network Diagram Created",
      "Port Matrix Created",
      "Scope for GUI, casting, apps and channels agreed",
      "Bill of Materials Created"
    ]);
  });

  it("creates MATV and TV Headend tasks", () => {
    expect(getPresalesTaskTemplates(OpportunityType.matv_tv_headend).map((task) => task.title)).toEqual([
      "RFP documentation reviewed and questions raised",
      "Channel List Created",
      "Dish rig drawing created",
      "Bill of Materials Created"
    ]);
  });

  it("creates Fibre and Broadband tasks", () => {
    expect(getPresalesTaskTemplates(OpportunityType.fibre_broadband).map((task) => task.title)).toEqual([
      "RFP documentation reviewed and questions raised",
      "Bandwidth requirements determined",
      "Quote for partner received",
      "Bill of materials created"
    ]);
  });

  it("creates Structured Cabling and Racks tasks", () => {
    expect(getPresalesTaskTemplates(OpportunityType.structured_cabling_racks).map((task) => task.title)).toEqual([
      "RFP documentation reviewed and questions raised",
      "Numbers and size of racks determined",
      "Number of cable runs and estimated lengths required",
      "Fibre runs determined",
      "Number of days for 2 man cabling team estimated",
      "Bill of materials created"
    ]);
  });

  it("creates PBX and Telephony tasks", () => {
    expect(getPresalesTaskTemplates(OpportunityType.pbx_telephony).map((task) => task.title)).toEqual([
      "RFP documentation reviewed and questions raised",
      "Number of IP extension determined",
      "Number of analogue extensions determined",
      "Number of handsets required",
      "IP network requirements",
      "On site or Cloud PBX required",
      "SIP trunks required",
      "Number porting required",
      "Bill of materials created"
    ]);
  });

  it("adds quote builder instructions to BoM tasks", () => {
    const bomTask = getPresalesTaskTemplates(OpportunityType.guest_wifi).find((task) => task.isBomTask);

    expect(bomTask?.description).toContain("Create or update the Bill of Materials in the connected Quote Builder.");
    expect(isBomTaskTitle("BoM Created")).toBe(true);
    expect(isBomTaskTitle("Bill of Materials Created")).toBe(true);
  });

  it("links BoM tasks to quotes when a quote exists", () => {
    expect(buildBomTaskDescription({ quoteId: "quote-1", opportunityId: "opp-1" })).toContain("Open Quote Builder: /quotes/quote-1");
  });

  it("prompts quote creation when no quote exists", () => {
    expect(buildBomTaskDescription({ opportunityId: "opp-1" })).toContain("Create Quote: /quotes/new?opportunityId=opp-1");
  });

  it("does not create duplicate templates for existing task titles", () => {
    const templates = getPresalesTaskTemplates(OpportunityType.matv_tv_headend);
    const next = filterNewPresalesTaskTemplates(templates, ["Channel List Created", "Bill of Materials Created"]);

    expect(next.map((task) => task.title)).toEqual(["RFP documentation reviewed and questions raised", "Dish rig drawing created"]);
  });

  it("creates no tasks when no opportunity type is available", () => {
    expect(getPresalesTaskTemplates(null)).toEqual([]);
    expect(getPresalesTaskTemplates(OpportunityType.other)).toEqual([]);
  });
});

