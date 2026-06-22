const DAY_MS = 86_400_000;
const CHART_PADDING_DAYS = 7;

type TaskLike = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  status: string;
  assignedTo?: { displayName: string } | null;
  predecessors?: { predecessorTaskId?: string | null }[];
  successors?: { successorTaskId?: string | null }[];
};

type MilestoneLike = {
  id: string;
  title: string;
  milestoneDate: Date;
  status: string;
  deletedAt?: Date | null;
};

type ResourceLike = {
  id: string;
  startDate: Date;
  endDate: Date;
};

export function buildProjectGanttData(project: {
  startDate?: Date | null;
  targetEndDate?: Date | null;
  baselineStartDate?: Date | null;
  baselineEndDate?: Date | null;
  tasks: TaskLike[];
  milestones: MilestoneLike[];
  resourceAssignments?: ResourceLike[];
}) {
  const tasks = [...project.tasks].sort(sortTaskRows);
  const milestones = project.milestones.filter((milestone) => !milestone.deletedAt).sort(sortMilestones);
  const resources = project.resourceAssignments ?? [];
  const anchorStartDates = [project.startDate, ...tasks.map((task) => task.startDate), ...milestones.map((milestone) => milestone.milestoneDate), ...resources.map((resource) => resource.startDate)].filter(Boolean) as Date[];
  const anchorEndDates = [project.targetEndDate, ...tasks.map((task) => task.endDate), ...milestones.map((milestone) => milestone.milestoneDate), ...resources.map((resource) => resource.endDate)].filter(Boolean) as Date[];
  const baseStart = anchorStartDates.length ? minDate(anchorStartDates) : startOfDay(new Date());
  const baseEnd = anchorEndDates.length ? maxDate(anchorEndDates) : baseStart;
  const chartStartDate = addDays(startOfDay(baseStart), -CHART_PADDING_DAYS);
  const chartEndDate = addDays(startOfDay(baseEnd), CHART_PADDING_DAYS);
  const totalDays = inclusiveDays(chartStartDate, chartEndDate);
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  return {
    baseline: {
      startDate: project.baselineStartDate ?? null,
      endDate: project.baselineEndDate ?? null
    },
    chartStartDate,
    chartEndDate,
    totalDays,
    weekHeaders: buildWeekHeaders(chartStartDate, chartEndDate),
    timelineLabel: `${formatWeekLabel(chartStartDate, "short")} to ${formatWeekLabel(chartEndDate, "short")}`,
    items: [
      ...tasks.map((task) => ({
        id: task.id,
        type: "task" as const,
        title: task.title,
        assignedTo: task.assignedTo?.displayName ?? null,
        startDate: task.startDate,
        endDate: task.endDate,
        status: task.status,
        dependencyLabels: task.predecessors?.map((dependency) => taskById.get(String(dependency.predecessorTaskId ?? ""))?.title).filter(Boolean) ?? [],
        overdue: task.status !== "complete" && startOfDay(task.endDate) < startOfDay(new Date()),
        offsetDays: daysBetween(chartStartDate, task.startDate),
        spanDays: Math.max(1, inclusiveDays(task.startDate, task.endDate)),
        completionPercent: task.status === "complete" ? 100 : 0,
        tone: ganttTone(task.status, task.endDate)
      })),
      ...milestones.map((milestone) => ({
        id: milestone.id,
        type: "milestone" as const,
        title: milestone.title,
        assignedTo: null,
        startDate: milestone.milestoneDate,
        endDate: milestone.milestoneDate,
        status: milestone.status,
        dependencyLabels: [],
        overdue: milestone.status !== "complete" && startOfDay(milestone.milestoneDate) < startOfDay(new Date()),
        offsetDays: daysBetween(chartStartDate, milestone.milestoneDate),
        spanDays: 1,
        completionPercent: milestone.status === "complete" ? 100 : 0,
        tone: ganttTone(milestone.status, milestone.milestoneDate)
      }))
    ].sort(sortGanttItems)
  };
}

function buildWeekHeaders(chartStartDate: Date, chartEndDate: Date) {
  const headers: { label: string; shortLabel: string; startDate: Date; offsetDays: number; spanDays: number }[] = [];
  let cursor = startOfWeek(chartStartDate);
  while (cursor <= chartEndDate) {
    const headerStart = cursor < chartStartDate ? chartStartDate : cursor;
    const headerEnd = minDate([addDays(cursor, 6), chartEndDate]);
    headers.push({
      label: formatWeekLabel(cursor, "long"),
      shortLabel: formatWeekLabel(cursor, "short"),
      startDate: cursor,
      offsetDays: daysBetween(chartStartDate, headerStart),
      spanDays: Math.max(1, inclusiveDays(headerStart, headerEnd))
    });
    cursor = addDays(cursor, 7);
  }
  return headers;
}

function formatWeekLabel(date: Date, variant: "long" | "short") {
  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short"
  });
  return variant === "short" ? `WC ${formattedDate}` : `Week Commencing ${formattedDate}`;
}

function sortTaskRows(left: TaskLike, right: TaskLike) {
  return left.startDate.getTime() - right.startDate.getTime()
    || left.endDate.getTime() - right.endDate.getTime()
    || left.title.localeCompare(right.title);
}

function sortMilestones(left: MilestoneLike, right: MilestoneLike) {
  return left.milestoneDate.getTime() - right.milestoneDate.getTime()
    || left.title.localeCompare(right.title);
}

function sortGanttItems(
  left: { startDate: Date; endDate: Date; title: string },
  right: { startDate: Date; endDate: Date; title: string }
) {
  return left.startDate.getTime() - right.startDate.getTime()
    || left.endDate.getTime() - right.endDate.getTime()
    || left.title.localeCompare(right.title);
}

function ganttTone(status: string, endDate: Date) {
  if (status === "complete") return "green";
  if (startOfDay(endDate) < startOfDay(new Date())) return "red";
  if (status === "in_progress") return "purple";
  if (status === "blocked" || status === "delayed") return "amber";
  return "grey";
}

function inclusiveDays(startDate: Date, endDate: Date) {
  return Math.max(1, daysBetween(startDate, endDate) + 1);
}

function daysBetween(startDate: Date, endDate: Date) {
  return Math.max(0, Math.floor((startOfDay(endDate).getTime() - startOfDay(startDate).getTime()) / DAY_MS));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const distance = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + distance);
  return copy;
}

function minDate(values: Date[]) {
  return new Date(Math.min(...values.map((value) => startOfDay(value).getTime())));
}

function maxDate(values: Date[]) {
  return new Date(Math.max(...values.map((value) => startOfDay(value).getTime())));
}
