import {
  PresalesCommercialPriority,
  PresalesPriority,
  PresalesRequestCategory,
  PresalesRequestStatus,
  PresalesRequestType,
  PresalesTaskStatus
} from "@prisma/client";
import { z } from "zod";

const emptyToUndefined = (value: unknown) => value === "" || value === null ? undefined : value;
const optionalDate = z.preprocess(emptyToUndefined, z.coerce.date().optional());
const requiredDate = z.coerce.date();
const optionalNumber = z.preprocess(emptyToUndefined, z.coerce.number().nonnegative().optional());

export const presalesRequestCreateSchema = z.object({
  accountId: z.string().uuid(),
  opportunityId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  quoteId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  assignedToId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  requestCategory: z.nativeEnum(PresalesRequestCategory),
  requestType: z.nativeEnum(PresalesRequestType),
  priority: z.nativeEnum(PresalesPriority).default(PresalesPriority.normal),
  commercialPriority: z.nativeEnum(PresalesCommercialPriority).default(PresalesCommercialPriority.normal),
  requestedDeliveryDate: optionalDate,
  internalDeadline: requiredDate,
  estimatedHours: optionalNumber,
  description: z.string().trim().min(1)
});

export const presalesRequestUpdateSchema = presalesRequestCreateSchema.partial().extend({
  actualHours: optionalNumber,
  readyForProject: z.boolean().optional()
});

export const presalesAssignSchema = z.object({
  assignedToId: z.string().uuid()
});

export const presalesStatusChangeSchema = z.object({
  status: z.nativeEnum(PresalesRequestStatus),
  actualHours: optionalNumber
});

export const presalesTaskCreateSchema = z.object({
  title: z.string().trim().min(1),
  description: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  assignedToId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  dueDate: optionalDate
});

export const presalesTaskUpdateSchema = presalesTaskCreateSchema.partial().extend({
  status: z.nativeEnum(PresalesTaskStatus).optional()
});

export const presalesDocumentCreateSchema = z.object({
  fileName: z.string().trim().min(1),
  fileType: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  sizeBytes: z.preprocess(emptyToUndefined, z.coerce.number().int().nonnegative().optional())
});

export const presalesCommentCreateSchema = z.object({
  body: z.string().trim().min(1)
});

export type PresalesRequestCreateInput = z.infer<typeof presalesRequestCreateSchema>;
export type PresalesRequestUpdateInput = z.infer<typeof presalesRequestUpdateSchema>;
export type PresalesAssignInput = z.infer<typeof presalesAssignSchema>;
export type PresalesStatusChangeInput = z.infer<typeof presalesStatusChangeSchema>;
export type PresalesTaskCreateInput = z.infer<typeof presalesTaskCreateSchema>;
export type PresalesTaskUpdateInput = z.infer<typeof presalesTaskUpdateSchema>;
export type PresalesDocumentCreateInput = z.infer<typeof presalesDocumentCreateSchema>;
export type PresalesCommentCreateInput = z.infer<typeof presalesCommentCreateSchema>;

