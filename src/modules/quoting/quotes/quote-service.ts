import { QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit/audit-service";
import { opportunityVisibilityWhere } from "@/modules/crm/crm-permissions";
import { canSelectSalesperson, isSalesRoleUser, resolveSalespersonScope } from "@/modules/crm/sales/salesperson-service";
import { expireSentQuotes } from "@/modules/quoting/quotes/quote-expiry-service";
import { calculateQuoteLine, calculateQuoteTotals } from "@/modules/quoting/quotes/quote-calculations";
import { assertAnyQuotePermission, assertCanEditQuote, assertQuotePermission, quoteVisibilityWhere } from "@/modules/quoting/quotes/quote-permissions";
import { presalesVisibilityWhere } from "@/modules/presales/presales-permissions";
import { DEFAULT_QUOTE_TERMS } from "@/modules/quoting/quotes/quote-terms";
import { createProjectChangeRequestFromQuoteChange } from "@/modules/projects/project-change-request-automation";
import { syncProjectChangeRequestFromQuote } from "@/modules/projects/project-service";
import type { QuoteCreateInput, QuoteLineCreateInput, QuoteLineUpdateInput, QuoteUpdateInput, QuoteVersionTermsUpdateInput } from "@/modules/quoting/schemas/quoting-schemas";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

const quoteInclude = {
  account: true,
  opportunity: true,
  contact: true,
  owner: true,
  versions: {
    include: {
      lines: { where: { deletedAt: null }, include: { product: true }, orderBy: { sortOrder: "asc" } }
    },
    orderBy: { versionNumber: "desc" }
  },
  approvalRequests: { include: { requestedBy: true, approver: true }, orderBy: { requestedAt: "desc" } },
  exports: { include: { generatedBy: true }, orderBy: { generatedAt: "desc" } },
  projects: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
  presalesRequests: { include: { account: true, opportunity: true, assignedTo: true }, orderBy: { updatedAt: "desc" } }
} as const;

export const quoteLineAuditActions = {
  edited: "quote_line_edited",
  deleted: "quote_line_deleted"
} as const;

export type QuoteListFilters = {
  search?: string;
  salespersonId?: string | null;
  myQuotes?: boolean;
};

export async function listQuotes(context: CrmAccessContext, filters: string | QuoteListFilters = {}) {
  assertAnyQuotePermission(context, ["quotes.read_all", "quotes.read_own"]);
  await expireSentQuotes();
  const normalizedFilters = typeof filters === "string" ? { search: filters } : filters;
  const salespersonScope = resolveSalespersonScope(context, normalizedFilters.salespersonId);
  const ownerFilter =
    normalizedFilters.myQuotes || isSalesRoleUser(context)
      ? { ownerId: context.userId }
      : canSelectSalesperson(context) && salespersonScope.selectedSalespersonId
        ? { ownerId: salespersonScope.selectedSalespersonId }
        : {};
  return prisma.quote.findMany({
    where: {
      AND: [
        quoteVisibilityWhere(context),
        ownerFilter,
        normalizedFilters.search
          ? {
              OR: [
                { quoteNumber: { contains: normalizedFilters.search, mode: "insensitive" } },
                { title: { contains: normalizedFilters.search, mode: "insensitive" } },
                { account: { name: { contains: normalizedFilters.search, mode: "insensitive" } } },
                { opportunity: { opportunityName: { contains: normalizedFilters.search, mode: "insensitive" } } }
              ]
            }
          : {}
      ]
    },
    include: { account: true, opportunity: true, owner: true },
    orderBy: { updatedAt: "desc" }
  });
}

export async function getQuote(context: CrmAccessContext, id: string) {
  assertAnyQuotePermission(context, ["quotes.read_all", "quotes.read_own"]);
  const quote = await prisma.quote.findFirst({
    where: { AND: [quoteVisibilityWhere(context), { id }] },
    include: { ...quoteInclude, presalesRequests: { where: presalesVisibilityWhere(context), include: { account: true, opportunity: true, assignedTo: true }, orderBy: { updatedAt: "desc" } } }
  });
  if (!quote) throw new Error("Quote not found");
  return quote;
}

export async function createQuote(context: CrmAccessContext, input: QuoteCreateInput) {
  assertQuotePermission(context, "quotes.create");
  const opportunity = await assertCanUseQuoteOpportunity(context, input.opportunityId);
  const contact = await prisma.contact.findFirst({
    where: { id: input.contactId, accountId: opportunity.accountId, deletedAt: null }
  });
  if (!contact) throw new Error("Contact must belong to the selected opportunity account");

  const quote = await prisma.$transaction(async (transaction) => {
    const quoteNumber = await nextQuoteNumber();
    const createdQuote = await transaction.quote.create({
      data: {
        quoteNumber,
        title: input.title,
        ...deriveQuoteCrmFields(opportunity),
        projectName: input.projectName,
        highLevelScope: input.highLevelScope,
        preparedDate: input.preparedDate,
        opportunityId: opportunity.id,
        contactId: contact.id,
        ownerId: opportunity.ownerId ?? context.userId,
        status: input.status,
        notes: input.highLevelScope,
        createdById: context.userId,
        updatedById: context.userId
      }
    });

    await transaction.quoteVersion.create({
      data: {
        quoteId: createdQuote.id,
        versionNumber: 1,
        status: "draft",
        notes: input.highLevelScope,
        terms: DEFAULT_QUOTE_TERMS,
        createdById: context.userId,
        updatedById: context.userId
      }
    });

    await transaction.salesActivity.create({
      data: {
        accountId: opportunity.accountId,
        opportunityId: opportunity.id,
        contactId: contact.id,
        ownerId: opportunity.ownerId ?? context.userId,
        activityType: "note",
        subject: `Quote ${createdQuote.quoteNumber} created`,
        description: `Quote ${createdQuote.quoteNumber} created for ${createdQuote.title}. Link: /quotes/${createdQuote.id}`,
        completedAt: new Date(),
        outcome: `Quote created: /quotes/${createdQuote.id}`,
        createdById: context.userId,
        updatedById: context.userId
      }
    });

    return createdQuote;
  });

  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "Quote", entityId: quote.id, action: "create", newValue: quote });
  return getQuote(context, quote.id);
}

