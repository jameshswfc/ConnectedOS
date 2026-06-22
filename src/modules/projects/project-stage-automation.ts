import { OpportunityType, ProjectDeliveryStage, ProjectMilestoneStatus, ProjectTaskStatus, StageGateStatus } from "@prisma/client";

export const milestoneTaskLinks: Record<string, string[]> = {
  "Customer Kick Off": ["Customer Kick Off Call"],
  "Kick Off": ["Customer Kick Off Call"],
  "Equipment Delivered": ["Equipment Order"],
  "Deployment Start": ["Deployment Commenced"],
  "UAT Complete": ["Marriott GPNS Certificate Issued"],
  "Handover": ["Handover to Support Completed"],
  "Closure": ["Project Closure Document & Sign Off"]
};

export const stageGateCompletionConditions: Record<ProjectDeliveryStage, string> = {
  [ProjectDeliveryStage.initiation]: "Customer Kick Off milestone complete",
  [ProjectDeliveryStage.planning]: "Resource Scheduling and Equipment Order tasks complete",
  [ProjectDeliveryStage.delivery]: "Deployment Commenced task complete",
  [ProjectDeliveryStage.validation]: "UAT Complete milestone complete or manual approval where no UAT is required",
  [ProjectDeliveryStage.handover]: "Handover milestone complete",
  [ProjectDeliveryStage.closure]: "Closure milestone complete and closure form exists"
};

export function linkedTaskForMilestone(title: string, projectType?: OpportunityType | string | null) {
  if (title === "UAT Complete" && projectType !== OpportunityType.marriott_gpns) return null;
  return milestoneTaskLinks[title]?.[0] ?? null;
}

export function isMilestoneCompleteFromTasks(milestoneTitle: string, tasks: { title: string; status: ProjectTaskStatus | string }[], projectType?: OpportunityType | string | null) {
  const linkedTask = linkedTaskForMilestone(milestoneTitle, projectType);
  if (!linkedTask) return false;
  return tasks.some((task) => task.title === linkedTask && task.status === ProjectTaskStatus.complete);
}

function milestoneComplete(milestones: { title: string; status: ProjectMilestoneStatus | string }[], title: string) {
  const candidates = title === "Customer Kick Off" ? ["Customer Kick Off", "Kick Off"] : [title];
  return milestones.some((milestone) => candidates.includes(milestone.title) && milestone.status === ProjectMilestoneStatus.complete);
}

export function nextStageGateStatus(
  stage: ProjectDeliveryStage,
  input: {
    projectType?: OpportunityType | string | null;
    tasks: { title: string; status: ProjectTaskStatus | string }[];
    milestones: { title: string; status: ProjectMilestoneStatus | string }[];
    closureFormExists: boolean;
  }
) {
  const taskComplete = (title: string) => input.tasks.some((task) => task.title === title && task.status === ProjectTaskStatus.complete);
  switch (stage) {
    case ProjectDeliveryStage.initiation:
      return milestoneComplete(input.milestones, "Customer Kick Off") ? StageGateStatus.complete : StageGateStatus.in_progress;
    case ProjectDeliveryStage.planning:
      return taskComplete("Resource Scheduling") && taskComplete("Equipment Order") ? StageGateStatus.complete : StageGateStatus.not_started;
    case ProjectDeliveryStage.delivery:
      return taskComplete("Deployment Commenced") ? StageGateStatus.complete : StageGateStatus.not_started;
    case ProjectDeliveryStage.validation:
      return input.projectType === OpportunityType.marriott_gpns && !milestoneComplete(input.milestones, "UAT Complete") ? StageGateStatus.not_started : StageGateStatus.complete;
    case ProjectDeliveryStage.handover:
      return milestoneComplete(input.milestones, "Handover") ? StageGateStatus.complete : StageGateStatus.not_started;
    case ProjectDeliveryStage.closure:
      return milestoneComplete(input.milestones, "Closure") && input.closureFormExists ? StageGateStatus.complete : StageGateStatus.not_started;
    default:
      return StageGateStatus.not_started;
  }
}
