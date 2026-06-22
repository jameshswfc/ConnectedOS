import type { Prisma } from "@prisma/client";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export function assertQuotePermission(context: CrmAccessContext, permission: string) {
  if (!context.permissions.includes(permission) && !context.permissions.includes("admin.users") && context.permissionLevel !== "administrator") {
    throw new Error(`Missing permission: ${permission}`);
  }
}

export function assertAnyQuotePermission(context: CrmAccessContext, permissions: string[]) {
  if (context.permissions.includes("admin.users") || context.permissionLevel === "administrator") return;
  if (!permissions.some((permission) => context.permissions.includes(permission))) {
    throw new Error(`Missing permission: ${permissions.join(" or ")}`);
  }
}

export function quoteVisibilityWhere(context: CrmAccessContext): Prisma.QuoteWhereInput {
  if (context.role === "Sales") {
    return { deletedAt: null, ownerId: context.userId };
  }

  if (context.permissions.includes("quotes.read_all") || context.permissions.includes("admin.users") || context.permissionLevel === "administrator") {
    return { deletedAt: null };
  }

  assertQuotePermission(context, "quotes.read_own");
  return { deletedAt: null, ownerId: context.userId };
}

export function assertCanEditQuote(context: CrmAccessContext, quote: { ownerId?: string | null }) {
  if (context.permissionLevel === "administrator" || context.permissions.includes("admin.users")) return;
  if (quote.ownerId === context.userId) return;
  throw new Error("Missing permission: assigned quote access");
}

export function productVisibilityWhere(): Prisma.ProductWhereInput {
  return { deletedAt: null };
}
