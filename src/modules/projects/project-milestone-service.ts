import { ProjectMilestoneStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export const DEFAULT_PROJECT_MILESTONES = [
  "Customer Kick Off",
  "Equipment Delivered",
  "Deployment Start",
  "UAT Complete",
  "Handover",
  "Closure"
] as const;

export const DEFAULT_PROJECT_MILESTONE_DATE_OFFSETS: Record<(typeof DEFAULT_PROJECT_MILESTONES)[number], number> = {
  "Customer Kick Off": 7,
  "Equipment Delivered": 14,
  "Deployment Start": 21,
  "UAT Complete": 56,
  "Handover": 64,
  "Closure": 70
};

export function defaultMilestoneInputs(startDate: Date) {
  return DEFAULT_PROJECT_MILESTONES.map((title, index) => ({
    title,
    milestoneDate: addDays(startDate, milestoneDateOffset(title)),
    status: ProjectMilestoneStatus.not_started,
    sortOrder: index + 1
  }));
}

export async function createMissingDefaultMilestones(transaction: Prisma.TransactionClient, projectId: string, startDate: Date) {
  const existing = await transaction.projectMilestone.findMany({ where: { projectId, deletedAt: null }, select: { title: true } });
  const existingTitles = new Set(existing.map((item) => normaliseMilestoneTitle(item.title)));
  for (const milestone of defaultMilestoneInputs(startDate)) {
    if (existingTitles.has(normaliseMilestoneTitle(milestone.title))) continue;
    await transaction.projectMilestone.create({ data: { projectId, ...milestone } });
  }
}

export function milestoneProgress(milestones: { status: ProjectMilestoneStatus | string; deletedAt?: Date | null }[]) {
  const active = milestones.filter((milestone) => !milestone.deletedAt && milestone.status !== ProjectMilestoneStatus.cancelled);
  if (!active.length) return 0;
  return Math.round((active.filter((milestone) => milestone.status === ProjectMilestoneStatus.complete).length / active.length) * 100);
}

export function milestoneDateOffset(title: string) {
  return DEFAULT_PROJECT_MILESTONE_DATE_OFFSETS[title as keyof typeof DEFAULT_PROJECT_MILESTONE_DATE_OFFSETS] ?? 0;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function normaliseMilestoneTitle(title: string) {
  const text = title.trim().toLowerCase();
  return text === "kick off" ? "customer kick off" : text;
}
