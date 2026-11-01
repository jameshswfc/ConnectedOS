import { describe, expect, it } from "vitest";
import { cascadeDependencySchedule } from "@/modules/projects/project-dependency-scheduling";
import { toDateParam } from "@/modules/scheduling/calendar-utils";
const task = (id: string, date: string) => ({ id, title: id, startDate: new Date(date), endDate: new Date(date) });
const dependencies = [
  { predecessorTaskId: "review", successorTaskId: "kickoff", dependencyType: "finish_to_start", lagDays: 0 },
  { predecessorTaskId: "kickoff", successorTaskId: "deployment", dependencyType: "finish_to_start", lagDays: 0 }
];
describe("default dependency plan buffers", () => {
  it("preserves later template dates when adding missing default dependencies", () => {
    const result = cascadeDependencySchedule({ changedTaskId: "review", tasks: [task("review", "2026-06-02"), task("kickoff", "2026-06-08"), task("deployment", "2026-06-22")], dependencies, preserveLaterDates: true });
    expect(result.taskUpdates).toEqual([]);
  });
  it("still pushes a successor forward where a default link requires it", () => {
    const result = cascadeDependencySchedule({ changedTaskId: "review", tasks: [task("review", "2026-06-10"), task("kickoff", "2026-06-08"), task("deployment", "2026-06-09")], dependencies, preserveLaterDates: true });
    expect(result.taskUpdates.map((update) => update.taskId)).toEqual(["kickoff", "deployment"]);
    expect(result.taskUpdates.every((update) => toDateParam(update.startDate) === "2026-06-10")).toBe(true);
  });
});
