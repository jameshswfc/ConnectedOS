import { prisma } from "@/lib/prisma";

export type ResourceConflict = {
  assignmentId: string;
  projectId: string;
  projectNumber: string;
  projectName: string;
  startDate: Date;
  endDate: Date;
  role: string;
  scheduledDays: number;
  conflictType?: "project_assignment" | "leave";
};

export async function detectResourceConflicts(
  resourceId: string,
  startDate: Date,
  endDate: Date,
  excludeProjectId?: string,
  userId?: string | null
): Promise<ResourceConflict[]> {
  const assignments = await prisma.projectResourceAssignment.findMany({
    where: {
      OR: [
        { resourceId },
        ...(userId ? [{ userId }] : [])
      ],
      deletedAt: null,
      project: {
        deletedAt: null,
        status: { notIn: ["completed", "closed", "cancelled"] },
        ...(excludeProjectId ? { id: { not: excludeProjectId } } : {})
      },
      startDate: { lte: endDate },
      endDate: { gte: startDate }
    },
    include: { project: true },
    orderBy: { startDate: "asc" }
  });
  return assignments.map((assignment) => ({
    assignmentId: assignment.id,
    projectId: assignment.projectId,
    projectNumber: assignment.project.projectNumber,
    projectName: assignment.project.name,
    startDate: assignment.startDate,
    endDate: assignment.endDate,
    role: assignment.role,
    scheduledDays: Number(assignment.scheduledDays),
    conflictType: "project_assignment"
  }));
}

export function hasResourceConflict(conflicts: ResourceConflict[]) {
  return conflicts.length > 0;
}
