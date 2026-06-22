export const DEFAULT_PRICE_IMPORT_MARKUP_PERCENT = 30;

export const requiredPriceImportColumns = [
  "supplier",
  "sku",
  "description",
  "unitCost"
] as const;

export const allowedPriceImportItemTypes = ["product", "labour", "service"] as const;

export const samplePriceImportCsv = [
  "supplier,sku,manufacturer,category,description,item_type,unit_cost,unit_sell,lead_time_days",
  "Connected Hospitality,LAB-PM-DAY,Connected Hospitality,Professional Services,Project Management Day,labour,450,750,0",
  "Connected Hospitality,LAB-ENG-DAY,Connected Hospitality,Engineering,Engineering Day Rate,labour,350,650,0",
  "Connected Hospitality,SVC-WIFI-DESIGN,Connected Hospitality,Design Services,WiFi Design Service,service,500,950,0",
  "Ruckus,AP-001,Ruckus,Wireless AP,Ruckus Test Access Point,product,100,150,7"
].join("\n");

const columnAliases = {
  supplier: ["supplier"],
  sku: ["sku", "part_no", "part no", "item", "code", "part_code"],
  manufacturer: ["manufacturer"],
  category: ["category"],
  description: ["description", "item_description", "item description", "part no description"],
  itemType: ["item_type", "type", "line_type"],
  unitCost: ["unit_cost", "unit cost", "cost", "cost_price", "unit price", "unit_price"],
  unitSell: ["unit_sell", "unit sell", "sell", "sell_price", "sales_price", "total sell"],
  leadTimeDays: ["lead_time_days", "lead time days", "lead_time", "lead time"]
} as const;

type CanonicalColumn = keyof typeof columnAliases;

export type PriceImportRow = {
  rowNumber: number;
  supplier: string;
  sku: string;
  manufacturer: string;
  category: string;
  description: string;
  itemType: typeof allowedPriceImportItemTypes[number];
  unitCost: number;
  unitSell: number;
  leadTimeDays: number;
  usedDefaultMarkup: boolean;
};

export type PriceImportParseResult = {
  rows: PriceImportRow[];
  errors: string[];
  skippedRows: number;
  totalRowsRead: number;
  detectedColumns: string[];
  sampleRows: PriceImportRow[];
  defaultMarkupAppliedRows: number;
};

export function parsePriceImportCsv(csvText: string): PriceImportParseResult {
  const physicalLines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/);
  const firstNonBlankIndex = physicalLines.findIndex((line) => line.trim().length > 0);
  if (firstNonBlankIndex === -1) {
    return emptyResult(["CSV file is empty."]);
  }

  const headers = parseCsvLine(physicalLines[firstNonBlankIndex]).map(normalizeHeader);
  const columnMap = buildColumnMap(headers);
  const missingColumns = requiredPriceImportColumns.filter((column) => !columnMap[column]);
  if (missingColumns.length > 0) {
    return emptyResult([`Missing required columns: ${missingColumns.map(formatRequiredColumn).join(", ")}.`], headers);
  }

  const rows: PriceImportRow[] = [];
  const errors: string[] = [];
  let skippedRows = 0;
  let defaultMarkupAppliedRows = 0;
  let totalRowsRead = 0;

  physicalLines.slice(firstNonBlankIndex + 1).forEach((line, index) => {
    const rowNumber = firstNonBlankIndex + index + 2;
    if (line.trim().length === 0) return;
    totalRowsRead += 1;

    const values = repairOverflowingCurrencyValues(parseCsvLine(line), headers.length);
    const rawRow = Object.fromEntries(headers.map((header, valueIndex) => [header, trimValue(values[valueIndex] ?? "")]));
    if (Object.values(rawRow).every((value) => value.length === 0)) return;

    const supplier = getValue(rawRow, columnMap, "supplier");
    const sku = getValue(rawRow, columnMap, "sku");
    const description = getValue(rawRow, columnMap, "description");
    const unitCostText = getValue(rawRow, columnMap, "unitCost");
    const unitSellText = getValue(rawRow, columnMap, "unitSell");

    if (!sku && !hasParsableNumber(unitCostText) && !hasParsableNumber(unitSellText)) {
      skippedRows += 1;
      return;
    }

    if (!sku) {
      skippedRows += 1;
      return;
    }

    if (!description) {
      errors.push(`Row ${rowNumber}: description is required.`);
      return;
    }

    const unitCost = parseMoney(unitCostText);
    if (unitCost === null) {
      errors.push(`Row ${rowNumber}: unit_cost is required and must be a number.`);
      return;
    }

    const unitSell = parseMoney(unitSellText) ?? roundMoney(unitCost * (1 + DEFAULT_PRICE_IMPORT_MARKUP_PERCENT / 100));
    const usedDefaultMarkup = parseMoney(unitSellText) === null;
    if (usedDefaultMarkup) defaultMarkupAppliedRows += 1;

    const rawItemType = getValue(rawRow, columnMap, "itemType") || "product";
    if (!isAllowedItemType(rawItemType)) {
      errors.push(`Row ${rowNumber}: item_type must be product, labour or service.`);
      return;
    }

    rows.push({
      rowNumber,
      supplier,
      sku,
      manufacturer: getValue(rawRow, columnMap, "manufacturer") || supplier,
      category: getValue(rawRow, columnMap, "category") || "Uncategorised",
      description,
      itemType: rawItemType,
      unitCost,
      unitSell,
      leadTimeDays: parseInteger(getValue(rawRow, columnMap, "leadTimeDays")) ?? 0,
      usedDefaultMarkup
    });
  });

  return {
    rows,
    errors,
    skippedRows,
    totalRowsRead,
    detectedColumns: headers,
    sampleRows: rows.slice(0, 5),
    defaultMarkupAppliedRows
  };
}

