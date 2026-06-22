import { BillingScheduleStatus, BillingScheduleTrigger, CustomerInvoiceStatus } from "@prisma/client";
import { z } from "zod";

const optionalDate = z.preprocess((value) => value === "" || value == null ? undefined : new Date(String(value)), z.date().optional());

export const customerInvoiceCreateSchema = z.object({
  accountId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  quoteId: z.string().uuid().optional().nullable(),
  issueDate: optionalDate,
  dueDate: optionalDate,
  amount: z.coerce.number().nonnegative(),
  vatAmount: z.coerce.number().nonnegative().default(0),
  currency: z.string().default("GBP"),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(CustomerInvoiceStatus).default(CustomerInvoiceStatus.draft)
});

export const paymentCreateSchema = z.object({
  paymentDate: z.preprocess((value) => value instanceof Date ? value : new Date(String(value)), z.date()),
  amount: z.coerce.number().nonnegative(),
  method: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const billingScheduleCreateSchema = z.object({
  projectId: z.string().uuid(),
  description: z.string().min(1),
  trigger: z.nativeEnum(BillingScheduleTrigger),
  percentage: z.coerce.number().nonnegative().optional().nullable(),
  amount: z.coerce.number().nonnegative(),
  dueDate: optionalDate,
  status: z.nativeEnum(BillingScheduleStatus).default(BillingScheduleStatus.pending)
});
