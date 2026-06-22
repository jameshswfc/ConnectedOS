import { z } from "zod";
import { defaultOpportunityStage, opportunityStageValues } from "@/modules/crm/opportunities/opportunity-stages";
import { opportunityTypeValues } from "@/modules/crm/opportunities/opportunity-types";

export const accountTypeSchema = z.enum(["prospect", "customer", "partner", "supplier", "former_customer"]);
export const accountStatusSchema = z.enum(["prospect", "active_customer", "partner", "supplier", "inactive", "former_customer"]);
export const contactStatusSchema = z.enum(["active", "inactive"]);
export const relationshipStrengthSchema = z.enum(["unknown", "weak", "medium", "strong", "secured", "preferred_partner", "only_partner"]);
export const leadStatusSchema = z.enum(["new", "contacted", "qualified", "disqualified", "converted"]);
export const opportunityStageSchema = z.enum(opportunityStageValues);
export const opportunityStatusSchema = z.enum(["open", "won", "lost", "inactive"]);
export const opportunityTypeSchema = z.enum(opportunityTypeValues);
export const opportunitySourceSchema = z.enum([
  "referral",
  "linkedin",
  "website",
  "existing_customer",
  "partner",
  "manufacturer",
  "tender_portal",
  "cold_outreach",
  "conference_event",
  "other"
]);
export const salesActivityTypeSchema = z.enum(["call", "email", "meeting", "task", "note"]);

const optionalString = z.string().trim().optional().nullable();
const optionalDate = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? new Date(value) : null));
const optionalNumber = z.coerce.number().optional().nullable();

export const accountCreateSchema = z.object({
  name: z.string().trim().min(1),
  accountType: accountTypeSchema.default("prospect"),
  status: accountStatusSchema.default("prospect"),
  website: optionalString,
  phone: optionalString,
  addressLine1: optionalString,
  addressLine2: optionalString,
  city: optionalString,
  county: optionalString,
  postcode: optionalString,
  country: optionalString,
  industry: optionalString,
  ownerId: z.string().uuid().optional(),
  notes: optionalString
});

export const accountUpdateSchema = accountCreateSchema.partial();

export const contactCreateSchema = z.object({
  accountId: z.string().uuid(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  jobTitle: optionalString,
  email: optionalString,
  phone: optionalString,
  mobile: optionalString,
  linkedinUrl: optionalString,
  isPrimary: z.coerce.boolean().default(false),
  relationshipStrength: relationshipStrengthSchema.default("unknown"),
  notes: optionalString,
  status: contactStatusSchema.default("active")
});

export const contactUpdateSchema = contactCreateSchema.partial();

export const leadCreateSchema = z.object({
  accountId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  accountName: optionalString,
  contactName: optionalString,
  email: optionalString,
  phone: optionalString,
  source: optionalString,
  status: leadStatusSchema.default("new"),
  estimatedValue: optionalNumber,
  ownerId: z.string().uuid().optional(),
  nextActionDate: optionalDate
});

export const leadUpdateSchema = leadCreateSchema.partial();

export const opportunityCreateSchema = z.object({
  accountId: z.string().uuid(),
  primaryContactId: z.string().uuid().optional().nullable(),
  ownerId: z.string().uuid().optional(),
  opportunityName: z.string().trim().min(1),
  opportunityType: opportunityTypeSchema.default("other"),
  stage: opportunityStageSchema.default(defaultOpportunityStage),
  status: opportunityStatusSchema.default("open"),
  value: z.coerce.number().min(0).default(0),
  marginPercent: optionalNumber,
  probabilityPercent: z.coerce.number().int().min(0).max(100).default(0),
  expectedCloseDate: optionalDate,
  source: opportunitySourceSchema.default("other"),
  competitor: optionalString,
  nextActionDate: optionalDate,
  lostReason: optionalString,
  notes: optionalString
});

export const opportunityUpdateSchema = opportunityCreateSchema.partial();

export const opportunityStageChangeSchema = z.object({
  stage: opportunityStageSchema
});

export const salesActivityCreateSchema = z.object({
  accountId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  opportunityId: z.string().uuid().optional().nullable(),
  ownerId: z.string().uuid().optional(),
  activityType: salesActivityTypeSchema,
  subject: z.string().trim().min(1),
  description: optionalString,
  dueDate: optionalDate,
  outcome: optionalString
});

export const salesActivityUpdateSchema = salesActivityCreateSchema.partial();

export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type OpportunityCreateInput = z.infer<typeof opportunityCreateSchema>;
export type OpportunityUpdateInput = z.infer<typeof opportunityUpdateSchema>;
export type OpportunityStageChangeInput = z.infer<typeof opportunityStageChangeSchema>;
export type SalesActivityCreateInput = z.infer<typeof salesActivityCreateSchema>;
export type SalesActivityUpdateInput = z.infer<typeof salesActivityUpdateSchema>;