export async function updateQuote(context: CrmAccessContext, id: string, input: QuoteUpdateInput) {
  assertQuotePermission(context, "quotes.update");
  const previous = await getQuote(context, id);
  assertCanEditQuote(context, previous);
  const quote = await prisma.quote.update({
    where: { id },
    data: { ...input, updatedById: context.userId }
  });
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "Quote", entityId: quote.id, action: "update", previousValue: previous, newValue: quote });
  return getQuote(context, id);
}

export async function softDeleteQuote(context: CrmAccessContext, id: string) {
  assertQuotePermission(context, "quotes.delete");
  const previous = await getQuote(context, id);
  const quote = await prisma.quote.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: context.userId, updatedById: context.userId }
  });
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "Quote", entityId: quote.id, action: "soft_delete", previousValue: previous, newValue: quote });
  return quote;
}

export async function createQuoteVersion(context: CrmAccessContext, quoteId: string) {
  assertQuotePermission(context, "quotes.update");
  const quote = await getQuote(context, quoteId);
  assertCanEditQuote(context, quote);
  const latestVersion = quote.versions[0];
  const nextVersionNumber = nextQuoteVersionNumber(quote.currentVersionNumber);
  const version = await prisma.$transaction(async (transaction) => {
    const createdVersion = await transaction.quoteVersion.create({
      data: {
        quoteId,
        versionNumber: nextVersionNumber,
        status: "draft",
        isLocked: false,
        notes: latestVersion?.notes,
        terms: latestVersion?.terms ?? DEFAULT_QUOTE_TERMS,
        createdById: context.userId,
        updatedById: context.userId
      }
    });

    if (latestVersion) {
      for (const line of latestVersion.lines) {
        await transaction.quoteLine.create({
          data: {
            quoteVersionId: createdVersion.id,
            productId: line.productId,
            lineType: line.lineType,
            description: line.description,
            quantity: line.quantity,
            unitCost: line.unitCost,
            unitSell: line.unitSell,
            costTotal: line.costTotal,
            sellTotal: line.sellTotal,
            marginTotal: line.marginTotal,
            marginPercent: line.marginPercent,
            sortOrder: line.sortOrder,
            createdById: context.userId,
            updatedById: context.userId
          }
        });
      }
    }

    await transaction.quote.update({
      where: { id: quoteId },
      data: { currentVersionNumber: nextVersionNumber, updatedById: context.userId }
    });

    return createdVersion;
  });

  await recalculateQuoteVersion(version.id);
  if (quote.projectChangeRequestId) {
    await syncProjectChangeRequestFromQuote(quoteId);
  }
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "QuoteVersion", entityId: version.id, action: "create", newValue: version });
  return version;
}

