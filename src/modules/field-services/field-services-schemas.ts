import { BookingConflictStatus, ResourceBookingStatus, ResourceBookingType, ResourceType } from "@prisma/client";
import { z } from "zod";

const optionalDate = z.preprocess((value) => value === "" || value == null ? undefined : new Date(String(value)), z.date().optional());
const requiredDate = z.preprocess((value) => value instanceof Date ? value : new Date(String(value)), z.date());
const optionalNumber = z.preprocess((value) => value === "" || value == null ? undefined : Number(value), z.number().nonnegative().optional());

export const resourceCreateSchema = z.object({
  resourceType: z.nativeEnum(ResourceType),
  userId: z.string().uuid().optional().nullable(),
  displayName: z.string().min(1),
  companyName: z.string().optional().nullable(),
  roleType: z.string().optional().nullable(),
  skillTags: z.array(z.string().trim().min(1)).default([]),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  agentName: z.string().optional().nullable(),
  agentPhone: z.string().optional().nullable(),
  agentEmail: z.string().email().optional().nullable(),
  standardDayCost: optionalNumber.default(0),
  standardDaySell: optionalNumber.default(0),
  halfDayCost: optionalNumber.default(0),
  halfDaySell: optionalNumber.default(0),
  hourlyCost: optionalNumber.default(0),
  hourlySell: optionalNumber.default(0),
  notes: z.string().optional().nullable(),
  active: z.coerce.boolean().default(true)
});

export const resourceUpdateSchema = resourceCreateSchema.partial();

export const resourceBookingCreateSchema = z.object({
  resourceId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  opportunityId: z.string().uuid().optional().nullable(),
  helpdeskTicketId: z.string().uuid().optional().nullable(),
  bookingType: z.nativeEnum(ResourceBookingType),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  startDate: requiredDate,
  endDate: requiredDate,
  startTime: optionalDate,
  endTime: optionalDate,
  costRate: optionalNumber.default(0),
  sellRate: optionalNumber.default(0),
  chargeable: z.coerce.boolean().default(true),
  status: z.nativeEnum(ResourceBookingStatus).default(ResourceBookingStatus.draft),
  conflictStatus: z.nativeEnum(BookingConflictStatus).optional(),
  overrideReason: z.string().optional().nullable(),
  overrideConflict: z.coerce.boolean().default(false)
});

export const resourceBookingUpdateSchema = resourceBookingCreateSchema.partial();

export type ResourceCreateInput = z.infer<typeof resourceCreateSchema>;
export type ResourceUpdateInput = z.infer<typeof resourceUpdateSchema>;
export type ResourceBookingCreateInput = z.infer<typeof resourceBookingCreateSchema>;
export type ResourceBookingUpdateInput = z.infer<typeof resourceBookingUpdateSchema>;
