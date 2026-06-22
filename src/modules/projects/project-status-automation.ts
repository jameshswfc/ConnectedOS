import { ProjectStatus, ProjectTaskStatus } from "@prisma/client";

export function nextAutomatedProjectStatus(input: {
  currentStatus: ProjectStatus | string;
  tasks: { status: ProjectTaskStatus | string; deletedAt?: Date | null }[];
  closureFormExists?: boolean;
}) {
  const blockedStatuses: ProjectStatus[] = [ProjectStatus.on_hold, ProjectStatus.cancelled, ProjectStatus.closed];
  if (blockedStatuses.includes(input.currentStatus as ProjectStatus)) {
    return input.currentStatus as ProjectStatus;
  }
  if (input.closureFormExists) return ProjectStatus.closed;
  const activeTasks = input.tasks.filter((task) => !task.deletedAt && task.status !== ProjectTaskStatus.cancelled);
  if (activeTasks.length && activeTasks.every((task) => task.status === ProjectTaskStatus.complete)) return ProjectStatus.completed;
  if (activeTasks.some((task) => task.status === ProjectTaskStatus.in_progress || task.status === ProjectTaskStatus.blocked)) return ProjectStatus.active;
  return input.currentStatus as ProjectStatus;
}
