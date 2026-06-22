import { OpportunityType, ProjectDependencyType, ProjectTaskStatus } from "@prisma/client";
import { calculateWorkingDays } from "@/modules/projects/project-working-calendar";

export const DEFAULT_PROJECT_TASKS = [
  "Project Documentation Review",
  "Pre-Sales Handover Call",
  "Customer Kick Off Call",
  "Resource Scheduling",
  "Equipment Order",
  "Accommodation & Travel Arranged",
  "Deployment Commenced",
  "Handover Documentation Created",
  "Handover to Support Completed",
  "Project Closure Call",
  "Project Closure Document & Sign Off"
] as const;

export const MARRIOTT_GPNS_PROJECT_TASKS = [
  "Marriott GPNS UAT Data Collection",
  "Marriott GPNS UAT Booked",
  "Marriott GPNS Certificate Issued"
] as const;

export const DEFAULT_PROJECT_TASK_DATE_OFFSETS: Record<(typeof DEFAULT_PROJECT_TASKS)[number], number> = {
  "Project Documentation Review": 2,
  "Pre-Sales Handover Call": 4,
  "Customer Kick Off Call": 7,
  "Resource Scheduling": 7,
  "Equipment Order": 7,
  "Accommodation & Travel Arranged": 7,
  "Deployment Commenced": 21,
  "Handover Documentation Created": 60,
  "Handover to Support Completed": 64,
  "Project Closure Call": 70,
  "Project Closure Document & Sign Off": 70
};

export const MARRIOTT_GPNS_TASK_DATE_OFFSETS: Record<(typeof MARRIOTT_GPNS_PROJECT_TASKS)[number], number> = {
  "Marriott GPNS UAT Data Collection": 50,
  "Marriott GPNS UAT Booked": 50,
  "Marriott GPNS Certificate Issued": 70
};

export type DefaultProjectTaskDependency = {
  predecessorTitle: string;
  successorTitle: string;
  dependencyType: "finish_to_start";
  lagDays: 0;
};

export function getDefaultProjectTaskTitles(projectType?: OpportunityType | string | null) {
  return [
    ...DEFAULT_PROJECT_TASKS,
    ...(projectType === OpportunityType.marriott_gpns ? MARRIOTT_GPNS_PROJECT_TASKS : [])
  ];
}

export function defaultProjectTaskInputs(startDate: Date, projectType?: OpportunityType | string | null) {
  return getDefaultProjectTaskTitles(projectType).map((title, index) => {
    const taskDate = addDays(startDate, taskDateOffset(title));
    return {
      title,
      startDate: taskDate,
      endDate: taskDate,
      estimatedDays: calculateWorkingDays(taskDate, taskDate),
      sortOrder: index + 1
    };
  });
}

export function getDefaultProjectTaskDependencies(projectType?: OpportunityType | string | null): DefaultProjectTaskDependency[] {
  if (projectType === OpportunityType.marriott_gpns) {
    return [
      dependency("Project Documentation Review", "Pre-Sales Handover Call"),
      dependency("Pre-Sales Handover Call", "Customer Kick Off Call"),
      dependency("Customer Kick Off Call", "Resource Scheduling"),
      dependency("Resource Scheduling", "Equipment Order"),
      dependency("Equipment Order", "Accommodation & Travel Arranged"),
      dependency("Accommodation & Travel Arranged", "Deployment Commenced"),
      dependency("Deployment Commenced", "Marriott GPNS UAT Data Collection"),
      dependency("Marriott GPNS UAT Data Collection", "Marriott GPNS UAT Booked"),
      dependency("Marriott GPNS UAT Booked", "Marriott GPNS Certificate Issued"),
      dependency("Marriott GPNS Certificate Issued", "Handover Documentation Created"),
      dependency("Handover Documentation Created", "Handover to Support Completed"),
      dependency("Handover to Support Completed", "Project Closure Call"),
      dependency("Project Closure Call", "Project Closure Document & Sign Off")
    ];
  }

  return DEFAULT_PROJECT_TASKS.slice(0, -1).map((title, index) => dependency(title, DEFAULT_PROJECT_TASKS[index + 1]));
}

export function calculateInclusiveCalendarDays(startDate: Date, endDate: Date) {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  if (end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function calculateTaskCompletionPercent(tasks: { status: ProjectTaskStatus | string; deletedAt?: Date | null }[]) {
  const activeTasks = tasks.filter((task) => !task.deletedAt && task.status !== ProjectTaskStatus.cancelled);
  if (!activeTasks.length) return 0;
  const completed = activeTasks.filter((task) => task.status === ProjectTaskStatus.complete).length;
  return Math.round((completed / activeTasks.length) * 100);
}

export function calculateLabResourceDays(lines: { quantity: unknown; product?: { sku?: string | null } | null }[]) {
  return lines.reduce((total, line) => {
    const sku = line.product?.sku?.trim().toUpperCase() ?? "";
    return sku.startsWith("LAB") ? total + Number(line.quantity ?? 0) : total;
  }, 0);
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function taskDateOffset(title: string) {
  return DEFAULT_PROJECT_TASK_DATE_OFFSETS[title as keyof typeof DEFAULT_PROJECT_TASK_DATE_OFFSETS]
    ?? MARRIOTT_GPNS_TASK_DATE_OFFSETS[title as keyof typeof MARRIOTT_GPNS_TASK_DATE_OFFSETS]
    ?? 0;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dependency(predecessorTitle: string, successorTitle: string): DefaultProjectTaskDependency {
  return {
    predecessorTitle,
    successorTitle,
    dependencyType: ProjectDependencyType.finish_to_start,
    lagDays: 0
  };
}
