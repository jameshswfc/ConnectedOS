import {
  ProjectActivityType,
  ProjectDependencyType,
  ProjectDeliveryStage,
  ProjectFinancialEntryStatus,
  ProjectFinancialEntryType,
  ProjectFormType,
  ProjectIssueActionStatus,
  ProjectIssueActionType,
  ProjectMilestoneStatus,
  OpportunityType,
  ProjectPriority,
  ProjectResourceRole,
  ProjectStatus,
  ProjectTaskStatus,
  StageGateStatus
} from "@prisma/client";
import { z } from "zod";

const optionalDate = z.preprocess((value) => value === "" || value == null ? undefined : new Date(String(value)), z.date().optional());
const requiredDate = z.preprocess((value) => value instanceof Date ? value : new Date(String(value)), z.date());
const optionalNumber = z.preprocess((value) => value === "" || value == null ? undefined : Number(value), z.number().nonnegative().optional());

export const projectCreateFromQuoteSchema = z.object({
  projectType: z.nativeEnum(OpportunityType).optional(),
  templateId: z.string().uuid().optional().nullable(),
  projectManagerId: z.string().uuid().optional().nullable(),
  startDate: optionalDate,
  targetEndDate: optionalDate,
  baselineStartDate: optionalDate,
  baselineEndDate: optionalDate,
  description: z.string().optional().nullable(),
  scopeSummary: z.string().optional().nullable(),
  totalResourceDaysBudget: optionalNumber,
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.draft)
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  projectType: z.nativeEnum(OpportunityType).optional(),
  projectManagerId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
  startDate: optionalDate.nullable(),
  targetEndDate: optionalDate.nullable(),
  baselineStartDate: optionalDate.nullable(),
  baselineEndDate: optionalDate.nullable(),
  actualStartDate: optionalDate.nullable(),
  actualEndDate: optionalDate.nullable(),
  description: z.string().optional().nullable(),
  scopeSummary: z.string().optional().nullable(),
  totalResourceDaysBudget: optionalNumber,
  invoicedAmount: optionalNumber,
  collectedAmount: optionalNumber,
  paymentTerms: z.string().optional().nullable()
});

export const projectTaskCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(ProjectTaskStatus).default(ProjectTaskStatus.not_started),
  ownerId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  startDate: requiredDate,
  endDate: requiredDate,
  estimatedDays: optionalNumber,
  actualDays: optionalNumber.default(0),
  sortOrder: z.coerce.number().int().default(0)
});

export const projectTaskUpdateSchema = projectTaskCreateSchema.partial();

export const projectDependencyCreateSchema = z.object({
  successorTaskId: z.string().uuid(),
  dependencyType: z.nativeEnum(ProjectDependencyType).default(ProjectDependencyType.finish_to_start),
  lagDays: z.coerce.number().int().min(0).default(0)
});

export const projectResourceCreateSchema = z.object({
  resourceId: z.string().uuid(),
  role: z.nativeEnum(ProjectResourceRole).default(ProjectResourceRole.project_engineer),
  startDate: requiredDate,
  endDate: requiredDate,
  scheduledDays: optionalNumber,
  usedDays: optionalNumber.default(0),
  notes: z.string().optional().nullable(),
  conflictOverride: z.coerce.boolean().default(false),
  conflictOverrideNote: z.string().optional().nullable()
});

export const projectResourceUpdateSchema = projectResourceCreateSchema.partial();

export const projectMilestoneCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  milestoneDate: requiredDate,
  baselineDate: optionalDate,
  manualDateOverride: z.coerce.boolean().default(false),
  status: z.nativeEnum(ProjectMilestoneStatus).default(ProjectMilestoneStatus.not_started),
  ownerId: z.string().uuid().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0)
});

export const projectMilestoneUpdateSchema = projectMilestoneCreateSchema.partial().extend({
  completedAt: optionalDate.nullable()
});

export const projectStageGateUpdateSchema = z.object({
  stage: z.nativeEnum(ProjectDeliveryStage).optional(),
  status: z.nativeEnum(StageGateStatus).optional(),
  notes: z.string().optional().nullable()
});

export const projectResourceConflictCheckSchema = z.object({
  resourceId: z.string().uuid(),
  startDate: requiredDate,
  endDate: requiredDate
});

export const projectIssueActionCreateSchema = z.object({
  type: z.nativeEnum(ProjectIssueActionType),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(ProjectIssueActionStatus).default(ProjectIssueActionStatus.open),
  priority: z.nativeEnum(ProjectPriority).default(ProjectPriority.normal),
  dueDate: optionalDate,
  resolution: z.string().optional().nullable()
});

export const projectIssueActionUpdateSchema = projectIssueActionCreateSchema.partial();

export const projectActivityCreateSchema = z.object({
  activityType: z.nativeEnum(ProjectActivityType),
  subject: z.string().min(1),
  description: z.string().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  startDate: optionalDate,
  endDate: optionalDate,
  outcome: z.string().optional().nullable()
});

export const projectFinancialEntrySchema = z.object({
  type: z.nativeEnum(ProjectFinancialEntryType),
  description: z.string().min(1),
  amount: optionalNumber.default(0),
  status: z.nativeEnum(ProjectFinancialEntryStatus).default(ProjectFinancialEntryStatus.planned),
  reference: z.string().optional().nullable(),
  expectedDate: optionalDate,
  actualDate: optionalDate
});

export const projectFormCreateSchema = z.object({
  formType: z.nativeEnum(ProjectFormType),
  title: z.string().min(1),
  formDate: optionalDate,
  content: z.record(z.string(), z.unknown()).default({})
});

export const projectTaskTemplateSchema = z.object({
  name: z.string().min(1),
  projectType: z.string().min(1),
  isActive: z.coerce.boolean().default(true),
  items: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    defaultOwnerRole: z.nativeEnum(ProjectResourceRole).optional().nullable(),
    offsetDaysFromStart: z.coerce.number().int().default(0),
    defaultDurationDays: z.coerce.number().int().min(1).default(1),
    sortOrder: z.coerce.number().int().default(0)
  })).default([])
});

export type ProjectCreateFromQuoteInput = z.infer<typeof projectCreateFromQuoteSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ProjectTaskCreateInput = z.infer<typeof projectTaskCreateSchema>;
export type ProjectTaskUpdateInput = z.infer<typeof projectTaskUpdateSchema>;
export type ProjectResourceCreateInput = z.infer<typeof projectResourceCreateSchema>;
export type ProjectResourceUpdateInput = z.infer<typeof projectResourceUpdateSchema>;
export type ProjectMilestoneCreateInput = z.infer<typeof projectMilestoneCreateSchema>;
export type ProjectMilestoneUpdateInput = z.infer<typeof projectMilestoneUpdateSchema>;
export type ProjectStageGateUpdateInput = z.infer<typeof projectStageGateUpdateSchema>;
export type ProjectIssueActionCreateInput = z.infer<typeof projectIssueActionCreateSchema>;
export type ProjectIssueActionUpdateInput = z.infer<typeof projectIssueActionUpdateSchema>;
export type ProjectFormCreateInput = z.infer<typeof projectFormCreateSchema>;
export type ProjectFinancialEntryInput = z.infer<typeof projectFinancialEntrySchema>;
