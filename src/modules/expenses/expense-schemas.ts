import { ExpenseCategory, ExpenseClaimStatus } from "@prisma/client";
import { z } from "zod";

const optionalDate = z.preprocess((value) => value === "" || value == null ? undefined : new Date(String(value)), z.date().optional());
const requiredDate = z.preprocess((value) => value instanceof Date ? value : new Date(String(value)), z.date());
const optionalNumber = z.preprocess((value) => value === "" || value == null ? undefined : Number(value), z.number().nonnegative().optional());

export const expenseClaimCreateSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  resourceBookingId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  currency: z.string().default("GBP"),
  notes: z.string().optional().nullable()
});

export const expenseLineCreateSchema = z.object({
  expenseDate: requiredDate,
  category: z.nativeEnum(ExpenseCategory),
  description: z.string().min(1),
  amount: z.coerce.number().nonnegative(),
  vatAmount: optionalNumber,
  currency: z.string().default("GBP"),
  mileageMiles: optionalNumber,
  mileageRate: optionalNumber,
  mileageFrom: z.string().optional().nullable(),
  mileageTo: z.string().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  resourceBookingId: z.string().uuid().optional().nullable()
});

export const expenseClaimStatusSchema = z.object({
  notes: z.string().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
  status: z.nativeEnum(ExpenseClaimStatus)
});

export type ExpenseClaimCreateInput = z.infer<typeof expenseClaimCreateSchema>;
export type ExpenseLineCreateInput = z.infer<typeof expenseLineCreateSchema>;