export async function getQuoteVersion(context: CrmAccessContext, versionId: string) {
  assertAnyQuotePermission(context, ["quotes.read_all", "quotes.read_own"]);
  const version = await prisma.quoteVersion.findFirst({
    where: { id: versionId, quote: quoteVisibilityWhere(context) },
    include: { quote: { include: { account: true, opportunity: true, contact: true, owner: true } }, lines: { where: { deletedAt: null }, include: { product: true }, orderBy: { sortOrder: "asc" } } }
  });
  if (!version) throw new Error("Quote version not found");
  return version;
}

export async function updateQuoteVersionTerms(context: CrmAccessContext, versionId: string, input: QuoteVersionTermsUpdateInput) {
  assertQuotePermission(context, "quotes.update");
  const previous = await getQuoteVersion(context, versionId);
  assertCanEditQuote(context, previous.quote);
  assertQuoteVersionEditable(previous);
  const version = await prisma.quoteVersion.update({
    where: { id: versionId },
    data: { terms: input.terms, updatedById: context.userId }
  });
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "QuoteVersion", entityId: versionId, action: "update_terms", previousValue: { terms: previous.terms }, newValue: { terms: version.terms } });
  return version;
}

export async function createQuoteLine(context: CrmAccessContext, versionId: string, input: QuoteLineCreateInput) {
  assertQuotePermission(context, "quotes.update");
  const version = await getQuoteVersion(context, versionId);
  assertCanEditQuote(context, version.quote);
  assertQuoteVersionEditable(version);
  const previousQuoteTotal = Number(version.quote.sellTotal);
  const lineInput = await resolveLineInput(input);
  const totals = calculateQuoteLine(lineInput);
  const line = await prisma.quoteLine.create({
    data: {
      quoteVersionId: version.id,
      productId: lineInput.productId,
      lineType: input.lineType,
      description: lineInput.description,
      quantity: lineInput.quantity,
      unitCost: lineInput.unitCost,
      unitSell: lineInput.unitSell,
      ...totals,
      sortOrder: input.sortOrder,
      createdById: context.userId,
      updatedById: context.userId
    }
  });
  await recalculateQuoteVersion(version.id);
  await syncQuoteProjectChangeState(context, version.quoteId, previousQuoteTotal);
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "QuoteLine", entityId: line.id, action: "create", newValue: line });
  return line;
}

export async function updateQuoteLine(context: CrmAccessContext, id: string, input: QuoteLineUpdateInput) {
  assertQuotePermission(context, "quotes.update");
  const previous = await getQuoteLine(context, id);
  const version = await getQuoteVersion(context, previous.quoteVersionId);
  assertCanEditQuote(context, version.quote);
  assertQuoteVersionEditable(version);
  const previousQuoteTotal = Number(version.quote.sellTotal);
  const mergedInput = {
    lineType: input.lineType ?? previous.lineType,
    productId: input.productId === undefined ? previous.productId : input.productId,
    description: input.description ?? previous.description,
    quantity: input.quantity ?? Number(previous.quantity),
    unitCost: input.unitCost === undefined ? Number(previous.unitCost) : input.unitCost,
    unitSell: input.unitSell === undefined ? Number(previous.unitSell) : input.unitSell,
    sortOrder: input.sortOrder ?? previous.sortOrder
  };
  const lineInput = await resolveLineInput(mergedInput);
  const totals = calculateQuoteLine(lineInput);
  const line = await prisma.quoteLine.update({
    where: { id },
    data: {
      productId: lineInput.productId,
      lineType: mergedInput.lineType,
      description: lineInput.description,
      quantity: lineInput.quantity,
      unitCost: lineInput.unitCost,
      unitSell: lineInput.unitSell,
      ...totals,
      sortOrder: mergedInput.sortOrder,
      updatedById: context.userId
    }
  });
  await recalculateQuoteVersion(previous.quoteVersionId);
  await syncQuoteProjectChangeState(context, version.quoteId, previousQuoteTotal);
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "QuoteLine", entityId: line.id, action: quoteLineAuditActions.edited, previousValue: previous, newValue: line });
  return line;
}

