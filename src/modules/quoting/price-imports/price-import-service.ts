import { prisma } from "@/lib/prisma";
import { productSupplierSkuKey } from "@/modules/quoting/products/product-service";
import { calculateProductMarginPercent } from "@/modules/quoting/quotes/quote-calculations";
import { assertQuotePermission } from "@/modules/quoting/quotes/quote-permissions";
import { DEFAULT_PRICE_IMPORT_MARKUP_PERCENT, parsePriceImportCsv } from "@/modules/quoting/price-imports/price-import-parser";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export async function listPriceImports(context: CrmAccessContext) {
  assertQuotePermission(context, "quotes.update");
  return prisma.priceImport.findMany({
    include: { uploadedBy: true },
    orderBy: { createdAt: "desc" },
    take: 50
  });
}

export async function importPriceCsv(context: CrmAccessContext, file: File) {
  assertQuotePermission(context, "quotes.update");
  const csvText = await file.text();
  const parsed = parsePriceImportCsv(csvText);
  let successfulRows = 0;
  const rowErrors = [...parsed.errors];
  const supplier = parsed.rows[0]?.supplier;

  for (const row of parsed.rows) {
    try {
      await prisma.product.upsert({
        where: productSupplierSkuKey(row.supplier, row.sku),
        create: {
          supplier: row.supplier,
          sku: row.sku,
          manufacturer: row.manufacturer,
          category: row.category,
          description: row.description,
          itemType: row.itemType,
          costPrice: row.unitCost,
          defaultSellPrice: row.unitSell,
          marginPercent: calculateProductMarginPercent(row.unitCost, row.unitSell),
          leadTimeDays: row.leadTimeDays,
          createdById: context.userId,
          updatedById: context.userId
        },
        update: {
          manufacturer: row.manufacturer,
          category: row.category,
          description: row.description,
          itemType: row.itemType,
          costPrice: row.unitCost,
          defaultSellPrice: row.unitSell,
          marginPercent: calculateProductMarginPercent(row.unitCost, row.unitSell),
          leadTimeDays: row.leadTimeDays,
          isActive: true,
          deletedAt: null,
          deletedById: null,
          updatedById: context.userId
        }
      });
      successfulRows += 1;
    } catch {
      rowErrors.push(`Row ${row.rowNumber}: product could not be imported.`);
    }
  }

  const failedRows = rowErrors.length;
  const status = successfulRows === 0 && failedRows > 0 ? "failed" : failedRows > 0 ? "completed_with_errors" : "completed";
  const importSummary = buildPriceImportSummary(parsed, successfulRows, rowErrors);

  return prisma.priceImport.create({
    data: {
      filename: file.name,
      supplier,
      uploadedById: context.userId,
      rowCount: parsed.totalRowsRead,
      successfulRows,
      failedRows,
      status,
      errorSummary: rowErrors.length > 0 || parsed.skippedRows > 0 || parsed.defaultMarkupAppliedRows > 0 ? importSummary : undefined
    },
    include: { uploadedBy: true }
  });
}

export function buildPriceImportSummary(parsed: ReturnType<typeof parsePriceImportCsv>, importedRows: number, rowErrors: string[]) {
  return {
    totalRowsRead: parsed.totalRowsRead,
    importedRows,
    skippedRows: parsed.skippedRows,
    failedRows: rowErrors.length,
    detectedColumns: parsed.detectedColumns,
    sampleRows: parsed.sampleRows,
    firstErrors: rowErrors.slice(0, 20),
    errorsTruncated: rowErrors.length > 20,
    allErrors: rowErrors,
    defaultMarkupAppliedRows: parsed.defaultMarkupAppliedRows,
    notes: parsed.defaultMarkupAppliedRows > 0 ? [`Rows with no sell price were imported using ${DEFAULT_PRICE_IMPORT_MARKUP_PERCENT}% default markup.`] : []
  };
}
