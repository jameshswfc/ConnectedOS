import { PurchaseOrderStatus, SupplierInvoiceStatus } from "@prisma/client";
import { z } from "zod";

const optionalDate = z.preprocess((value) => value === "" || value == null ? undefined : new Date(String(value)), z.date().optional());
const optionalNumber = z.preprocess((value) => value === "" || value == null ? undefined : Number(value), z.number().nonnegative().optional());
const optionalEmail = z.preprocess((value) => value === "" || value == null ? undefined : String(value), z.string().email().optional());

export const supplierCreateSchema = z.object({
  name: z.string().min(1),
  accountId: z.string().uuid().optional().nullable(),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  accountManager: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  categoriesSupplied: z.string().optional().nullable(),
  defaultCurrency: z.string().default("GBP"),
  active: z.coerce.boolean().default(true),
  notes: z.string().optional().nullable()
});

export const supplierUpdateSchema = supplierCreateSchema.partial();

export const purchaseOrderCreateSchema = z.object({
  supplierId: z.string().uuid(),
  supplierName: z.string().min(1).optional(),
  supplierAddress: z.string().optional().nullable(),
  supplierContactName: z.string().optional().nullable(),
  supplierContactEmail: optionalEmail,
  deliveryAddress: z.string().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  quoteId: z.string().uuid().optional().nullable(),
  changeRequestId: z.string().uuid().optional().nullable(),
  requestedById: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(PurchaseOrderStatus).default(PurchaseOrderStatus.draft),
  orderDate: optionalDate,
  expectedDeliveryDate: optionalDate,
  currency: z.string().default("GBP"),
  notes: z.string().optional().nullable(),
  lines: z.array(z.object({
    productId: z.string().uuid().optional().nullable(),
    sku: z.string().optional().nullable(),
    manufacturer: z.string().optional().nullable(),
    description: z.string().min(1),
    quantity: z.coerce.number().positive(),
    unitCost: z.coerce.number().nonnegative(),
    taxRate: z.coerce.number().nonnegative().default(20)
  })).min(1).default([])
});

export const purchaseOrderStatusSchema = z.object({
  status: z.nativeEnum(PurchaseOrderStatus),
  notes: z.string().optional().nullable()
});

export const supplierInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1),
  invoiceDate: z.preprocess((value) => value instanceof Date ? value : new Date(String(value)), z.date()),
  dueDate: optionalDate,
  amount: z.coerce.number().nonnegative(),
  status: z.nativeEnum(SupplierInvoiceStatus).default(SupplierInvoiceStatus.received)
});

export const goodsReceiptSchema = z.object({
  notes: z.string().optional().nullable()
});

export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
export type PurchaseOrderCreateInput = z.infer<typeof purchaseOrderCreateSchema>;
