import { describe, expect, it } from "vitest";
import { buildProjectGanttData } from "@/modules/projects/project-gantt-service";

describe("project gantt service", () => {
  it("positions tasks by actual dates and sizes bars by duration", () => {
    const gantt = buildProjectGanttData({
      startDate: new Date("2026-06-01"),
      targetEndDate: new Date("2026-07-10"),
      tasks: [
        { id: "task-1", title: "Early Task", startDate: new Date("2026-06-03"), endDate: new Date("2026-06-04"), status: "not_started", predecessors: [], successors: [] },
        { id: "task-2", title: "Later Task", startDate: new Date("2026-06-22"), endDate: new Date("2026-06-26"), status: "in_progress", predecessors: [], successors: [] }
      ],
      milestones: [],
      resourceAssignments: []
    });

    const earlyTask = gantt.items.find((item) => item.id === "task-1");
    const laterTask = gantt.items.find((item) => item.id === "task-2");

    expect(earlyTask?.offsetDays).toBeLessThan(laterTask?.offsetDays ?? 0);
    expect(earlyTask?.spanDays).toBe(2);
    expect(laterTask?.spanDays).toBe(5);
    expect(formatLocalDate(gantt.chartStartDate)).toBe("2026-05-25");
    expect(formatLocalDate(gantt.chartEndDate)).toBe("2026-07-17");
  });

  it("places milestones on the correct offset and marks overdue items red", () => {
    const gantt = buildProjectGanttData({
      startDate: new Date("2026-06-01"),
      targetEndDate: new Date("2026-06-30"),
      tasks: [
        { id: "task-1", title: "Historic Task", startDate: new Date("2026-01-01"), endDate: new Date("2026-01-02"), status: "not_started", predecessors: [], successors: [] }
      ],
      milestones: [
        { id: "milestone-1", title: "Kick Off", milestoneDate: new Date("2026-06-10"), status: "complete" }
      ],
      resourceAssignments: []
    });

    const milestone = gantt.items.find((item) => item.id === "milestone-1");
    const overdueTask = gantt.items.find((item) => item.id === "task-1");

    expect(milestone?.offsetDays).toBe(daysBetween(gantt.chartStartDate, new Date("2026-06-10")));
    expect(milestone?.spanDays).toBe(1);
    expect(overdueTask?.tone).toBe("red");
  });

  it("formats week headers with compact labels for UI spacing", () => {
    const gantt = buildProjectGanttData({
      startDate: new Date("2026-06-01"),
      targetEndDate: new Date("2026-06-30"),
      tasks: [],
      milestones: [],
      resourceAssignments: []
    });

    expect(gantt.weekHeaders[0]?.label).toMatch(/^Week Commencing /);
    expect(gantt.weekHeaders[0]?.shortLabel).toMatch(/^WC /);
    expect(gantt.timelineLabel).toContain("WC");
  });
});

function daysBetween(startDate: Date, endDate: Date) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

function formatLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
