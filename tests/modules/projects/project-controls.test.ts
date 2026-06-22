import { OpportunityType, ProjectDeliveryStage, ProjectMilestoneStatus, ProjectStatus, ProjectTaskStatus, StageGateStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculateProjectScheduleVariance } from "@/modules/projects/project-baseline-service";
import { calculateProjectBudgetVariance } from "@/modules/projects/project-budget-variance";
import { defaultProjectTaskInputs } from "@/modules/projects/project-default-tasks";
import { defaultMilestoneInputs, DEFAULT_PROJECT_MILESTONES, milestoneProgress } from "@/modules/projects/project-milestone-service";
import { DEFAULT_PROJECT_STAGE_GATES } from "@/modules/projects/project-stage-gates";
import { calculateWorkingDays } from "@/modules/projects/project-working-calendar";
import { nextAutomatedProjectStatus } from "@/modules/projects/project-status-automation";
import { buildProjectGanttData } from "@/modules/projects/project-gantt-service";
import { buildProjectCalendarData } from "@/modules/projects/project-calendar-service";
import { assertNoCircularDependency, calculateDependentTaskDates, cascadeDependencySchedule } from "@/modules/projects/project-dependency-scheduling";
import { matchesProjectDashboardView, projectTaskActualDaysUsed, projectTaskDayMetrics, validateProjectTaskCompletion } from "@/modules/projects/project-service";
import { isMilestoneCompleteFromTasks, linkedTaskForMilestone, nextStageGateStatus, stageGateCompletionConditions } from "@/modules/projects/project-stage-automation";