export async function deleteQuoteLine(context: CrmAccessContext, id: string) {
  assertQuotePermission(context, "quotes.update");
  const previous = await getQuoteLine(context, id);
  const version = await getQuoteVersion(context, previous.quoteVersionId);
  assertCanEditQuote(context, version.quote);
  assertQuoteVersionEditable(version);
  const previousQuoteTotal = Number(version.quote.sellTotal);
  const line = await prisma.quoteLine.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: context.userId, updatedById: context.userId }
  });
  await recalculateQuoteVersion(previous.quoteVersionId);
  await syncQuoteProjectChangeState(context, version.quoteId, previousQuoteTotal);
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "QuoteLine", entityId: line.id, action: quoteLineAuditActions.deleted, previousValue: previous, newValue: line });
  return line;
}

async function getQuoteLine(_context: CrmAccessContext, id: string) {
  const line = await prisma.quoteLine.findFirst({ where: { id, deletedAt: null } });
  if (!line) throw new Error("Quote line not found");
  return line;
}

function assertQuoteVersionEditable(version: { isLocked: boolean; status: QuoteStatus }) {
  if (version.isLocked || version.status === QuoteStatus.approved) {
    throw new Error("Approved quote version is locked. Create a new version to make changes.");
  }
}

async function resolveLineInput(input: QuoteLineCreateInput | QuoteLineUpdateInput) {
  if (input.lineType && ["product", "labour", "service"].includes(input.lineType) && input.productId) {
    const product = await prisma.product.findFirst({ where: { id: input.productId, deletedAt: null, isActive: true } });
    if (!product) throw new Error("Product not found");
    if (product.itemType !== input.lineType) throw new Error("Catalogue item type does not match quote line type");
    return {
      productId: product.id,
      description: input.description || product.description,
      quantity: input.quantity ?? 1,
      unitCost: input.unitCost ?? Number(product.costPrice),
      unitSell: input.unitSell ?? Number(product.defaultSellPrice)
    };
  }

  return {
    productId: input.productId ?? null,
    description: input.description || (input.lineType === "note" ? "Note" : "Manual line"),
    quantity: input.lineType === "note" ? 1 : input.quantity ?? 1,
    unitCost: input.lineType === "note" ? 0 : input.unitCost ?? 0,
    unitSell: input.lineType === "note" ? 0 : input.unitSell ?? 0
  };
}

async function recalculateQuoteVersion(versionId: string) {
  const version = await prisma.quoteVersion.findUniqueOrThrow({
    where: { id: versionId },
    include: { lines: { where: { deletedAt: null } } }
  });
  const totals = calculateQuoteTotals(version.lines.map((line) => ({
    costTotal: Number(line.costTotal),
    sellTotal: Number(line.sellTotal),
    marginTotal: Number(line.marginTotal),
    marginPercent: Number(line.marginPercent)
  })));

  await prisma.quoteVersion.update({ where: { id: versionId }, data: totals });
  await prisma.quote.update({ where: { id: version.quoteId }, data: totals });
}

async function syncQuoteProjectChangeState(context: CrmAccessContext, quoteId: string, previousQuoteTotal: number) {
  const syncedChangeRequest = await syncProjectChangeRequestFromQuote(quoteId);
  if (syncedChangeRequest) return syncedChangeRequest;
  return createProjectChangeRequestFromQuoteChange(context, quoteId, previousQuoteTotal);
}

async function assertCanUseQuoteOpportunity(context: CrmAccessContext, opportunityId: string) {
  const opportunity = await prisma.opportunity.findFirst({
    where: { AND: [opportunityVisibilityWhere(context), { id: opportunityId }] },
    include: { account: true }
  });
  if (!opportunity) throw new Error("Opportunity not found");
  return opportunity;
}

async function nextQuoteNumber() {
  const year = new Date().getFullYear();
  const prefix = `Q-${year}-`;
  const existingCount = await prisma.quote.count({ where: { quoteNumber: { startsWith: prefix } } });
  return `${prefix}${String(existingCount + 1).padStart(4, "0")}`;
}

export function nextQuoteVersionNumber(currentVersionNumber: number) {
  return currentVersionNumber + 1;
}

export function deriveQuoteCrmFields(opportunity: { accountId: string; account: { name: string } }) {
  return {
    accountId: opportunity.accountId,
    customerName: opportunity.account.name,
    hotelName: opportunity.account.name
  };
}
