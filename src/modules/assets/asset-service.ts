import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { assertAnyModulePermission, assertModulePermission, isAdminContext } from "@/modules/operations/module-permissions";
import { assetCreateSchema, assetUpdateSchema } from "@/modules/assets/asset-schemas";
import { createAuditLog } from "@/services/audit/audit-service";

type AssetCreateInput = Prisma.Args<typeof prisma.asset, "create">["data"] & Partial<Prisma.AssetCreateInput>;
type AssetUpdateInput = Prisma.Args<typeof prisma.asset, "update">["data"] & Partial<Prisma.AssetUpdateInput>;

const assetInclude = {
  project: true,
  account: true,
  purchaseOrderLine: { include: { purchaseOrder: true } },
  product: true
} satisfies Prisma.AssetInclude;

export async function listAssets(context: CrmAccessContext) {
  assertAnyModulePermission(context, ["assets.read_all", "assets.read_assigned", "assets.create", "assets.update"]);
  return prisma.asset.findMany({
    where: assetVisibilityWhere(context),
    include: assetInclude,
    orderBy: [{ createdAt: "desc" }]
  });
}

export async function getAsset(context: CrmAccessContext, id: string) {
  assertAnyModulePermission(context, ["assets.read_all", "assets.read_assigned", "assets.create", "assets.update"]);
  const asset = await prisma.asset.findFirst({
    where: { AND: [assetVisibilityWhere(context), { id }] },
    include: assetInclude
  });
  if (!asset) throw new Error("Asset not found");
  return asset;
}

export async function createAsset(context: CrmAccessContext, input: z.input<typeof assetCreateSchema>) {
  assertModulePermission(context, "assets.create");
  const assetNumber = await nextAssetNumber();
  const asset = await prisma.asset.create({
    data: {
      assetNumber,
      ...input
    } as AssetCreateInput,
    include: assetInclude
  });
  await createAuditLog({ userId: context.userId, module: "assets", entityType: "Asset", entityId: asset.id, action: "create", newValue: asset as unknown as Prisma.InputJsonValue });
  return asset;
}

export async function updateAsset(context: CrmAccessContext, id: string, input: z.input<typeof assetUpdateSchema>) {
  assertModulePermission(context, "assets.update");
  const previous = await getAsset(context, id);
  const asset = await prisma.asset.update({
    where: { id },
    data: input as AssetUpdateInput,
    include: assetInclude
  });
  await createAuditLog({ userId: context.userId, module: "assets", entityType: "Asset", entityId: asset.id, action: "update", previousValue: previous as unknown as Prisma.InputJsonValue, newValue: asset as unknown as Prisma.InputJsonValue });
  return asset;
}

async function nextAssetNumber() {
  const year = new Date().getFullYear();
  const prefix = `AST-${year}-`;
  const latest = await prisma.asset.findFirst({ where: { assetNumber: { startsWith: prefix } }, orderBy: { assetNumber: "desc" } });
  return `${prefix}${String(latest ? Number(latest.assetNumber.slice(prefix.length)) + 1 : 1).padStart(4, "0")}`;
}

function assetVisibilityWhere(context: CrmAccessContext): Prisma.AssetWhereInput {
  if (isAdminContext(context) || context.permissions.includes("assets.read_all") || context.permissions.includes("assets.create") || context.permissions.includes("assets.update")) {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: [
      { project: { projectManagerId: context.userId, deletedAt: null } },
      { account: { ownerId: context.userId, deletedAt: null } }
    ]
  };
}
