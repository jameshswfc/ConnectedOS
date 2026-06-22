import { ProjectRagStatus, ProjectStatus, ProjectTaskStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculateProjectRag } from "@/modules/projects/project-rag";

describe("project RAG", () => {
  const now = new Date("2026-06-09T10:00:00Z");

  it("is green when resource days remain healthy and dates are not overdue", () => {
    expect(calculateProjectRag({ status: ProjectStatus.active, targetEndDate: new Date("2026-07-01"), totalResourceDaysBudget: 20, totalResourceDaysScheduled: 8, totalResourceDaysUsed: 8, tasks: [] }, now)).toBe(ProjectRagStatus.green);
  });

  it("is amber when remaining resource days are within 25 percent", () => {
    expect(calculateProjectRag({ status: ProjectStatus.active, targetEndDate: new Date("2026-07-01"), totalResourceDaysBudget: 20, totalResourceDaysScheduled: 17, totalResourceDaysUsed: 17, tasks: [] }, now)).toBe(ProjectRagStatus.amber);
  });

  it("is red when resource days are exhausted or a critical task is overdue", () => {
    expect(calculateProjectRag({ status: ProjectStatus.active, targetEndDate: new Date("2026-07-01"), totalResourceDaysBudget: 20, totalResourceDaysScheduled: 20, totalResourceDaysUsed: 20, tasks: [] }, now)).toBe(ProjectRagStatus.red);
    expect(calculateProjectRag({ status: ProjectStatus.active, targetEndDate: new Date("2026-07-01"), totalResourceDaysBudget: 20, totalResourceDaysScheduled: 10, totalResourceDaysUsed: 10, tasks: [{ status: ProjectTaskStatus.in_progress, endDate: new Date("2026-06-01") }] }, now)).toBe(ProjectRagStatus.red);
  });

  it("keeps completed projects green", () => {
    expect(calculateProjectRag({ status: ProjectStatus.completed, targetEndDate: new Date("2026-06-01"), totalResourceDaysBudget: 0, totalResourceDaysScheduled: 0, totalResourceDaysUsed: 0, tasks: [] }, now)).toBe(ProjectRagStatus.green);
  });
});
