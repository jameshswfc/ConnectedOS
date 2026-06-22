import { z } from "zod";
import { DEFAULT_QUOTE_TERMS } from "@/modules/quoting/quotes/quote-terms";

export const quoteStatusSchema = z.enum(["draft", "internal_review", "approved", "rejected", "sent", "accepted", "declined", "expired"]);
export const quoteLineTypeSchema = z.enum(["product", "labour", "service", "note"]);
export const catalogueItemTypeSchema = z.enum(["product", "labour", "service"]);

const optionalString = z.string().trim().optional().nullable();
const optionalNumber = z.coerce.number().optional().nullable();
const quoteLineQuantitySchema = z.coerce.number().int().min(1);

export const productCreateSchema = z.object({
  sku: z.string().trim().min(1),
  manufacturer: z.string().trim().min(1),
  supplier: z.string().trim().min(1),
  supplierId: z.string().uuid().optional().nullable(),
  category: z.string().trim().min(1),
  description: z.string().trim().min(1),
  itemType: catalogueItemTypeSchema.default("product"),
  costPrice: z.coerce.number().min(0),
  defaultSellPrice: z.coerce.number().min(0),
  marginPercent: z.coerce.number().min(-100).max(100).default(0),
  leadTimeDays: z.coerce.number().int().min(0).optional().nullable(),
  isActive: z.coerce.boolean().default(true)
});

export const productUpdateSchema = productCreateSchema.partial();

export const quoteCreateSchema = z.object({
  opportunityId: z.string().uuid(),
  contactId: z.string().uuid(),
  ownerId: z.string().uuid().optional(),
  title: z.string().trim().min(1),
  projectName: optionalString,
  highLevelScope: z.string().trim().min(1, "High Level Scope is required"),
  preparedDate: z.coerce.date().optional().nullable(),
  status: quoteStatusSchema.default("draft"),
  notes: optionalString
});

export const quoteUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  customerName: optionalString,
  hotelName: optionalString,
  projectName: optionalString,
  highLevelScope: z.string().trim().min(1).optional(),
  preparedDate: z.coerce.date().optional().nullable(),
  status: quoteStatusSchema.optional(),
  notes: optionalString
});

export const quoteStatusChangeSchema = z.object({
  status: quoteStatusSchema
});

export const quoteVersionTermsUpdateSchema = z.object({
  terms: z.string().trim().min(1).default(DEFAULT_QUOTE_TERMS)
});

export const quoteApprovalRejectSchema = z.object({
  comments: z.string().trim().min(1, "Rejection reason is required")
});

export const quoteLineCreateSchema = z.object({
  lineType: quoteLineTypeSchema,
  productId: z.string().uuid().optional().nullable(),
  description: z.string().trim().optional(),
  quantity: quoteLineQuantitySchema.default(1),
  unitCost: optionalNumber,
  unitSell: optionalNumber,
  sortOrder: z.coerce.number().int().min(0).default(0)
});

export const quoteLineUpdateSchema = quoteLineCreateSchema.partial();

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;
export type QuoteUpdateInput = z.infer<typeof quoteUpdateSchema>;
export type QuoteStatusChangeInput = z.infer<typeof quoteStatusChangeSchema>;
export type QuoteVersionTermsUpdateInput = z.infer<typeof quoteVersionTermsUpdateSchema>;
export type QuoteApprovalRejectInput = z.infer<typeof quoteApprovalRejectSchema>;
export type QuoteLineCreateInput = z.infer<typeof quoteLineCreateSchema>;
export type QuoteLineUpdateInput = z.infer<typeof quoteLineUpdateSchema>;
