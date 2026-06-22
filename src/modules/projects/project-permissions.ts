import type { Prisma } from "@prisma/client";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export function assertProjectPermission(context: CrmAccessContext, permission: string) {
  if (hasProjectAdmin(context) || context.permissions.includes(permission)) return;
  throw new Error(`Missing permission: ${permission}`);
}

export function assertAnyProjectPermission(context: CrmAccessContext, permissions: string[]) {
  if (hasProjectAdmin(context) || permissions.some((permission) => context.permissions.includes(permission))) return;
  throw new Error(`Missing permission: ${permissions.join(" or ")}`);
}

export function canReadAllProjects(context: CrmAccessContext) {
  return hasProjectAdmin(context) || context.permissions.includes("projects.read_all");
}

export function canManageProject(context: CrmAccessContext, project: ProjectAccessShape) {
  if (hasProjectAdmin(context) || context.role === "Business Operations") return true;
  if (context.permissions.includes("projects.update")) {
    if (context.role === "Project Manager") return project.projectManagerId === context.userId;
    return true;
  }
  return project.projectManagerId === context.userId || project.tasks?.some((task) => task.assignedToId === context.userId || task.ownerId === context.userId) || project.resourceAssignments?.some((resource) => resource.userId === context.userId);
}

export function projectVisibilityWhere(context: CrmAccessContext): Prisma.ProjectWhereInput {
  if (canReadAllProjects(context)) return { deletedAt: null };
  assertAnyProjectPermission(context, ["projects.read_assigned", "projects.update"]);
  return {
    deletedAt: null,
    OR: [
      { projectManagerId: context.userId },
      { tasks: { some: { deletedAt: null, OR: [{ assignedToId: context.userId }, { ownerId: context.userId }] } } },
      { resourceAssignments: { some: { deletedAt: null, userId: context.userId } } },
      { opportunity: { ownerId: context.userId, deletedAt: null } },
      { quote: { ownerId: context.userId, deletedAt: null } },
      { presalesRequest: { OR: [{ requestedById: context.userId }, { assignedToId: context.userId }] } }
    ]
  };
}

export function assertCanEditProject(context: CrmAccessContext, project: ProjectAccessShape) {
  if (hasProjectAdmin(context)) return;
  if (context.permissions.includes("projects.update") && canManageProject(context, project)) return;
  throw new Error("Missing permission: assigned project access");
}

function hasProjectAdmin(context: CrmAccessContext) {
  return context.permissionLevel === "administrator" || context.permissions.includes("admin.users");
}

type ProjectAccessShape = {
  projectManagerId?: string | null;
  tasks?: { ownerId?: string | null; assignedToId?: string | null }[];
  resourceAssignments?: { userId?: string | null }[];
};
