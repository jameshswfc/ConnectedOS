import { OpportunityStage, OpportunityType, ProjectTaskStatus, QuoteStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { opportunityTypeDefinitions } from "@/modules/crm/opportunities/opportunity-types";
import { calculateInclusiveCalendarDays, calculateLabResourceDays, calculateTaskCompletionPercent, DEFAULT_PROJECT_TASKS, getDefaultProjectTaskDependencies, getDefaultProjectTaskTitles, MARRIOTT_GPNS_PROJECT_TASKS } from "@/modules/projects/project-default-tasks";
import { projectResourceDayMetrics, shouldAutoCreateProjectForOpportunityStage, shouldAutoCreateProjectForQuoteStatus } from "@/modules/projects/project-service";

describe("project default task and automation helpers", () => {
  it("creates standard default tasks for every project", () => {
    expect(getDefaultProjectTaskTitles(OpportunityType.guest_wifi)).toEqual([...DEFAULT_PROJECT_TASKS]);
  });

  it("adds Marriott GPNS extra tasks for Marriott GPNS projects", () => {
    expect(getDefaultProjectTaskTitles(OpportunityType.marriott_gpns)).toEqual([...DEFAULT_PROJECT_TASKS, ...MARRIOTT_GPNS_PROJECT_TASKS]);
  });

  it("creates the default finish-to-start dependency chain for standard projects", () => {
    expect(getDefaultProjectTaskDependencies(OpportunityType.guest_wifi)).toEqual([
      { predecessorTitle: "Project Documentation Review", successorTitle: "Pre-Sales Handover Call", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Pre-Sales Handover Call", successorTitle: "Customer Kick Off Call", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Customer Kick Off Call", successorTitle: "Resource Scheduling", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Resource Scheduling", successorTitle: "Equipment Order", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Equipment Order", successorTitle: "Accommodation & Travel Arranged", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Accommodation & Travel Arranged", successorTitle: "Deployment Commenced", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Deployment Commenced", successorTitle: "Handover Documentation Created", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Handover Documentation Created", successorTitle: "Handover to Support Completed", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Handover to Support Completed", successorTitle: "Project Closure Call", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Project Closure Call", successorTitle: "Project Closure Document & Sign Off", dependencyType: "finish_to_start", lagDays: 0 }
    ]);
  });

  it("creates the Marriott GPNS dependency chain including the certificate reroute", () => {
    expect(getDefaultProjectTaskDependencies(OpportunityType.marriott_gpns)).toEqual([
      { predecessorTitle: "Project Documentation Review", successorTitle: "Pre-Sales Handover Call", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Pre-Sales Handover Call", successorTitle: "Customer Kick Off Call", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Customer Kick Off Call", successorTitle: "Resource Scheduling", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Resource Scheduling", successorTitle: "Equipment Order", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Equipment Order", successorTitle: "Accommodation & Travel Arranged", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Accommodation & Travel Arranged", successorTitle: "Deployment Commenced", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Deployment Commenced", successorTitle: "Marriott GPNS UAT Data Collection", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Marriott GPNS UAT Data Collection", successorTitle: "Marriott GPNS UAT Booked", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Marriott GPNS UAT Booked", successorTitle: "Marriott GPNS Certificate Issued", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Marriott GPNS Certificate Issued", successorTitle: "Handover Documentation Created", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Handover Documentation Created", successorTitle: "Handover to Support Completed", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Handover to Support Completed", successorTitle: "Project Closure Call", dependencyType: "finish_to_start", lagDays: 0 },
      { predecessorTitle: "Project Closure Call", successorTitle: "Project Closure Document & Sign Off", dependencyType: "finish_to_start", lagDays: 0 }
    ]);
  });

  it("does not duplicate dependency pairs in the default chain definitions", () => {
    const standard = getDefaultProjectTaskDependencies(OpportunityType.guest_wifi);
    const marriott = getDefaultProjectTaskDependencies(OpportunityType.marriott_gpns);
    expect(new Set(standard.map((dependency) => `${dependency.predecessorTitle}:${dependency.successorTitle}`)).size).toBe(standard.length);
    expect(new Set(marriott.map((dependency) => `${dependency.predecessorTitle}:${dependency.successorTitle}`)).size).toBe(marriott.length);
  });

  it("calculates LAB quote lines as resource day budget", () => {
    expect(calculateLabResourceDays([
      { quantity: 2, product: { sku: "LAB-PM-DAY" } },
      { quantity: "3", product: { sku: "lab-eng-day" } },
      { quantity: 99, product: { sku: "SWITCH-001" } }
    ])).toBe(5);
  });

  it("calculates inclusive calendar scheduled days", () => {
    expect(calculateInclusiveCalendarDays(new Date("2026-06-08"), new Date("2026-06-12"))).toBe(5);
    expect(calculateInclusiveCalendarDays(new Date("2026-06-12"), new Date("2026-06-08"))).toBe(0);
  });

  it("calculates project completion percentage from completed tasks", () => {
    expect(calculateTaskCompletionPercent([
      { status: ProjectTaskStatus.complete },
      { status: ProjectTaskStatus.in_progress },
      { status: ProjectTaskStatus.not_started },
      { status: ProjectTaskStatus.cancelled }
    ])).toBe(33);
  });

  it("uses accepted quotes as the auto-project creation trigger", () => {
    expect(shouldAutoCreateProjectForQuoteStatus(QuoteStatus.accepted)).toBe(true);
    expect(shouldAutoCreateProjectForQuoteStatus(QuoteStatus.sent)).toBe(false);
  });

  it("uses Closed Won opportunities as an auto-project creation trigger", () => {
    expect(shouldAutoCreateProjectForOpportunityStage(OpportunityStage.closed_won_po_received)).toBe(true);
    expect(shouldAutoCreateProjectForOpportunityStage(OpportunityStage.negotiation)).toBe(false);
  });

  it("calculates visible resource budget metrics", () => {
    expect(projectResourceDayMetrics({ allocatedDays: 25, scheduledDays: 12, actualDaysUsed: 10 })).toEqual({
      allocatedDays: 25,
      scheduledDays: 12,
      actualDaysUsed: 10,
      remainingDays: 15,
      utilisationPercent: 40
    });
  });

  it("includes Marriott GPNS in controlled project/opportunity type options", () => {
    expect(opportunityTypeDefinitions).toContainEqual({ value: OpportunityType.marriott_gpns, label: "Marriott GPNS" });
  });
});