function emptyResult(errors: string[], detectedColumns: string[] = []): PriceImportParseResult {
  return { rows: [], errors, skippedRows: 0, totalRowsRead: 0, detectedColumns, sampleRows: [], defaultMarkupAppliedRows: 0 };
}

function formatRequiredColumn(column: typeof requiredPriceImportColumns[number]) {
  return column === "unitCost" ? "unit_cost" : column;
}

function buildColumnMap(headers: string[]): Partial<Record<CanonicalColumn, string>> {
  const map: Partial<Record<CanonicalColumn, string>> = {};
  for (const [canonical, aliases] of Object.entries(columnAliases) as Array<[CanonicalColumn, readonly string[]]>) {
    map[canonical] = headers.find((header) => aliases.includes(header));
  }
  return map;
}

function getValue(row: Record<string, string>, columnMap: Partial<Record<CanonicalColumn, string>>, column: CanonicalColumn) {
  const mappedColumn = columnMap[column];
  return mappedColumn ? trimValue(row[mappedColumn] ?? "") : "";
}

export function parseMoney(value: string) {
  const cleaned = trimValue(value)
    .replace(/£/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string) {
  const parsed = parseMoney(value);
  if (parsed === null) return null;
  return Math.max(0, Math.trunc(parsed));
}

function hasParsableNumber(value: string) {
  return parseMoney(value) !== null;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function isAllowedItemType(value: string): value is typeof allowedPriceImportItemTypes[number] {
  return allowedPriceImportItemTypes.includes(value as typeof allowedPriceImportItemTypes[number]);
}

function normalizeHeader(value: string) {
  return trimValue(value).toLowerCase().replace(/\s+/g, " ");
}

function trimValue(value: string) {
  return String(value ?? "").trim();
}

function repairOverflowingCurrencyValues(values: string[], headerCount: number) {
  if (values.length <= headerCount) return values;
  const repaired: string[] = [];
  let index = 0;
  while (index < values.length) {
    const remainingValues = values.length - index;
    const remainingHeaders = headerCount - repaired.length;
    const current = values[index];
    const next = values[index + 1];
    if (remainingValues > remainingHeaders && next && looksLikeSplitCurrency(current, next)) {
      repaired.push(`${current},${next}`);
      index += 2;
      continue;
    }
    repaired.push(current);
    index += 1;
  }
  return repaired;
}

function looksLikeSplitCurrency(current: string, next: string) {
  return /^£?\s*\d{1,3}$/.test(trimValue(current)) && /^\d{3}(?:\.\d+)?$/.test(trimValue(next));
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === "\"" && inQuotes && nextCharacter === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (character === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}
