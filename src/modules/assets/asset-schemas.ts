import { AssetStatus } from "@prisma/client";
import { z } from "zod";

const optionalDate = z.preprocess((value) => value === "" || value == null ? undefined : new Date(String(value)), z.date().optional());

export const assetCreateSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  purchaseOrderLineId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  sku: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  macAddress: z.string().optional().nullable(),
  description: z.string().min(1),
  status: z.nativeEnum(AssetStatus).default(AssetStatus.required),
  location: z.string().optional().nullable(),
  warrantyStart: optionalDate,
  warrantyEnd: optionalDate,
  notes: z.string().optional().nullable()
});

export const assetUpdateSchema = assetCreateSchema.partial();
