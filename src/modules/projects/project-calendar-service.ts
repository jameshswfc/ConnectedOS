import { projectResourceDisplayName } from "@/modules/projects/project-resource-label";

export function buildProjectCalendarData(project: {
  tasks: { id: string; title: string; startDate: Date; endDate: Date; status: string }[];
  milestones: { id: string; title: string; milestoneDate: Date; status: string; deletedAt?: Date | null }[];
  resourceAssignments: { id: string; role: string; startDate: Date; endDate: Date; user?: { displayName: string } | null; resource?: { displayName: string; user?: { displayName?: string | null } | null } | null }[];
  forms: { id: string; formType: string; title: string; formDate: Date }[];
}) {
  return [
    ...project.tasks.map((task) => ({ id: task.id, type: "task" as const, title: task.title, startDate: task.startDate, endDate: task.endDate, status: task.status })),
    ...project.milestones.filter((milestone) => !milestone.deletedAt).map((milestone) => ({ id: milestone.id, type: "milestone" as const, title: milestone.title, startDate: milestone.milestoneDate, endDate: milestone.milestoneDate, status: milestone.status })),
    ...project.resourceAssignments.map((resource) => ({ id: resource.id, type: "resource" as const, title: `${projectResourceDisplayName(resource)} - ${resource.role}`, startDate: resource.startDate, endDate: resource.endDate, status: "scheduled" })),
    ...project.forms.map((form) => ({ id: form.id, type: "form" as const, title: form.title, startDate: form.formDate, endDate: form.formDate, status: form.formType }))
  ].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}
