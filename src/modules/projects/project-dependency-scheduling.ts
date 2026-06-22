import { ProjectDependencyType } from "@prisma/client";
import { addWorkingDays, calculateWorkingDays } from "@/modules/projects/project-working-calendar";
import { linkedTaskForMilestone } from "@/modules/projects/project-stage-automation";

type TaskLike = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  deletedAt?: Date | null;
};

type DependencyLike = {
  id?: string;
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: ProjectDependencyType | string;
  lagDays?: number | null;
};

type MilestoneLike = {
  id: string;
  title: string;
  milestoneDate: Date;
  deletedAt?: Date | null;
};

export type DependencyScheduleUpdate = {
  taskId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
};

export type MilestoneScheduleUpdate = {
  milestoneId: string;
  milestoneDate: Date;
  reason: string;
};

export function assertNoCircularDependency(
  tasks: TaskLike[],
  dependencies: DependencyLike[],
  predecessorTaskId: string,
  successorTaskId: string
) {
  const taskIds = new Set(tasks.filter((task) => !task.deletedAt).map((task) => task.id));
  if (!taskIds.has(predecessorTaskId) || !taskIds.has(successorTaskId)) {
    throw new Error("Project task dependency not found");
  }
  const adjacency = new Map<string, string[]>();
  for (const dependency of dependencies) {
    if (!taskIds.has(dependency.predecessorTaskId) || !taskIds.has(dependency.successorTaskId)) continue;
    const successors = adjacency.get(dependency.predecessorTaskId) ?? [];
    successors.push(dependency.successorTaskId);
    adjacency.set(dependency.predecessorTaskId, successors);
  }
  const next = adjacency.get(predecessorTaskId) ?? [];
  next.push(successorTaskId);
  adjacency.set(predecessorTaskId, next);

  const stack = [successorTaskId];
  const visited = new Set<string>();
  while (stack.length) {
    const current = stack.pop()!;
    if (current === predecessorTaskId) {
      throw new Error("This dependency would create a circular schedule relationship.");
    }
    if (visited.has(current)) continue;
    visited.add(current);
    for (const downstream of adjacency.get(current) ?? []) stack.push(downstream);
  }
}

export function cascadeDependencySchedule(input: {
  projectType?: string | null;
  changedTaskId: string;
  tasks: TaskLike[];
  dependencies: DependencyLike[];
  milestones?: MilestoneLike[];
}) {
  const activeTasks = input.tasks.filter((task) => !task.deletedAt);
  const taskById = new Map(activeTasks.map((task) => [task.id, { ...task }]));
  const dependencies = input.dependencies.filter((dependency) => taskById.has(dependency.predecessorTaskId) && taskById.has(dependency.successorTaskId));
  const updates: DependencyScheduleUpdate[] = [];
  const milestoneUpdates: MilestoneScheduleUpdate[] = [];
  const queue = [input.changedTaskId];
  const visited = new Set<string>();

  while (queue.length) {
    const changedTaskId = queue.shift()!;
    if (visited.has(changedTaskId)) continue;
    visited.add(changedTaskId);
    const successors = dependencies.filter((dependency) => dependency.predecessorTaskId === changedTaskId);
    for (const dependency of successors) {
      const predecessor = taskById.get(dependency.predecessorTaskId);
      const successor = taskById.get(dependency.successorTaskId);
      if (!predecessor || !successor) continue;
      const nextDates = calculateDependentTaskDates(predecessor, successor, dependency.dependencyType, Number(dependency.lagDays ?? 0));
      if (
        sameDay(successor.startDate, nextDates.startDate)
        && sameDay(successor.endDate, nextDates.endDate)
      ) {
        continue;
      }

      taskById.set(successor.id, {
        ...successor,
        startDate: nextDates.startDate,
        endDate: nextDates.endDate
      });
      updates.push({
        taskId: successor.id,
        startDate: nextDates.startDate,
        endDate: nextDates.endDate,
        reason: dependencyReason(predecessor.title, dependency.dependencyType, Number(dependency.lagDays ?? 0))
      });
      queue.push(successor.id);
    }
  }

  if (input.milestones?.length) {
    for (const milestone of input.milestones.filter((item) => !item.deletedAt)) {
      const linkedTaskTitle = linkedTaskForMilestone(milestone.title, input.projectType);
      if (!linkedTaskTitle) continue;
      const linkedTask = [...taskById.values()].find((task) => task.title === linkedTaskTitle);
      if (!linkedTask || sameDay(milestone.milestoneDate, linkedTask.endDate)) continue;
      milestoneUpdates.push({
        milestoneId: milestone.id,
        milestoneDate: linkedTask.endDate,
        reason: `Milestone aligned to linked task ${linkedTask.title}`
      });
    }
  }

  return {
    taskUpdates: updates,
    milestoneUpdates
  };
}

export function calculateDependentTaskDates(
  predecessor: TaskLike,
  successor: TaskLike,
  dependencyType: ProjectDependencyType | string,
  lagDays = 0
) {
  const duration = Math.max(calculateWorkingDays(successor.startDate, successor.endDate), 1);
  const lag = Math.max(0, lagDays);
  switch (dependencyType) {
    case ProjectDependencyType.start_to_start: {
      const startDate = addWorkingDays(predecessor.startDate, lag);
      return { startDate, endDate: addWorkingDays(startDate, duration - 1) };
    }
    case ProjectDependencyType.finish_to_finish: {
      const endDate = addWorkingDays(predecessor.endDate, lag);
      return { startDate: addWorkingDays(endDate, -(duration - 1)), endDate };
    }
    case ProjectDependencyType.start_to_finish: {
      const endDate = addWorkingDays(predecessor.startDate, lag);
      return { startDate: addWorkingDays(endDate, -(duration - 1)), endDate };
    }
    case ProjectDependencyType.finish_to_start:
    default: {
      const startDate = addWorkingDays(predecessor.endDate, lag);
      return { startDate, endDate: addWorkingDays(startDate, duration - 1) };
    }
  }
}

export function dependencyReason(predecessorTitle: string, dependencyType: ProjectDependencyType | string, lagDays: number) {
  return `Depends on: ${predecessorTitle} (${dependencyTypeLabel(dependencyType)} + ${Math.max(0, lagDays)}d)`;
}

export function dependencyTypeLabel(value: ProjectDependencyType | string) {
  switch (value) {
    case ProjectDependencyType.finish_to_start:
      return "FS";
    case ProjectDependencyType.start_to_start:
      return "SS";
    case ProjectDependencyType.finish_to_finish:
      return "FF";
    case ProjectDependencyType.start_to_finish:
      return "SF";
    default:
      return String(value);
  }
}

function sameDay(left: Date, right: Date) {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}