describe("project controls", () => {
  it("calculates baseline schedule variance labels", () => {
    expect(calculateProjectScheduleVariance({
      baselineStartDate: "2026-06-01",
      baselineEndDate: "2026-06-10",
      startDate: "2026-06-02",
      targetEndDate: "2026-06-12"
    })).toMatchObject({
      startVarianceDays: 1,
      scheduleVarianceDays: 2,
      scheduleVarianceLabel: "2 days delayed"
    });
  });

  it("calculates budget variance and margin at risk", () => {
    const result = calculateProjectBudgetVariance({
      contractValue: 10000,
      budgetCost: 4000,
      invoicedAmount: 6000,
      collectedAmount: 2500,
      resourceAssignments: [{ role: "project_engineer", scheduledDays: 2, usedDays: 3 }],
      financialEntries: [{ type: "purchase_order_placeholder", amount: 3000, status: "planned" }]
    });
    expect(result.resourceCost).toBe(1350);
    expect(result.poPlaceholderCost).toBe(3000);
    expect(result.outstandingAmount).toBe(3500);
    expect(result.currentForecastMargin).toBe(5650);
    expect(result.marginVariance).toBe(-350);
  });

  it("creates default milestones and calculates milestone progress", () => {
    const milestones = defaultMilestoneInputs(new Date("2026-06-01"));
    expect(milestones).toHaveLength(DEFAULT_PROJECT_MILESTONES.length);
    expect(milestones[0]).toMatchObject({ title: "Customer Kick Off" });
    expect(milestones[0].milestoneDate.toISOString().slice(0, 10)).toBe("2026-06-08");
    expect(milestones[1].milestoneDate.toISOString().slice(0, 10)).toBe("2026-06-15");
    expect(milestoneProgress([
      { status: ProjectMilestoneStatus.complete },
      { status: ProjectMilestoneStatus.in_progress },
      { status: ProjectMilestoneStatus.cancelled }
    ])).toBe(50);
  });

  it("creates default project task dates from project start including Marriott GPNS extras", () => {
    const defaultTasks = defaultProjectTaskInputs(new Date("2026-06-01"));
    expect(defaultTasks[0]).toMatchObject({ title: "Project Documentation Review" });
    expect(defaultTasks[0].startDate.toISOString().slice(0, 10)).toBe("2026-06-03");
    expect(defaultTasks[2].startDate.toISOString().slice(0, 10)).toBe("2026-06-08");
    expect(defaultTasks[6].startDate.toISOString().slice(0, 10)).toBe("2026-06-22");
    expect(defaultTasks.every((task) => task.estimatedDays === calculateWorkingDays(task.startDate, task.endDate))).toBe(true);

    const marriottTasks = defaultProjectTaskInputs(new Date("2026-06-01"), OpportunityType.marriott_gpns);
    expect(marriottTasks.some((task) => task.title === "Marriott GPNS UAT Data Collection" && task.startDate.toISOString().slice(0, 10) === "2026-07-21")).toBe(true);
    expect(marriottTasks.some((task) => task.title === "Marriott GPNS Certificate Issued" && task.startDate.toISOString().slice(0, 10) === "2026-08-10")).toBe(true);
    expect(marriottTasks.every((task) => task.estimatedDays === calculateWorkingDays(task.startDate, task.endDate))).toBe(true);
  });

  it("defines default PRINCE2-style stage gates", () => {
    expect(DEFAULT_PROJECT_STAGE_GATES).toEqual(["initiation", "planning", "delivery", "validation", "handover", "closure"]);
  });

  it("maps milestones to linked project task completion", () => {
    expect(linkedTaskForMilestone("Customer Kick Off", OpportunityType.guest_wifi)).toBe("Customer Kick Off Call");
    expect(isMilestoneCompleteFromTasks("Customer Kick Off", [{ title: "Customer Kick Off Call", status: ProjectTaskStatus.complete }], OpportunityType.guest_wifi)).toBe(true);
    expect(isMilestoneCompleteFromTasks("Customer Kick Off", [{ title: "Customer Kick Off Call", status: ProjectTaskStatus.in_progress }], OpportunityType.guest_wifi)).toBe(false);
    expect(linkedTaskForMilestone("UAT Complete", OpportunityType.guest_wifi)).toBeNull();
    expect(linkedTaskForMilestone("UAT Complete", OpportunityType.marriott_gpns)).toBe("Marriott GPNS Certificate Issued");
  });

  it("progresses stage gates from linked milestones, tasks and forms", () => {
    const base = {
      projectType: OpportunityType.marriott_gpns,
      tasks: [
        { title: "Resource Scheduling", status: ProjectTaskStatus.complete },
        { title: "Equipment Order", status: ProjectTaskStatus.complete },
        { title: "Deployment Commenced", status: ProjectTaskStatus.complete }
      ],
      milestones: [
        { title: "Customer Kick Off", status: ProjectMilestoneStatus.complete },
        { title: "UAT Complete", status: ProjectMilestoneStatus.complete },
        { title: "Handover", status: ProjectMilestoneStatus.complete },
        { title: "Closure", status: ProjectMilestoneStatus.complete }
      ],
      closureFormExists: true
    };
    expect(nextStageGateStatus(ProjectDeliveryStage.initiation, base)).toBe(StageGateStatus.complete);
    expect(nextStageGateStatus(ProjectDeliveryStage.planning, base)).toBe(StageGateStatus.complete);
    expect(nextStageGateStatus(ProjectDeliveryStage.delivery, base)).toBe(StageGateStatus.complete);
    expect(nextStageGateStatus(ProjectDeliveryStage.validation, base)).toBe(StageGateStatus.complete);
    expect(nextStageGateStatus(ProjectDeliveryStage.handover, base)).toBe(StageGateStatus.complete);
    expect(nextStageGateStatus(ProjectDeliveryStage.closure, base)).toBe(StageGateStatus.complete);
    expect(stageGateCompletionConditions[ProjectDeliveryStage.planning]).toContain("Resource Scheduling");
  });

  it("automatically progresses project statuses", () => {
    expect(nextAutomatedProjectStatus({ currentStatus: ProjectStatus.initiation, tasks: [{ status: ProjectTaskStatus.in_progress }] })).toBe(ProjectStatus.active);
    expect(nextAutomatedProjectStatus({ currentStatus: ProjectStatus.active, tasks: [{ status: ProjectTaskStatus.complete }] })).toBe(ProjectStatus.completed);
    expect(nextAutomatedProjectStatus({ currentStatus: ProjectStatus.completed, tasks: [{ status: ProjectTaskStatus.complete }], closureFormExists: true })).toBe(ProjectStatus.closed);
    expect(nextAutomatedProjectStatus({ currentStatus: ProjectStatus.on_hold, tasks: [{ status: ProjectTaskStatus.in_progress }] })).toBe(ProjectStatus.on_hold);
  });

  it("keeps completed and closed projects out of the default active dashboard view", () => {
    expect(matchesProjectDashboardView(ProjectStatus.active, "active")).toBe(true);
    expect(matchesProjectDashboardView(ProjectStatus.completed, "active")).toBe(false);
    expect(matchesProjectDashboardView(ProjectStatus.closed, "active")).toBe(false);
    expect(matchesProjectDashboardView(ProjectStatus.completed, "completed")).toBe(true);
    expect(matchesProjectDashboardView(ProjectStatus.closed, "closed")).toBe(true);
    expect(matchesProjectDashboardView(ProjectStatus.cancelled, "cancelled")).toBe(true);
    expect(matchesProjectDashboardView(ProjectStatus.closed, "all")).toBe(true);
  });

  it("builds Gantt and calendar data with milestones and resources", () => {
    const project = {
      baselineStartDate: new Date("2026-06-01"),
      baselineEndDate: new Date("2026-06-30"),
      tasks: [{ id: "task-1", title: "Task", startDate: new Date("2026-06-02"), endDate: new Date("2026-06-03"), status: "in_progress", predecessors: [], successors: [] }],
      milestones: [{ id: "milestone-1", title: "Customer Kick Off", milestoneDate: new Date("2026-06-01"), status: "complete" }],
      resourceAssignments: [{ id: "resource-1", role: "field_engineer", startDate: new Date("2026-06-02"), endDate: new Date("2026-06-03"), user: { displayName: "Engineer" } }],
      forms: [{ id: "form-1", formType: "weekly_update", title: "Weekly Update", formDate: new Date("2026-06-05") }]
    };
    expect(buildProjectGanttData(project).items.map((item) => item.type)).toContain("milestone");
    expect(buildProjectCalendarData(project).map((item) => item.type)).toEqual(["milestone", "task", "resource", "form"]);
  });

  it("requires actual days when completing a task and rolls up task actual days", () => {
    expect(() => validateProjectTaskCompletion({
      previousStatus: ProjectTaskStatus.in_progress,
      nextStatus: ProjectTaskStatus.complete,
      previousActualDays: 0,
      nextActualDays: 0,
      estimatedDays: 2
    })).toThrow("Actual days used are required before completing this task.");

    expect(() => validateProjectTaskCompletion({
      previousStatus: ProjectTaskStatus.in_progress,
      nextStatus: ProjectTaskStatus.complete,
      previousActualDays: 0,
      nextActualDays: 2,
      estimatedDays: 2
    })).not.toThrow();

    expect(() => validateProjectTaskCompletion({
      previousStatus: ProjectTaskStatus.complete,
      nextStatus: ProjectTaskStatus.complete,
      previousActualDays: 0,
      nextActualDays: 0,
      estimatedDays: 2
    })).not.toThrow();

    expect(projectTaskActualDaysUsed({
      tasks: [
        { actualDays: 2, deletedAt: null },
        { actualDays: 1.5, deletedAt: null },
        { actualDays: 9, deletedAt: new Date("2026-06-01") }
      ]
    })).toBe(3.5);

    expect(projectTaskDayMetrics({
      tasks: [
        { estimatedDays: 2, actualDays: 3, deletedAt: null, status: ProjectTaskStatus.complete },
        { estimatedDays: 1, actualDays: 1, deletedAt: null, status: ProjectTaskStatus.in_progress }
      ]
    })).toMatchObject({
      estimatedDays: 3,
      actualDays: 4,
      variance: 1,
      varianceLabel: "Over estimate",
      overEstimate: true
    });
  });

  it("calculates dependency-driven successor dates and cascades updates", () => {
    const predecessor = {
      id: "task-a",
      title: "Equipment Order",
      startDate: new Date("2026-06-08"),
      endDate: new Date("2026-06-10")
    };
    const successor = {
      id: "task-b",
      title: "Deployment Commenced",
      startDate: new Date("2026-06-11"),
      endDate: new Date("2026-06-12")
    };

    expect(londonDate(calculateDependentTaskDates(predecessor, successor, "finish_to_start", 2).startDate)).toBe("2026-06-12");
    expect(londonDate(calculateDependentTaskDates(predecessor, successor, "finish_to_start", 2).endDate)).toBe("2026-06-15");
    expect(londonDate(calculateDependentTaskDates(predecessor, successor, "start_to_start", 1).startDate)).toBe("2026-06-09");
    expect(londonDate(calculateDependentTaskDates(predecessor, successor, "finish_to_finish", 1).endDate)).toBe("2026-06-11");

    const cascade = cascadeDependencySchedule({
      projectType: OpportunityType.guest_wifi,
      changedTaskId: "task-a",
      tasks: [
        predecessor,
        successor,
        {
          id: "task-c",
          title: "Customer Kick Off Call",
          startDate: new Date("2026-06-13"),
          endDate: new Date("2026-06-13")
        }
      ],
      dependencies: [
        { predecessorTaskId: "task-a", successorTaskId: "task-b", dependencyType: "finish_to_start", lagDays: 2 },
        { predecessorTaskId: "task-b", successorTaskId: "task-c", dependencyType: "finish_to_start", lagDays: 1 }
      ],
      milestones: [
        { id: "milestone-1", title: "Customer Kick Off", milestoneDate: new Date("2026-06-13") }
      ]
    });

    expect(cascade.taskUpdates.map((item) => item.taskId)).toEqual(["task-b", "task-c"]);
    expect(londonDate(cascade.taskUpdates[0].startDate)).toBe("2026-06-12");
    expect(londonDate(cascade.taskUpdates[1].startDate)).toBe("2026-06-16");
    expect(londonDate(cascade.milestoneUpdates[0].milestoneDate)).toBe("2026-06-16");
  });

  it("rejects circular task dependencies", () => {
    expect(() => assertNoCircularDependency(
      [
        { id: "task-a", title: "A", startDate: new Date("2026-06-01"), endDate: new Date("2026-06-01") },
        { id: "task-b", title: "B", startDate: new Date("2026-06-02"), endDate: new Date("2026-06-02") }
      ],
      [{ predecessorTaskId: "task-a", successorTaskId: "task-b", dependencyType: "finish_to_start" }],
      "task-b",
      "task-a"
    )).toThrow("This dependency would create a circular schedule relationship.");
  });
});

function londonDate(value: Date) {
  return value.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}
