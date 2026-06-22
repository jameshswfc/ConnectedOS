import { ProjectIssueActionStatus, ProjectRagStatus, ProjectStatus, ProjectTaskStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildChangeRequestContent, buildGanttPdfContent, buildImplementationDocumentContent, buildWeeklyUpdateContent, generateProjectGanttPdfBuffer } from "@/modules/projects/project-export-service";
import { displayLabel, generateProjectPdfBuffer, projectPdfTemplateUsesReadableBodyText, trimTrailingBlankPageCounts } from "@/modules/projects/project-export-template";

describe("project export service", () => {
  it("builds weekly update content with the required governance sections", () => {
    const content = buildWeeklyUpdateContent({
      projectNumber: "PRJ-2026-0001",
      name: "Hotel WiFi Upgrade",
      status: ProjectStatus.active,
      ragStatus: ProjectRagStatus.amber,
      projectType: "guest_wifi",
      account: { name: "Example Hotel" },
      projectManager: { displayName: "Pat PM" },
      startDate: new Date("2026-06-01"),
      targetEndDate: new Date("2026-07-31"),
      quote: { contact: { firstName: "Jamie", lastName: "Guest", email: "jamie@example.com" } },
      opportunity: { owner: { displayName: "Sales Owner" } },
      forms: [{ formType: "change_request", title: "CR-1", content: { summary: "Extra cabling", status: "pending_review", valueImpact: 1200, resourceDayImpact: 2 } }],
      tasks: [
        { title: "Complete survey", status: ProjectTaskStatus.complete, description: "Survey signed off", assignedTo: { displayName: "Engineer One" }, owner: null, startDate: new Date("2026-06-01"), endDate: new Date("2026-06-02") },
        { title: "Install APs", status: ProjectTaskStatus.in_progress, description: null, assignedTo: { displayName: "Engineer Two" }, owner: null, startDate: new Date("2026-06-10"), endDate: new Date("2999-06-12") },
        { title: "Close blockers", status: ProjectTaskStatus.blocked, description: null, assignedTo: null, owner: { displayName: "PM Owner" }, startDate: new Date("2026-05-01"), endDate: new Date("2026-05-02") }
      ],
      issueActions: [
        {
          type: "issue",
          title: "Access required",
          status: ProjectIssueActionStatus.open,
          priority: "high",
          owner: { displayName: "Owner One" },
          dueDate: new Date("2026-06-15"),
          resolution: null
        }
      ],
      milestones: [
        { title: "Customer Kick Off", status: "complete", milestoneDate: new Date("2026-06-01"), completedAt: new Date("2026-06-01"), description: null }
      ],
      stageGates: [
        { stage: "initiation", status: "complete", notes: null }
      ],
      resourceAssignments: [
        {
          user: { displayName: "Engineer One" },
          role: "field_engineer",
          startDate: new Date("2026-06-10"),
          endDate: new Date("2026-06-12"),
          scheduledDays: 3,
          usedDays: 1
        }
      ],
      totalResourceDaysBudget: 10,
      totalResourceDaysScheduled: 3,
      totalResourceDaysUsed: 1,
      outstandingAmount: 5000,
      commercialValue: 25000,
      description: "Hotel-wide refresh",
      scopeSummary: "Refresh WiFi infrastructure"
    } as never, {
      pmSummary: "Progress is steady.",
      reportingPeriodStart: "2026-06-01",
      reportingPeriodEnd: "2026-06-07",
      reportNumber: "WSR-001",
      currentStage: "Delivery",
      resourceDaysUsedThisWeek: 1,
      budgetSummary: "Budget remains controlled.",
      risksBlockers: "Awaiting access.",
      nextWeekPlan: "Continue deployment.",
      customerReadinessCommentary: "Customer access windows confirmed.",
      operationalImpactCommentary: "No guest disruption expected.",
      approvalDistributionNotes: "Internal review complete.",
      customerActionsRequired: "Confirm comms room access."
    });

    expect(content.title).toBe("Weekly Status Report");
    expect(content.footerLabel).toContain("Controlled Project Document");
    expect(content.sections.map((section) => section.title)).toEqual([
      "Project Summary",
      "Section 1 - Executive Summary",
      "Section 2 - Project Health Dashboard",
      "Section 3 - Progress This Week",
      "Section 4 - Planned Activities Next Week",
      "Section 5 - Milestone Status",
      "Section 6 - Risks and Issues Summary",
      "Section 7 - Changes and Variations Summary",
      "Section 8 - Commercial Summary",
      "Section 9 - Customer Decisions Required",
      "Section 10 - Resource and Site Access Summary",
      "Section 11 - Hospitality Operational Impact",
      "Section 12 - Brand, Compliance and Technical Assurance",
      "Section 13 - Project Manager Commentary",
      "Section 14 - Approval and Distribution"
    ]);
    expect(content.sections[1].body).toContain("Progress is steady.");
    expect(content.sections[2].tables?.[0].rows.some((row) => row[0] === "Overall Project")).toBe(true);
    expect(content.sections[4].tables?.[0].rows.some((row) => String(row[0]).includes("Install APs"))).toBe(true);
    expect(content.sections[5].tables?.[0].rows.some((row) => String(row[0]).includes("Customer Kick Off"))).toBe(true);
    expect(content.sections[6].tables?.[1].rows.some((row) => String(row[0]).includes("Access required"))).toBe(true);
    expect(content.sections[14].startOnNewPage).toBe(true);
    expect(content.sections[4].tables?.[1].title).toBe("Dependency / Schedule Notes");
  });

  it("uses PM-entered weekly report rows and clean empty-state statements", () => {
    const content = buildWeeklyUpdateContent({
      projectNumber: "PRJ-2026-0005",
      name: "Hotel WiFi Upgrade",
      status: ProjectStatus.active,
      ragStatus: ProjectRagStatus.green,
      projectType: "guest_wifi",
      account: { name: "Example Hotel" },
      projectManager: null,
      startDate: new Date("2026-06-01"),
      targetEndDate: new Date("2026-07-31"),
      quote: { quoteNumber: "Q-2026-0001", contact: { firstName: "Jamie", lastName: "Guest", email: "jamie@example.com" } },
      opportunity: { owner: { displayName: "Sales Owner" } },
      forms: [],
      tasks: [],
      issueActions: [],
      milestones: [],
      stageGates: [],
      resourceAssignments: [],
      totalResourceDaysBudget: 0,
      totalResourceDaysScheduled: 0,
      totalResourceDaysUsed: 0,
      outstandingAmount: 0,
      commercialValue: 25000,
      description: "Hotel-wide refresh",
      scopeSummary: "Refresh WiFi infrastructure"
    } as never, {
      customerDecisionRows: [
        ["Approve outage window", "Customer Team", "2026-06-14", "Deployment start slips", "open"]
      ],
      connectedHospitalityResourcesStatus: "Green",
      connectedHospitalityResourcesCommentary: "Engineer coverage confirmed.",
      operationalImpactRows: [
        ["Guest Rooms", "No impact", "No impact expected", "Monitor access windows"]
      ],
      brandComplianceRows: [
        ["Brand Standard Compliance", "Amber", "Awaiting final customer review."]
      ],
      approvalRows: [],
      distributionRows: []
    });

    const customerDecisionSection = content.sections.find((section) => section.title === "Section 9 - Customer Decisions Required");
    expect(customerDecisionSection?.body).toBeUndefined();
    expect(customerDecisionSection?.tables?.[0].columns).toEqual(["Decision / Action Required", "Owner", "Required By", "Impact if Delayed", "Status"]);
    expect(customerDecisionSection?.tables?.[0].rows[0]).toEqual(["Approve outage window", "Customer Team", "2026-06-14", "Deployment start slips", "open"]);

    const approvalSection = content.sections.find((section) => section.title === "Section 14 - Approval and Distribution");
    expect(JSON.stringify(approvalSection)).not.toContain("Everyone");
    expect(JSON.stringify(approvalSection)).not.toContain("Unassigned");

    const resourceSection = content.sections.find((section) => section.title === "Section 10 - Resource and Site Access Summary");
    expect(resourceSection?.tables?.[0].rows[0]).toEqual(["Connected Hospitality Resources", "Green", "Engineer coverage confirmed."]);
  });

  it("renders clean weekly report empty-section statements instead of fake placeholder rows", () => {
    const content = buildWeeklyUpdateContent({
      projectNumber: "PRJ-2026-0006",
      name: "Hotel IPTV Upgrade",
      status: ProjectStatus.active,
      ragStatus: ProjectRagStatus.amber,
      projectType: "iptv",
      account: { name: "Example Hotel" },
      projectManager: null,
      startDate: new Date("2026-06-01"),
      targetEndDate: new Date("2026-07-31"),
      quote: { quoteNumber: "Q-2026-0002", contact: null },
      opportunity: { owner: { displayName: "Sales Owner" } },
      forms: [],
      tasks: [],
      issueActions: [],
      milestones: [],
      stageGates: [],
      resourceAssignments: [],
      totalResourceDaysBudget: 0,
      totalResourceDaysScheduled: 0,
      totalResourceDaysUsed: 0,
      outstandingAmount: 0,
      commercialValue: 12000,
      description: null,
      scopeSummary: null
    } as never, {});

    expect(content.sections.find((section) => section.title === "Section 9 - Customer Decisions Required")?.body).toBe("No customer decisions required this reporting period.");
    expect(content.sections.find((section) => section.title === "Section 10 - Resource and Site Access Summary")?.body).toBe("No resource or site access exceptions reported this period.");
    expect(content.sections.find((section) => section.title === "Section 11 - Hospitality Operational Impact")?.body).toBe("No known hospitality operational impact this period.");
    expect(content.sections.find((section) => section.title === "Section 12 - Brand, Compliance and Technical Assurance")?.body).toBe("No brand, compliance or technical assurance exceptions reported this period.");
  });

  it("formats display labels for weekly export enums", () => {
    expect(displayLabel("not_started")).toBe("Not Started");
    expect(displayLabel("in_progress")).toBe("In Progress");
    expect(displayLabel("green")).toBe("Green");
  });

  it("uses a readable standard project PDF template", async () => {
    expect(projectPdfTemplateUsesReadableBodyText()).toBe(true);
    const buffer = await generateProjectPdfBuffer({
      id: "project-1",
      projectNumber: "PRJ-2026-0002",
      name: "Export Smoke Test",
      account: { name: "Example Hotel" }
    }, "Weekly Update", {
      "Project details": "PRJ-2026-0002 - Export Smoke Test",
      "PM written project management summary": "Readable body text on white background."
    });
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("trims trailing blank page markers from export rendering", () => {
    expect(trimTrailingBlankPageCounts([4, 3, 0, 0])).toEqual([4, 3]);
    expect(trimTrailingBlankPageCounts([2])).toEqual([2]);
  });

  it("builds gantt PDF content with project details, tasks and milestones", () => {
    const content = buildGanttPdfContent({
      projectNumber: "PRJ-2026-0005",
      name: "Gantt Export",
      account: { name: "Example Hotel" },
      projectManager: { displayName: "Pat PM" },
      startDate: new Date("2026-06-01"),
      targetEndDate: new Date("2026-06-30"),
      baselineStartDate: new Date("2026-06-01"),
      baselineEndDate: new Date("2026-06-25"),
      tasks: [
        { id: "task-1", title: "Customer Kick Off Call", assignedTo: { displayName: "Engineer One" }, startDate: new Date("2026-06-07"), endDate: new Date("2026-06-07"), status: "complete", predecessors: [], successors: [] }
      ],
      milestones: [
        { id: "milestone-1", title: "Customer Kick Off", milestoneDate: new Date("2026-06-07"), status: "complete" }
      ],
      resourceAssignments: []
    } as never);

    expect(content.title).toBe("Project Gantt");
    expect(content.sections.find((section) => section.title === "Gantt Timeline")?.tables?.[0].rows.some((row) => String(row[0]).includes("Customer Kick Off Call"))).toBe(true);
    expect(content.sections.find((section) => section.title === "Gantt Timeline")?.tables?.[0].rows.some((row) => String(row[0]).includes("Milestone: Customer Kick Off"))).toBe(true);
  });

  it("generates a visual gantt PDF with week columns, tasks and milestones", async () => {
    const buffer = await generateProjectGanttPdfBuffer({
      id: "project-gantt",
      projectNumber: "PRJ-2026-0010",
      name: "Visual Gantt Export",
      account: { name: "Example Hotel" },
      projectManager: { displayName: "Pat PM" },
      startDate: new Date("2026-06-01"),
      targetEndDate: new Date("2026-07-15"),
      baselineStartDate: new Date("2026-06-01"),
      baselineEndDate: new Date("2026-07-01"),
      tasks: [
        { id: "task-1", title: "Customer Kick Off Call", assignedTo: { displayName: "Engineer One" }, startDate: new Date("2026-06-07"), endDate: new Date("2026-06-10"), status: "in_progress", predecessors: [], successors: [] },
        { id: "task-2", title: "Deployment Commenced", assignedTo: { displayName: "Engineer Two" }, startDate: new Date("2026-06-24"), endDate: new Date("2026-06-25"), status: "not_started", predecessors: [{ predecessorTaskId: "task-1" }], successors: [] }
      ],
      milestones: [
        { id: "milestone-1", title: "Customer Kick Off", milestoneDate: new Date("2026-06-07"), status: "complete" }
      ],
      resourceAssignments: []
    } as never);

    const text = buffer.toString("latin1");
    const decodedText = decodePdfHexText(text);
    const decodedCompact = decodedText.replace(/\s+/g, "");
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(text).toContain("Project Gantt");
    expect(decodedCompact).toContain("CustomerKickOffCall");
    expect(decodedCompact).toContain("CustomerKickOff");
    expect(decodedCompact).toContain("WC01Jun");
    expect(countPdfPages(buffer)).toBeGreaterThanOrEqual(1);
  });

  it("builds change request content with commercial, resource and approval sections", () => {
    const content = buildChangeRequestContent({
      projectNumber: "PRJ-2026-0003",
      name: "Hotel IPTV Upgrade",
      ragStatus: ProjectRagStatus.green,
      account: { name: "Example Hotel", addressLine1: "1 High Street", addressLine2: null, city: "London", county: null, postcode: "SW1A 1AA", country: "UK" },
      projectManager: { displayName: "Pat PM" },
      quote: { quoteNumber: "Q-2026-0009" },
      quoteVersion: { versionNumber: 2 }
    } as never, {
      quoteNumber: "Q-2026-0009",
      quoteVersionNumber: 2,
      oldTotal: 10000,
      newTotal: 12500,
      difference: 2500,
      resourceDayImpact: 3,
      hardwareItems: [{ sku: "SW-001", description: "Switch", quantity: 2, unitSell: 500 }],
      status: "pending_review"
    });
    expect(content.title).toBe("Project Change Request");
    expect(content.sections.find((section) => section.title === "Commercial Impact")?.body).toContain("£2,500");
    expect(content.sections.find((section) => section.title === "Resource Day Impact")?.body).toContain("3");
    expect(content.sections.find((section) => section.title === "Hardware / Software Impact")?.tables?.[0].rows[0][0]).toBe("SW-001");
    expect(content.sections.find((section) => section.title === "Approval / Signature")?.body).toContain("Approved by");
  });

  it("builds a detailed implementation document structure", () => {
    const content = buildImplementationDocumentContent({
      projectNumber: "PRJ-2026-0004",
      name: "Hotel Network Upgrade",
      status: ProjectStatus.active,
      ragStatus: ProjectRagStatus.green,
      projectType: "guest_wifi",
      account: { name: "Example Hotel", addressLine1: "1 High Street", addressLine2: null, city: "London", county: null, postcode: "SW1A 1AA", country: "UK" },
      projectManager: { displayName: "Pat PM" },
      quote: { quoteNumber: "Q-2026-0010", highLevelScope: "Refresh network", contact: { firstName: "Jamie", lastName: "Guest", email: "jamie@example.com", phone: null, mobile: null } },
      quoteVersion: { versionNumber: 3, terms: "Standard terms" },
      opportunity: { owner: { displayName: "Sales Owner" }, opportunityType: "guest_wifi", source: "referral", notes: "Customer wants fast rollout" },
      presalesRequest: { requestNumber: "PS-2026-0004", assignedTo: { displayName: "Engineer One" }, requestType: "wifi_design", deliverables: [{ title: "Heatmap", status: "complete", document: { fileName: "heatmap.pdf" } }] },
      resourceAssignments: [{ user: { displayName: "Engineer One" }, role: "project_engineer", startDate: new Date("2026-06-10"), endDate: new Date("2026-06-12"), scheduledDays: 3, usedDays: 2 }],
      tasks: [{ title: "Deployment Commenced", status: "in_progress", startDate: new Date("2026-06-10"), endDate: new Date("2026-06-12") }],
      milestones: [{ title: "Customer Kick Off", status: "complete", milestoneDate: new Date("2026-06-08") }],
      stageGates: [{ stage: "initiation", status: "complete", notes: null }],
      issueActions: [{ type: "risk", title: "Access risk", status: "open", priority: "high" }],
      forms: [{ formType: "support_handover" }, { formType: "closure" }],
      documentRecords: [{ documentType: "implementation_document", document: { fileName: "implementation-notes.docx" } }],
      commercialValue: 50000,
      budgetSell: 50000,
      budgetCost: 22000,
      scopeSummary: "End-to-end delivery",
      description: "Detailed implementation scope",
      paymentTerms: "75/25"
    } as never);
    expect(content.title).toBe("Implementation Document");
    expect(content.sections.map((section) => section.title)).toContain("6. Pre-Sales Handover Summary");
    expect(content.sections.find((section) => section.title === "2. Customer Details")?.body).toContain("Example Hotel");
    expect(content.sections.find((section) => section.title === "7. Commercial Summary")?.tables?.[0].rows.some((row) => row[0] === "Quote Reference")).toBe(true);
  });

  it("does not generate runaway blank pages for weekly, implementation and change request PDFs", async () => {
    const project = {
      id: "project-6",
      projectNumber: "PRJ-2026-0006",
      name: "Blank Page Guard",
      account: { name: "Example Hotel" }
    };

    const weeklyBuffer = await generateProjectPdfBuffer(project, "Weekly Status Report", {
      title: "Weekly Status Report",
      sections: [
        {
          title: "Section 1 - Executive Summary",
          body: "Healthy weekly report content."
        },
        {
          title: "Section 2 - Project Health Dashboard",
          tables: [{ columns: ["Area", "Status"], rows: [["Overall Project", "Green"]] }]
        }
      ]
    });
    const implementationBuffer = await generateProjectPdfBuffer(project, "Implementation Document", {
      title: "Implementation Document",
      sections: [
        {
          title: "1. Project Overview",
          body: "Implementation document content."
        }
      ]
    });
    const changeRequestBuffer = await generateProjectPdfBuffer(project, "Project Change Request", {
      title: "Project Change Request",
      sections: [
        {
          title: "Change Summary",
          body: "Additional scope requested."
        }
      ]
    });

    expect(countPdfPages(weeklyBuffer)).toBeLessThanOrEqual(2);
    expect(countPdfPages(implementationBuffer)).toBeLessThanOrEqual(1);
    expect(countPdfPages(changeRequestBuffer)).toBeLessThanOrEqual(1);
  });

  it("wraps long table text without overflowing into runaway pages", async () => {
    const project = {
      id: "project-7",
      projectNumber: "PRJ-2026-0007",
      name: "Long Text Guard",
      account: { name: "Example Hotel" }
    };
    const longText = "This is a deliberately long field value used to make sure weekly report tables wrap safely inside their cells without overflowing outside borders or generating extra blank pages. ".repeat(10);
    const buffer = await generateProjectPdfBuffer(project, "Weekly Status Report", {
      title: "Weekly Status Report",
      sections: [
        {
          title: "Section 2 - Project Health Dashboard",
          tables: [{
            columns: ["Area", "RAG Status", "Commentary"],
            rows: [["Overall Project", "Amber", longText]]
          }]
        }
      ]
    });

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(countPdfPages(buffer)).toBeLessThanOrEqual(3);
  });
});

function countPdfPages(buffer: Buffer) {
  const matches = buffer.toString("latin1").match(/\/Type\s*\/Page\b/g);
  return matches?.length ?? 0;
}

function decodePdfHexText(pdfText: string) {
  return Array.from(pdfText.matchAll(/<([0-9A-F]+)>/gi))
    .map((match) => Buffer.from(match[1], "hex").toString("latin1"))
    .join(" ");
}
