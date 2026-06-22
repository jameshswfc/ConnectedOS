import { LeaveStatus, LeaveType } from "@prisma/client";
import { z } from "zod";

const requiredDate = z.preprocess((value) => value instanceof Date ? value : new Date(String(value)), z.date());

export const leaveRequestCreateSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  startDate: requiredDate,
  endDate: requiredDate,
  leaveType: z.nativeEnum(LeaveType),
  reason: z.string().optional().nullable(),
  status: z.nativeEnum(LeaveStatus).default(LeaveStatus.draft)
});

export const leaveApprovalSchema = z.object({
  rejectionReason: z.string().optional().nullable()
});

const leaveRejectionReasonMessage = "Unable to reject leave request. Please add a rejection reason and try again.";

export const leaveRejectionSchema = z.object({
  rejectionReason: z.string({
    required_error: leaveRejectionReasonMessage,
    invalid_type_error: leaveRejectionReasonMessage
  }).trim().min(1, leaveRejectionReasonMessage)
});

export type LeaveRequestCreateInput = z.infer<typeof leaveRequestCreateSchema>;
